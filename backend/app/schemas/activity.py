from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class ActivityType(str, Enum):
    NOTE = "note"
    CALL = "call"
    EMAIL = "email"
    WHATSAPP = "WhatsApp message"
    MEETING = "meeting"
    STATUS_CHANGE = "status change"
    ASSIGNMENT_CHANGE = "assignment change"
    FOLLOWUP_CREATED = "follow-up created"
    FOLLOWUP_COMPLETED = "follow-up completed"
    AI_SUGGESTION = "AI suggestion"
    HUMAN_ESCALATION = "Human escalation"


class ActivityBase(BaseModel):
    lead_id: str
    activity_type: ActivityType
    description: str


class ActivityCreate(ActivityBase):
    pass


class ActivityOut(ActivityBase):
    id: str = Field(alias="_id")
    created_by: str
    created_at: datetime

    class Config:
        populate_by_name = True
