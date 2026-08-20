from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.lead import LeadPriority


class EscalationStatus(str, Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class EscalationBase(BaseModel):
    lead_id: str
    message_id: str
    reason: str
    priority: LeadPriority


class EscalationCreate(EscalationBase):
    assigned_to: Optional[str] = None


class EscalationUpdate(BaseModel):
    status: EscalationStatus
    assigned_to: Optional[str] = None


class EscalationOut(EscalationBase):
    id: str = Field(alias="_id")
    assigned_to: Optional[str] = None
    status: EscalationStatus
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
