from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# strict required statuses mapping to core modules
class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    MEETING_SCHEDULED = "meeting_scheduled"
    PROPOSAL_SENT = "proposal_sent"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"


class LeadPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class LeadBase(BaseModel):
    name: str
    phone: str
    email: EmailStr
    company: Optional[str] = None
    source: str
    status: LeadStatus = LeadStatus.NEW
    priority: LeadPriority = LeadPriority.MEDIUM
    requirements: Optional[str] = None
    estimated_value: Optional[float] = None
    next_follow_up_at: Optional[datetime] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    status: Optional[LeadStatus] = None
    priority: Optional[LeadPriority] = None
    assigned_to: Optional[str] = None


class LeadOut(LeadBase):
    id: str = Field(alias="_id")
    assigned_to: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
