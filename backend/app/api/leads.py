from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.schemas.lead import LeadCreate, LeadOut, LeadUpdate, LeadStatus, LeadPriority
from app.core.permissions import get_current_user, get_database, RoleChecker
from app.schemas.user import UserRole
from app.schemas.activity import ActivityType

router = APIRouter()


@router.post("", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead: LeadCreate,
    current_user: dict = Depends(RoleChecker([UserRole.OWNER])),
    db=Depends(get_database),
):
    existing_lead = await db.leads.find_one({"phone": lead.phone})
    if existing_lead:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A lead with this phone number already exists.",
        )

    lead_dict = lead.model_dump()
    lead_dict["created_by"] = str(current_user["_id"])
    lead_dict["assigned_to"] = None

    now = datetime.now(timezone.utc)
    lead_dict["created_at"] = now
    lead_dict["updated_at"] = now

    result = await db.leads.insert_one(lead_dict)
    created_lead = await db.leads.find_one({"_id": result.inserted_id})
    created_lead["_id"] = str(created_lead["_id"])
    return created_lead


@router.get("", response_model=dict)
async def get_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status: Optional[LeadStatus] = None,
    assigned_to: Optional[str] = None,
    priority: Optional[LeadPriority] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    query = {}

    if current_user.get("role") == UserRole.SALES_EXECUTIVE.value:
        query["assigned_to"] = str(current_user["_id"])
    elif assigned_to:
        query["assigned_to"] = assigned_to

    if status:
        query["status"] = status.value
    if priority:
        query["priority"] = priority.value
    if source:
        query["source"] = source

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * page_size
    cursor = db.leads.find(query).sort("updated_at", -1).skip(skip).limit(page_size)
    leads = await cursor.to_list(length=page_size)

    for lead in leads:
        lead["_id"] = str(lead["_id"])

    total_count = await db.leads.count_documents(query)

    return {
        "data": leads,
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total_count,
            "total_pages": (total_count + page_size - 1) // page_size,
        },
    }


@router.get("/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead ID format")

    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if current_user.get("role") == UserRole.SALES_EXECUTIVE.value and lead.get(
        "assigned_to"
    ) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to view this lead")

    lead["_id"] = str(lead["_id"])
    return lead


@router.patch("/{lead_id}", response_model=LeadOut)
async def update_lead(
    lead_id: str,
    lead_update: LeadUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead ID format")

    existing_lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not existing_lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if current_user.get("role") == UserRole.SALES_EXECUTIVE.value and existing_lead.get(
        "assigned_to"
    ) != str(current_user["_id"]):
        raise HTTPException(
            status_code=403, detail="Not authorized to update this lead"
        )

    update_data = lead_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    if "assigned_to" in update_data:
        if current_user.get("role") == UserRole.SALES_EXECUTIVE.value:
            raise HTTPException(
                status_code=403, detail="Sales executives cannot reassign leads"
            )
        if update_data["assigned_to"] == "":
            update_data["assigned_to"] = None

    now = datetime.now(timezone.utc)
    update_data["updated_at"] = now

    await db.leads.update_one({"_id": ObjectId(lead_id)}, {"$set": update_data})

    activities_to_insert = []
    if "status" in update_data and update_data["status"] != existing_lead.get("status"):
        activities_to_insert.append(
            {
                "lead_id": lead_id,
                "activity_type": ActivityType.STATUS_CHANGE.value,
                "description": f"Status changed from {existing_lead.get('status')} to {update_data['status']}",
                "created_by": str(current_user["_id"]),
                "created_at": now,
            }
        )

    if "assigned_to" in update_data and update_data["assigned_to"] != existing_lead.get(
        "assigned_to"
    ):
        activities_to_insert.append(
            {
                "lead_id": lead_id,
                "activity_type": ActivityType.ASSIGNMENT_CHANGE.value,
                "description": f"Lead assigned to {update_data['assigned_to'] or 'Unassigned'}",
                "created_by": str(current_user["_id"]),
                "created_at": now,
            }
        )

    if activities_to_insert:
        await db.activities.insert_many(activities_to_insert)

    updated_lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    updated_lead["_id"] = str(updated_lead["_id"])
    return updated_lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: str,
    current_user: dict = Depends(RoleChecker([UserRole.OWNER])),
    db=Depends(get_database),
):
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead ID format")

    result = await db.leads.delete_one({"_id": ObjectId(lead_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
