from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.dependencies.auth import get_current_firebase_uid
from app.middleware.rate_limit import AUTH_LIMIT, limiter
from app.models.user import User

router = APIRouter()


class UserSchema(BaseModel):
    id: int
    firebase_uid: str
    email: str
    display_name: str | None = None

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    email: str
    display_name: str | None = None


@router.get("/me", response_model=UserSchema)
@limiter.limit(AUTH_LIMIT)
async def get_me(
    request: Request,
    firebase_uid: str = Depends(get_current_firebase_uid),
    db: AsyncSession = Depends(get_db),
):
    """Get the profile of the current authenticated user."""
    stmt = select(User).where(User.firebase_uid == firebase_uid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        # If user does not exist yet (but firebase authenticated), auto-register
        user = User(
            firebase_uid=firebase_uid,
            email=f"{firebase_uid}@example.com",  # Default placeholder email
            display_name="Parent User",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


@router.post("/register", response_model=UserSchema)
@limiter.limit(AUTH_LIMIT)
async def register(
    request: Request,
    req: RegisterRequest,
    firebase_uid: str = Depends(get_current_firebase_uid),
    db: AsyncSession = Depends(get_db),
):
    """Register a new user linked to their Firebase UID."""
    stmt = select(User).where(User.firebase_uid == firebase_uid)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    if existing_user:
        existing_user.email = req.email
        existing_user.display_name = req.display_name
        await db.commit()
        await db.refresh(existing_user)
        return existing_user

    new_user = User(
        firebase_uid=firebase_uid,
        email=req.email,
        display_name=req.display_name,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user
