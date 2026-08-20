from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum


class UserRole(str, Enum):
    OWNER = "owner"
    SALES_MANAGER = "sales_manager"
    SALES_EXECUTIVE = "sales_executive"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRole


class UserOut(BaseModel):
    id: str = Field(alias="_id")
    email: EmailStr
    role: UserRole
    is_active: bool

    class Config:
        populate_by_name = True
