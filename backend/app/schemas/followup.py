from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class FollowUpStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"


class FollowUpBase(BaseModel):
    lead_id: str
    due_at: datetime
    description: str
    assigned_to: str


class FollowUpCreate(FollowUpBase):
    pass


class FollowUpUpdate(BaseModel):
    status: FollowUpStatus


class FollowUpOut(FollowUpBase):
    id: str = Field(alias="_id")
    status: FollowUpStatus
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
