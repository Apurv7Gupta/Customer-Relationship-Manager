from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.lead import LeadPriority, LeadStatus


class MessageDirection(str, Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class ReplyDraftStatus(str, Enum):
    DRAFT = "draft"
    APPROVED = "approved"


class AIAnalysis(BaseModel):
    intent: str
    priority: LeadPriority
    sentiment: str
    summary: str
    suggested_status: LeadStatus
    suggested_next_action: str
    requires_human_escalation: bool
    escalation_reason: Optional[str] = None
    reply_draft: str
    confidence: float = Field(ge=0, le=1)


class MockWhatsAppWebhookPayload(BaseModel):
    provider_message_id: str
    sender_phone: str
    message: str
    received_at: datetime


class MessageBase(BaseModel):
    lead_id: str
    provider_message_id: str
    direction: MessageDirection
    message: str


class MessageOut(MessageBase):
    id: str = Field(alias="_id")
    received_at: datetime
    created_at: datetime
    ai_analysis: Optional[AIAnalysis] = None
    reply_draft: Optional[str] = None
    reply_status: ReplyDraftStatus = ReplyDraftStatus.DRAFT
    reply_approved_at: Optional[datetime] = None
    reply_approved_by: Optional[str] = None

    class Config:
        populate_by_name = True


class ReplyDraftApprovalUpdate(BaseModel):
    approved: bool
