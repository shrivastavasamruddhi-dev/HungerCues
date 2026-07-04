from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.dependencies.auth import get_current_firebase_uid
from app.models.baby import Baby

router = APIRouter()


class BabyCreate(BaseModel):
    name: str
    birth_date: date
    gender: str
    family_id: str | None = None


class BabySchema(BaseModel):
    id: int
    name: str
    birth_date: date
    gender: str
    family_id: str | None = None

    class Config:
        from_attributes = True


@router.post("/", response_model=BabySchema)
async def create_baby(
    baby_in: BabyCreate,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    family_id = baby_in.family_id or firebase_uid
    baby = Baby(
        name=baby_in.name,
        birth_date=baby_in.birth_date,
        gender=baby_in.gender,
        family_id=family_id,
    )
    db.add(baby)
    await db.commit()
    await db.refresh(baby)
    return baby


@router.get("/", response_model=list[BabySchema])
async def list_babies(
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    stmt = select(Baby).where(Baby.family_id == firebase_uid)
    result = await db.execute(stmt)
    babies = result.scalars().all()

    # If no babies exist, let's create a default one for quick presentation/demo
    if not babies:
        default_baby = Baby(
            name="Charlie",
            birth_date=date(2026, 1, 1),
            gender="Boy",
            family_id=firebase_uid,
        )
        db.add(default_baby)
        await db.commit()
        await db.refresh(default_baby)
        babies = [default_baby]

    return babies
