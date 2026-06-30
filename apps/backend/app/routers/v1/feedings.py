from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, field_validator

from app.database import get_db
from app.dependencies.auth import get_current_firebase_uid
from app.models.feeding import Feeding

router = APIRouter()


class FeedingCreate(BaseModel):
    baby_id: int
    type: str  # breast, bottle, pumping
    start_time: datetime
    duration_minutes: int
    quantity_ml: float | None = None
    breast_side: str | None = None
    notes: str | None = None


class FeedingSchema(BaseModel):
    id: int
    baby_id: int
    type: str
    start_time: datetime
    duration_minutes: int
    quantity_ml: float | None = None
    breast_side: str | None = None
    notes: str | None = None
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True

    @field_validator('start_time', 'deleted_at', mode='after')
    @classmethod
    def ensure_utc(cls, v: datetime | None) -> datetime | None:
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v


@router.post("/", response_model=FeedingSchema)
async def create_feeding(
    feeding_in: FeedingCreate,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    feeding = Feeding(
        baby_id=feeding_in.baby_id,
        type=feeding_in.type,
        start_time=feeding_in.start_time,
        duration_minutes=feeding_in.duration_minutes,
        quantity_ml=feeding_in.quantity_ml,
        breast_side=feeding_in.breast_side,
        notes=feeding_in.notes,
    )
    db.add(feeding)
    await db.commit()
    await db.refresh(feeding)
    return feeding


@router.get("/baby/{baby_id}", response_model=list[FeedingSchema])
async def list_feedings(
    baby_id: int,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    stmt = select(Feeding).where(Feeding.baby_id == baby_id, Feeding.deleted_at == None).order_by(Feeding.start_time.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.delete("/{feeding_id}")
async def delete_feeding(
    feeding_id: int,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    stmt = select(Feeding).where(Feeding.id == feeding_id)
    result = await db.execute(stmt)
    feeding = result.scalar_one_or_none()
    if not feeding:
        raise HTTPException(status_code=404, detail="Feeding record not found")
    feeding.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "success"}
