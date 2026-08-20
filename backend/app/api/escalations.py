from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.permissions import RoleChecker, get_database
from app.schemas.escalation import EscalationOut, EscalationStatus, EscalationUpdate
from app.schemas.user import UserRole

router = APIRouter()

manager_or_owner = RoleChecker([UserRole.OWNER, UserRole.SALES_MANAGER])


@router.get("", response_model=dict)
async def get_escalations(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status: Optional[EscalationStatus] = None,
    assigned_to: Optional[str] = None,
    db=Depends(get_database),
    _current_user: dict = Depends(manager_or_owner),
):
    query = {}
    if status:
        query["status"] = status.value
    if assigned_to:
        query["assigned_to"] = assigned_to

    skip = (page - 1) * page_size
    cursor = (
        db.escalations.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(page_size)
    )
    escalations = await cursor.to_list(length=page_size)
    for escalation in escalations:
        escalation["_id"] = str(escalation["_id"])

    total = await db.escalations.count_documents(query)
    return {
        "data": escalations,
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        },
    }


@router.get("/{escalation_id}", response_model=EscalationOut)
async def get_escalation(
    escalation_id: str,
    db=Depends(get_database),
    _current_user: dict = Depends(manager_or_owner),
):
    if not ObjectId.is_valid(escalation_id):
        raise HTTPException(status_code=400, detail="Invalid escalation ID")

    escalation = await db.escalations.find_one({"_id": ObjectId(escalation_id)})
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    escalation["_id"] = str(escalation["_id"])
    return escalation


@router.patch("/{escalation_id}", response_model=EscalationOut)
async def update_escalation(
    escalation_id: str,
    escalation_update: EscalationUpdate,
    db=Depends(get_database),
    _current_user: dict = Depends(manager_or_owner),
):
    if not ObjectId.is_valid(escalation_id):
        raise HTTPException(status_code=400, detail="Invalid escalation ID")

    existing = await db.escalations.find_one({"_id": ObjectId(escalation_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Escalation not found")

    update_data = escalation_update.model_dump(exclude_unset=True)
    update_data["status"] = escalation_update.status.value
    if escalation_update.status == EscalationStatus.RESOLVED:
        update_data["resolved_at"] = datetime.now(timezone.utc)
    elif existing.get("status") == EscalationStatus.RESOLVED.value:
        update_data["resolved_at"] = None

    await db.escalations.update_one(
        {"_id": ObjectId(escalation_id)}, {"$set": update_data}
    )
    updated = await db.escalations.find_one({"_id": ObjectId(escalation_id)})
    updated["_id"] = str(updated["_id"])
    return updated
