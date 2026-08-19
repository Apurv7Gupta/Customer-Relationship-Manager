from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional
from bson import ObjectId
from datetime import datetime, timezone
from app.schemas.followup import (
    FollowUpCreate,
    FollowUpOut,
    FollowUpUpdate,
    FollowUpStatus,
)
from app.schemas.activity import ActivityType
from app.core.permissions import get_current_user, get_database

router = APIRouter()


@router.post("", response_model=FollowUpOut, status_code=status.HTTP_201_CREATED)
async def create_followup(
    followup: FollowUpCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    if not ObjectId.is_valid(followup.lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead ID")

    lead = await db.leads.find_one({"_id": ObjectId(followup.lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if current_user["role"] == "sales_executive" and lead.get("assigned_to") != str(
        current_user["_id"]
    ):
        raise HTTPException(
            status_code=403, detail="Not authorized to create follow-up for this lead"
        )

    now = datetime.now(timezone.utc)
    # Ensure timezone aware datetime
    if followup.due_at.tzinfo is None:
        followup.due_at = followup.due_at.replace(tzinfo=timezone.utc)

    followup_dict = followup.model_dump()
    followup_dict["status"] = FollowUpStatus.PENDING.value
    followup_dict["created_by"] = str(current_user["_id"])
    followup_dict["created_at"] = now
    followup_dict["updated_at"] = now

    result = await db.follow_ups.insert_one(followup_dict)

    # Activity Logging for follow-up creation[cite: 7]
    await db.activities.insert_one(
        {
            "lead_id": followup.lead_id,
            "activity_type": ActivityType.FOLLOWUP_CREATED.value,
            "description": f"Follow-up task created: {followup.description}",
            "created_by": str(current_user["_id"]),
            "created_at": now,
        }
    )

    # Update Lead next_follow_up_at tracker[cite: 7]
    await db.leads.update_one(
        {"_id": ObjectId(followup.lead_id)},
        {"$set": {"next_follow_up_at": followup.due_at, "updated_at": now}},
    )

    created_followup = await db.follow_ups.find_one({"_id": result.inserted_id})
    created_followup["_id"] = str(created_followup["_id"])
    return created_followup


@router.patch("/{followup_id}", response_model=FollowUpOut)
async def update_followup(
    followup_id: str,
    followup_update: FollowUpUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    if not ObjectId.is_valid(followup_id):
        raise HTTPException(status_code=400, detail="Invalid follow-up ID")

    existing_followup = await db.follow_ups.find_one({"_id": ObjectId(followup_id)})
    if not existing_followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    # RBAC rules
    if current_user["role"] == "sales_executive" and existing_followup.get(
        "assigned_to"
    ) != str(current_user["_id"]):
        raise HTTPException(
            status_code=403, detail="Not authorized to update this follow-up"
        )

    now = datetime.now(timezone.utc)

    await db.follow_ups.update_one(
        {"_id": ObjectId(followup_id)},
        {"$set": {"status": followup_update.status.value, "updated_at": now}},
    )

    if followup_update.status == FollowUpStatus.COMPLETED:
        await db.activities.insert_one(
            {
                "lead_id": existing_followup["lead_id"],
                "activity_type": ActivityType.FOLLOWUP_COMPLETED.value,
                "description": f"Follow-up task completed: {existing_followup['description']}",
                "created_by": str(current_user["_id"]),
                "created_at": now,
            }
        )

    updated_followup = await db.follow_ups.find_one({"_id": ObjectId(followup_id)})
    updated_followup["_id"] = str(updated_followup["_id"])
    return updated_followup


@router.get("", response_model=dict)
async def get_followups(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    assigned_to: Optional[str] = None,
    status: Optional[FollowUpStatus] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    query = {}

    if current_user["role"] == "sales_executive":
        query["assigned_to"] = str(current_user["_id"])
    elif assigned_to:
        query["assigned_to"] = assigned_to

    if status:
        query["status"] = status.value

    skip = (page - 1) * page_size
    cursor = db.follow_ups.find(query).sort("due_at", 1).skip(skip).limit(page_size)
    followups = await cursor.to_list(length=page_size)

    now = datetime.now(timezone.utc)

    # Dynamic calculation of overdue state as requested[cite: 7]
    for fp in followups:
        fp["_id"] = str(fp["_id"])
        fp_due = (
            fp["due_at"].replace(tzinfo=timezone.utc)
            if fp["due_at"].tzinfo is None
            else fp["due_at"]
        )
        if fp["status"] == FollowUpStatus.PENDING.value and fp_due < now:
            fp["status"] = FollowUpStatus.OVERDUE.value

    total_count = await db.follow_ups.count_documents(query)

    return {
        "data": followups,
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total_count,
            "total_pages": (total_count + page_size - 1) // page_size,
        },
    }
