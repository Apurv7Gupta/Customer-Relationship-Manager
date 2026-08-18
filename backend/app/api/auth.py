from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.user import UserOut
from app.core.security import verify_password, create_access_token
from app.core.permissions import get_current_user, get_database

router = APIRouter()


@router.post("/login", response_model=dict)
async def login(
    credentials: OAuth2PasswordRequestForm = Depends(), db=Depends(get_database)
):
    # JSON payload login mapping to POST /api/auth/login
    user = await db.users.find_one({"email": credentials.username})

    if not user or not verify_password(credentials.password, user["hashed_password"]):
        # prevent email enumeration attacks
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled"
        )

    access_token = create_access_token(data={"sub": str(user["_id"])})

    # Excludes sensitive data like hashed_password from response
    user_data = {k: v for k, v in user.items() if k != "hashed_password"}
    user_data["_id"] = str(user_data["_id"])

    return {"access_token": access_token, "token_type": "bearer", "user": user_data}


@router.get("/me", response_model=UserOut)
async def current_user_endpoint(current_user: dict = Depends(get_current_user)):
    # Current-user endpoint mapping to GET /api/auth/me
    current_user["_id"] = str(current_user["_id"])
    return current_user
