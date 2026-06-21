from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, Field, field_validator

from app.database import get_db
from app.dependencies.auth import get_current_firebase_uid
from app.models.growth import GrowthRecord
from app.models.baby import Baby

router = APIRouter()


class GrowthRecordCreate(BaseModel):
    baby_id: int
    recorded_at: datetime
    weight_kg: float | None = Field(None, ge=0.1, le=150.0)
    height_cm: float | None = Field(None, ge=10.0, le=250.0)
    notes: str | None = None


class GrowthRecordSchema(BaseModel):
    id: int
    baby_id: int
    recorded_at: datetime
    weight_kg: float | None
    height_cm: float | None
    notes: str | None
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True

    @field_validator('recorded_at', 'deleted_at', mode='after')
    @classmethod
    def ensure_utc(cls, v: datetime | None) -> datetime | None:
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v


@router.post("/", response_model=GrowthRecordSchema)
async def create_growth_record(
    record_in: GrowthRecordCreate,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    # Check if baby exists
    baby_stmt = select(Baby).where(Baby.id == record_in.baby_id)
    baby_result = await db.execute(baby_stmt)
    baby = baby_result.scalar_one_or_none()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    # Validate that either height or weight is provided
    if record_in.weight_kg is None and record_in.height_cm is None:
        raise HTTPException(
            status_code=400,
            detail="At least one growth metric (weight or height) must be provided",
        )

    db_record = GrowthRecord(
        baby_id=record_in.baby_id,
        recorded_at=record_in.recorded_at,
        weight_kg=record_in.weight_kg,
        height_cm=record_in.height_cm,
        notes=record_in.notes,
    )
    db.add(db_record)
    await db.commit()
    await db.refresh(db_record)
    return db_record


@router.get("/baby/{baby_id}", response_model=list[GrowthRecordSchema])
async def list_growth_records(
    baby_id: int,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    # Check if baby exists
    baby_stmt = select(Baby).where(Baby.id == baby_id)
    baby_result = await db.execute(baby_stmt)
    baby = baby_result.scalar_one_or_none()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    stmt = (
        select(GrowthRecord)
        .where(GrowthRecord.baby_id == baby_id, GrowthRecord.deleted_at == None)
        .order_by(GrowthRecord.recorded_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.delete("/{growth_id}")
async def delete_growth_record(
    growth_id: int,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    stmt = select(GrowthRecord).where(GrowthRecord.id == growth_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Growth record not found")
    record.deleted_at = datetime.utcnow()
    await db.commit()
    return {"status": "success"}
