from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core.permissions import get_database
from app.integrations.ai_provider import MockAIProvider
from app.schemas.activity import ActivityType
from app.schemas.escalation import EscalationStatus
from app.schemas.lead import LeadPriority, LeadStatus
from app.schemas.message import AIAnalysis, MockWhatsAppWebhookPayload

router = APIRouter()

AI_CONFIDENCE_ESCALATION_THRESHOLD = 0.7
SYSTEM_USER_ID = "system"
ai_provider = MockAIProvider()


def _fallback_analysis(error: Exception) -> AIAnalysis:
    """Produce a safe, review-only result when AI analysis fails."""
    return AIAnalysis(
        intent="analysis_failed",
        priority=LeadPriority.HIGH,
        sentiment="unknown",
        summary="AI analysis could not be completed; human review is required.",
        suggested_status=LeadStatus.NEW,
        suggested_next_action="Have a manager review the customer message",
        requires_human_escalation=True,
        escalation_reason="AI analysis failed or returned an invalid response",
        reply_draft="Thank you for your message. Our team will get back to you shortly.",
        confidence=0,
    )


async def _find_or_create_lead(db, payload: MockWhatsAppWebhookPayload) -> dict:
    lead = await db.leads.find_one({"phone": payload.sender_phone})
    if lead:
        return lead

    received_at = payload.received_at
    if received_at.tzinfo is None:
        received_at = received_at.replace(tzinfo=timezone.utc)

    phone_suffix = "".join(
        character for character in payload.sender_phone if character.isdigit()
    )
    lead_document = {
        "name": f"WhatsApp Lead {payload.sender_phone}",
        "phone": payload.sender_phone,
        "email": f"whatsapp-{phone_suffix}@placeholder.com",
        "company": None,
        "source": "WhatsApp",
        "status": LeadStatus.NEW.value,
        "priority": LeadPriority.MEDIUM.value,
        "assigned_to": None,
        "requirements": payload.message,
        "estimated_value": None,
        "next_follow_up_at": None,
        "created_by": SYSTEM_USER_ID,
        "created_at": received_at,
        "updated_at": received_at,
    }

    try:
        result = await db.leads.insert_one(lead_document)
        lead_document["_id"] = result.inserted_id
        return lead_document
    except DuplicateKeyError:
        # unique phone index resolves concurrent requests from same sender
        lead = await db.leads.find_one({"phone": payload.sender_phone})
        if lead:
            return lead
        raise


@router.post("/whatsapp/mock", status_code=status.HTTP_201_CREATED)
async def receive_mock_whatsapp_message(
    payload: MockWhatsAppWebhookPayload,
    db=Depends(get_database),
):
    """Persist a mock inbound WhatsApp event and create review-only suggestions."""
    existing_message = await db.messages.find_one(
        {"provider_message_id": payload.provider_message_id}
    )
    if existing_message:
        return {
            "status": "already_processed",
            "message_id": str(existing_message["_id"]),
            "lead_id": existing_message["lead_id"],
        }

    lead = await _find_or_create_lead(db, payload)
    received_at = payload.received_at
    if received_at.tzinfo is None:
        received_at = received_at.replace(tzinfo=timezone.utc)

    analysis_error = None
    try:
        analysis = await ai_provider.analyze_message(payload.message)
    except Exception as error:
        analysis_error = str(error)
        analysis = _fallback_analysis(error)

    message_document = {
        "lead_id": str(lead["_id"]),
        "provider_message_id": payload.provider_message_id,
        "direction": "inbound",
        "message": payload.message,
        "received_at": received_at,
        "created_at": datetime.now(timezone.utc),
        "ai_analysis": analysis.model_dump(mode="json"),
        "reply_draft": analysis.reply_draft,
        "reply_status": "draft",
        "reply_approved_at": None,
        "reply_approved_by": None,
        "ai_error": analysis_error,
    }
    try:
        result = await db.messages.insert_one(message_document)
    except DuplicateKeyError:
        # unique index makes retries safe, even when requests race after the pre-check
        existing_message = await db.messages.find_one(
            {"provider_message_id": payload.provider_message_id}
        )
        return {
            "status": "already_processed",
            "message_id": str(existing_message["_id"]),
            "lead_id": existing_message["lead_id"],
        }

    message_id = str(result.inserted_id)
    activity_documents = [
        {
            "lead_id": str(lead["_id"]),
            "activity_type": ActivityType.WHATSAPP.value,
            "description": "Inbound WhatsApp message received.",
            "created_by": SYSTEM_USER_ID,
            "created_at": received_at,
        },
        {
            "lead_id": str(lead["_id"]),
            "activity_type": ActivityType.AI_SUGGESTION.value,
            "description": f"AI suggested action: {analysis.suggested_next_action}",
            "created_by": SYSTEM_USER_ID,
            "created_at": datetime.now(timezone.utc),
        },
    ]

    escalation_created = False
    should_escalate = (
        analysis.requires_human_escalation
        or analysis.confidence < AI_CONFIDENCE_ESCALATION_THRESHOLD
    )
    if should_escalate:
        escalation_document = {
            "lead_id": str(lead["_id"]),
            "message_id": message_id,
            "reason": analysis.escalation_reason
            or "AI confidence is below the escalation threshold",
            "priority": analysis.priority.value,
            "assigned_to": None,
            "status": EscalationStatus.OPEN.value,
            "created_at": datetime.now(timezone.utc),
            "resolved_at": None,
        }
        await db.escalations.insert_one(escalation_document)
        escalation_created = True
        activity_documents.append(
            {
                "lead_id": str(lead["_id"]),
                "activity_type": ActivityType.HUMAN_ESCALATION.value,
                "description": f"Human escalation created: {escalation_document['reason']}",
                "created_by": SYSTEM_USER_ID,
                "created_at": escalation_document["created_at"],
            }
        )

    await db.activities.insert_many(activity_documents)
    await db.leads.update_one(
        {"_id": lead["_id"]}, {"$set": {"updated_at": datetime.now(timezone.utc)}}
    )

    return {
        "status": "processed",
        "message_id": message_id,
        "lead_id": str(lead["_id"]),
        "ai_analysis": analysis.model_dump(mode="json"),
        "escalation_created": escalation_created,
    }
