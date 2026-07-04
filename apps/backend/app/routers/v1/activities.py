from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from app.database import get_db
from app.dependencies.auth import get_current_firebase_uid
from app.models.feeding import Feeding
from app.models.sleep import SleepSession
from app.models.diaper import DiaperChange
from app.models.growth import GrowthRecord

from app.routers.v1.feedings import FeedingSchema
from app.routers.v1.sleep import SleepSessionSchema
from app.routers.v1.diapers import DiaperChangeSchema
from app.routers.v1.growth import GrowthRecordSchema
from app.services.cache import invalidate_baby_cache

router = APIRouter()


class DeletedActivitiesResponse(BaseModel):
    feedings: list[FeedingSchema]
    sleep: list[SleepSessionSchema]
    diapers: list[DiaperChangeSchema]
    growth: list[GrowthRecordSchema]


@router.get("/deleted/baby/{baby_id}", response_model=DeletedActivitiesResponse)
async def list_deleted_activities(
    baby_id: int,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    # Fetch soft-deleted records from the last 24 hours
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    # 1. Feedings
    feeding_stmt = select(Feeding).where(
        Feeding.baby_id == baby_id,
        Feeding.deleted_at >= cutoff
    ).order_by(Feeding.deleted_at.desc())
    feeding_res = await db.execute(feeding_stmt)
    feedings = feeding_res.scalars().all()

    # 2. Sleep Sessions
    sleep_stmt = select(SleepSession).where(
        SleepSession.baby_id == baby_id,
        SleepSession.deleted_at >= cutoff
    ).order_by(SleepSession.deleted_at.desc())
    sleep_res = await db.execute(sleep_stmt)
    sleep = sleep_res.scalars().all()

    # 3. Diaper Changes
    diaper_stmt = select(DiaperChange).where(
        DiaperChange.baby_id == baby_id,
        DiaperChange.deleted_at >= cutoff
    ).order_by(DiaperChange.deleted_at.desc())
    diaper_res = await db.execute(diaper_stmt)
    diapers = diaper_res.scalars().all()

    # 4. Growth Records
    growth_stmt = select(GrowthRecord).where(
        GrowthRecord.baby_id == baby_id,
        GrowthRecord.deleted_at >= cutoff
    ).order_by(GrowthRecord.deleted_at.desc())
    growth_res = await db.execute(growth_stmt)
    growth = growth_res.scalars().all()

    return {
        "feedings": feedings,
        "sleep": sleep,
        "diapers": diapers,
        "growth": growth,
    }


@router.post("/restore/{kind}/{id}")
async def restore_activity(
    kind: str,
    id: int,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    if kind == "feed":
        stmt = select(Feeding).where(Feeding.id == id)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
    elif kind == "sleep":
        stmt = select(SleepSession).where(SleepSession.id == id)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
    elif kind == "diaper":
        stmt = select(DiaperChange).where(DiaperChange.id == id)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
    elif kind == "growth":
        stmt = select(GrowthRecord).where(GrowthRecord.id == id)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
    else:
        raise HTTPException(status_code=400, detail="Invalid activity kind")

    if not record:
        raise HTTPException(status_code=404, detail="Activity record not found")

    record.deleted_at = None
    await db.commit()
    await invalidate_baby_cache(record.baby_id)
    return {"status": "success"}

