from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.permissions import get_current_user, get_database
from app.schemas.activity import ActivityType
from app.schemas.message import MessageOut, ReplyDraftApprovalUpdate, ReplyDraftStatus
from app.schemas.user import UserRole

router = APIRouter()


async def _get_accessible_lead(lead_id: str, current_user: dict, db) -> dict:
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead ID")

    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if (
        current_user["role"] == UserRole.SALES_EXECUTIVE.value
        and lead.get("assigned_to") != str(current_user["_id"])
    ):
        raise HTTPException(status_code=403, detail="Not authorized to access this lead")
    return lead


@router.get("", response_model=dict)
async def get_messages(
    lead_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    await _get_accessible_lead(lead_id, current_user, db)

    skip = (page - 1) * page_size
    cursor = (
        db.messages.find({"lead_id": lead_id})
        .sort("created_at", 1)
        .skip(skip)
        .limit(page_size)
    )
    messages = await cursor.to_list(length=page_size)
    for message in messages:
        message["_id"] = str(message["_id"])
        message.setdefault("reply_status", ReplyDraftStatus.DRAFT.value)
        message.setdefault("reply_approved_by", None)

    total = await db.messages.count_documents({"lead_id": lead_id})
    return {
        "data": messages,
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        },
    }


@router.patch("/{message_id}", response_model=MessageOut)
async def update_reply_approval(
    message_id: str,
    approval: ReplyDraftApprovalUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    if not ObjectId.is_valid(message_id):
        raise HTTPException(status_code=400, detail="Invalid message ID")

    message = await db.messages.find_one({"_id": ObjectId(message_id)})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    await _get_accessible_lead(message["lead_id"], current_user, db)

    if not message.get("reply_draft"):
        raise HTTPException(status_code=400, detail="This message has no reply draft")

    now = datetime.now(timezone.utc)
    update_data = {
        "reply_status": (
            ReplyDraftStatus.APPROVED.value
            if approval.approved
            else ReplyDraftStatus.DRAFT.value
        ),
        "reply_approved_at": now if approval.approved else None,
        "reply_approved_by": str(current_user["_id"]) if approval.approved else None,
    }
    await db.messages.update_one({"_id": ObjectId(message_id)}, {"$set": update_data})

    if approval.approved:
        await db.activities.insert_one(
            {
                "lead_id": message["lead_id"],
                "activity_type": ActivityType.AI_SUGGESTION.value,
                "description": "AI-suggested reply approved and marked ready to send.",
                "created_by": str(current_user["_id"]),
                "created_at": now,
            }
        )

    updated_message = await db.messages.find_one({"_id": ObjectId(message_id)})
    updated_message["_id"] = str(updated_message["_id"])
    return updated_message
