from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.dependencies.auth import get_current_firebase_uid
from app.models.diaper import DiaperChange
from app.services.cache import invalidate_baby_cache

router = APIRouter()


class DiaperChangeCreate(BaseModel):
    baby_id: int
    changed_at: datetime
    type: str
    notes: str | None = None


class DiaperChangeSchema(DiaperChangeCreate):
    id: int
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True

    @field_validator('changed_at', 'deleted_at', mode='after')
    @classmethod
    def ensure_utc(cls, v: datetime | None) -> datetime | None:
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v


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
    await invalidate_baby_cache(change.baby_id)
    return change


@router.get("/baby/{baby_id}", response_model=list[DiaperChangeSchema])
async def list_diaper_changes(
    baby_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_firebase_uid),
):
    stmt = (
        select(DiaperChange)
        .where(DiaperChange.baby_id == baby_id, DiaperChange.deleted_at == None)
        .order_by(DiaperChange.changed_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.delete("/{diaper_id}")
async def delete_diaper_change(
    diaper_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_firebase_uid),
):
    stmt = select(DiaperChange).where(DiaperChange.id == diaper_id)
    result = await db.execute(stmt)
    change = result.scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=404, detail="Diaper change record not found")
    change.deleted_at = datetime.utcnow()
    await db.commit()
    await invalidate_baby_cache(change.baby_id)
    return {"status": "success"}

