from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.dependencies.auth import get_current_firebase_uid
from app.models.diaper import DiaperChange

router = APIRouter()


class DiaperChangeCreate(BaseModel):
    baby_id: int
    changed_at: datetime
    type: str
    notes: str | None = None


class DiaperChangeSchema(DiaperChangeCreate):
    id: int

    class Config:
        from_attributes = True


@router.post("/", response_model=DiaperChangeSchema)
async def create_diaper_change(
    change_in: DiaperChangeCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_firebase_uid),
):
    change = DiaperChange(**change_in.model_dump())
    db.add(change)
    await db.commit()
    await db.refresh(change)
    return change


@router.get("/baby/{baby_id}", response_model=list[DiaperChangeSchema])
async def list_diaper_changes(
    baby_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_firebase_uid),
):
    stmt = (
        select(DiaperChange)
        .where(DiaperChange.baby_id == baby_id)
        .order_by(DiaperChange.changed_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()
