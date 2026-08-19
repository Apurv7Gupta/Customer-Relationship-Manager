from fastapi import APIRouter, Depends, Query, HTTPException, status
from bson import ObjectId
from datetime import datetime, timezone
from app.schemas.activity import ActivityCreate, ActivityOut
from app.core.permissions import get_current_user, get_database

router = APIRouter()


@router.post("", response_model=ActivityOut, status_code=status.HTTP_201_CREATED)
async def create_activity(
    activity: ActivityCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    if not ObjectId.is_valid(activity.lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead ID")

    lead = await db.leads.find_one({"_id": ObjectId(activity.lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Sales executives can only add notes/activities to their assigned leads
    if current_user["role"] == "sales_executive" and lead.get("assigned_to") != str(
        current_user["_id"]
    ):
        raise HTTPException(
            status_code=403, detail="Not authorized to modify this lead"
        )

    activity_dict = activity.model_dump()
    activity_dict["created_by"] = str(current_user["_id"])
    activity_dict["created_at"] = datetime.now(timezone.utc)

    result = await db.activities.insert_one(activity_dict)

    # Update lead's updated_at timestamp
    await db.leads.update_one(
        {"_id": ObjectId(activity.lead_id)},
        {"$set": {"updated_at": activity_dict["created_at"]}},
    )

    created_activity = await db.activities.find_one({"_id": result.inserted_id})
    created_activity["_id"] = str(created_activity["_id"])
    return created_activity


@router.get("", response_model=dict)
async def get_activities(
    lead_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead ID")

    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if current_user["role"] == "sales_executive" and lead.get("assigned_to") != str(
        current_user["_id"]
    ):
        raise HTTPException(
            status_code=403, detail="Not authorized to view activities for this lead"
        )

    skip = (page - 1) * page_size
    # Activities displayed in chronological order on lead-details page
    cursor = (
        db.activities.find({"lead_id": lead_id})
        .sort("created_at", -1)
        .skip(skip)
        .limit(page_size)
    )
    activities = await cursor.to_list(length=page_size)

    for activity in activities:
        activity["_id"] = str(activity["_id"])

    total_count = await db.activities.count_documents({"lead_id": lead_id})

    return {
        "data": activities,
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total_count,
            "total_pages": (total_count + page_size - 1) // page_size,
        },
    }
