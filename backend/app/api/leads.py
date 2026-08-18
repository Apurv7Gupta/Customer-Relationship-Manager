from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.schemas.lead import LeadCreate, LeadOut, LeadUpdate, LeadStatus, LeadPriority
from app.core.permissions import get_current_user, get_database

router = APIRouter()


@router.post("", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead: LeadCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    # Added direct check for duplicate phone number with specific error message
    existing_lead = await db.leads.find_one({"phone": lead.phone})
    if existing_lead:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A lead with this phone number already exists.",
        )

    lead_dict = lead.model_dump()
    lead_dict["created_by"] = str(current_user["_id"])
    lead_dict["assigned_to"] = None

    # CHANGED: Use timezone-aware UTC timestamps for database consistency
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
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    query = {}

    # CHANGED: Enforced backend RBAC data isolation. (A sales executive should only see statistics for leads they are permitted to access)
    if current_user["role"] == "sales_executive":
        query["assigned_to"] = str(current_user["_id"])
    elif assigned_to:
        query["assigned_to"] = assigned_to

    if status:
        query["status"] = status.value
    if priority:
        query["priority"] = priority.value
    if source:
        query["source"] = source

    skip = (page - 1) * page_size

    # pagination at db level
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
