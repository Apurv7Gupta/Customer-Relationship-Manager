from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.user import UserOut, UserRole
from app.core.permissions import get_current_user, get_database, RoleChecker

router = APIRouter()


# GET /api/users to fetch active users for lead assignment
@router.get("", response_model=List[UserOut])
async def get_users(
    db=Depends(get_database),
    current_user: dict = Depends(RoleChecker([UserRole.OWNER, UserRole.SALES_MANAGER])),
):
    cursor = db.users.find({"is_active": True})
    users = await cursor.to_list(length=100)
    for user in users:
        user["_id"] = str(user["_id"])
    return users
