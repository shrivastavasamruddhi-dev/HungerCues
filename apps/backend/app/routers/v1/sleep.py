from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, field_validator

from app.database import get_db
from app.dependencies.auth import get_current_firebase_uid
from app.models.sleep import SleepSession

router = APIRouter()


class SleepSessionCreate(BaseModel):
    baby_id: int
    sleep_start: datetime
    sleep_end: datetime | None = None
    duration_minutes: int | None = None
    tracking_method: str = "manual"  # manual, timer
    notes: str | None = None


class SleepSessionUpdate(BaseModel):
    sleep_end: datetime
    duration_minutes: int | None = None
    notes: str | None = None


class SleepSessionSchema(BaseModel):
    id: int
    baby_id: int
    sleep_start: datetime
    sleep_end: datetime | None = None
    duration_minutes: int | None = None
    tracking_method: str
    notes: str | None = None
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True

    @field_validator('sleep_start', 'sleep_end', 'deleted_at', mode='after')
    @classmethod
    def ensure_utc(cls, v: datetime | None) -> datetime | None:
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v


@router.post("/", response_model=SleepSessionSchema)
async def create_sleep_session(
    sleep_in: SleepSessionCreate,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    duration = sleep_in.duration_minutes
    if sleep_in.sleep_end and not duration:
        diff = sleep_in.sleep_end - sleep_in.sleep_start
        duration = int(diff.total_seconds() / 60)

    sleep_session = SleepSession(
        baby_id=sleep_in.baby_id,
        sleep_start=sleep_in.sleep_start,
        sleep_end=sleep_in.sleep_end,
        duration_minutes=duration,
        tracking_method=sleep_in.tracking_method,
        notes=sleep_in.notes,
    )
    db.add(sleep_session)
    await db.commit()
    await db.refresh(sleep_session)
    return sleep_session


@router.patch("/{session_id}", response_model=SleepSessionSchema)
async def update_sleep_session(
    session_id: int,
    sleep_up: SleepSessionUpdate,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    stmt = select(SleepSession).where(SleepSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sleep session not found")

    session.sleep_end = sleep_up.sleep_end
    
    duration = sleep_up.duration_minutes
    if not duration:
        diff = sleep_up.sleep_end - session.sleep_start
        duration = int(diff.total_seconds() / 60)
    session.duration_minutes = duration

    if sleep_up.notes is not None:
        session.notes = sleep_up.notes

    await db.commit()
    await db.refresh(session)
    return session


@router.get("/baby/{baby_id}", response_model=list[SleepSessionSchema])
async def list_sleep_sessions(
    baby_id: int,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    stmt = select(SleepSession).where(SleepSession.baby_id == baby_id, SleepSession.deleted_at == None).order_by(SleepSession.sleep_start.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.delete("/{session_id}")
async def delete_sleep_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    stmt = select(SleepSession).where(SleepSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sleep session not found")
    session.deleted_at = datetime.utcnow()
    await db.commit()
    return {"status": "success"}
