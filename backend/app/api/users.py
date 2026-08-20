from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.user import UserCreate, UserOut, UserRole
from app.core.permissions import get_current_user, get_database, RoleChecker
from app.core.security import get_password_hash

router = APIRouter()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate,
    db=Depends(get_database),
    current_user: dict = Depends(RoleChecker([UserRole.OWNER])),
):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    user_document = user.model_dump(exclude={"password"})
    user_document["hashed_password"] = get_password_hash(user.password)
    user_document["is_active"] = True

    result = await db.users.insert_one(user_document)
    created_user = await db.users.find_one({"_id": result.inserted_id})
    created_user["_id"] = str(created_user["_id"])
    return created_user


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
