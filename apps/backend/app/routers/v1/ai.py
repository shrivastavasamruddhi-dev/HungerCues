import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.dependencies.auth import get_current_firebase_uid
from app.middleware.rate_limit import AI_LIMIT, limiter
from app.models.baby import Baby
from app.models.diaper import DiaperChange
from app.models.feeding import Feeding
from app.models.growth import GrowthRecord
from app.models.sleep import SleepSession
from app.services.ai.schemas import (
    AIInsightRequest,
    AIInsightResponse,
    AIQuestionRequest,
    AIQuestionResponse,
    AIWeeklySummaryRequest,
    AIWeeklySummaryResponse,
    DiaperLogInput,
    FeedingLogInput,
    GrowthLogInput,
    SleepLogInput,
)
from app.services.ai.service import AIService
from app.services.cache import cache_service

logger = logging.getLogger(__name__)
router = APIRouter()
ai_service = AIService()


@router.post("/insights/{baby_id}", response_model=AIInsightResponse)
@limiter.limit(AI_LIMIT)
async def get_insights(
    request: Request,
    baby_id: int,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    """Retrieve parenting insights for a specific baby by analyzing their feeding and sleep logs."""
    # 1. Check cache first
    cache_key = f"insights:{baby_id}"
    cached_insights = await cache_service.get(cache_key)
    if cached_insights:
        logger.info("Serving cached insights for baby_id=%s", baby_id)
        return cached_insights

    # 2. Fetch baby details
    stmt = select(Baby).where(Baby.id == baby_id)
    result = await db.execute(stmt)
    baby = result.scalar_one_or_none()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    # 3. Fetch feeding logs (limit to last 20 for prompt size)
    feeding_stmt = (
        select(Feeding)
        .where(Feeding.baby_id == baby_id)
        .order_by(Feeding.start_time.desc())
        .limit(20)
    )
    feedings_result = await db.execute(feeding_stmt)
    feedings = feedings_result.scalars().all()

    # 4. Fetch sleep logs (limit to last 20)
    sleep_stmt = (
        select(SleepSession)
        .where(SleepSession.baby_id == baby_id)
        .order_by(SleepSession.sleep_start.desc())
        .limit(20)
    )
    sleep_result = await db.execute(sleep_stmt)
    sleep_sessions = sleep_result.scalars().all()

    # 5. Construct AIInsightRequest
    req = AIInsightRequest(
        baby_name=baby.name,
        birth_date=baby.birth_date.isoformat(),
        gender=baby.gender,
        feedings=[
            FeedingLogInput(
                type=f.type,
                start_time=f.start_time,
                duration_minutes=f.duration_minutes,
                quantity_ml=f.quantity_ml,
                notes=f.notes,
            )
            for f in feedings
        ],
        sleep_sessions=[
            SleepLogInput(
                sleep_start=s.sleep_start,
                sleep_end=s.sleep_end,
                duration_minutes=s.duration_minutes,
                tracking_method=s.tracking_method,
                notes=s.notes,
            )
            for s in sleep_sessions
        ],
    )

    # 6. Call AI Service & cache results
    insights = await ai_service.get_parenting_insights(req)
    await cache_service.set(
        cache_key,
        insights.model_dump() if hasattr(insights, "model_dump") else insights,
    )
    return insights


@router.post("/ask/{baby_id}", response_model=AIQuestionResponse)
@limiter.limit(AI_LIMIT)
async def ask_question(
    request: Request,
    baby_id: int,
    question_in: AIQuestionRequest,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    """Ask a parenting question in the context of a baby's recent activity logs."""
    # 1. Fetch baby details
    stmt = select(Baby).where(Baby.id == baby_id)
    result = await db.execute(stmt)
    baby = result.scalar_one_or_none()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    # 2. Fetch feeding logs (limit to last 20 for prompt size)
    feeding_stmt = (
        select(Feeding)
        .where(Feeding.baby_id == baby_id)
        .order_by(Feeding.start_time.desc())
        .limit(20)
    )
    feedings_result = await db.execute(feeding_stmt)
    feedings = feedings_result.scalars().all()

    # 3. Fetch sleep logs (limit to last 20)
    sleep_stmt = (
        select(SleepSession)
        .where(SleepSession.baby_id == baby_id)
        .order_by(SleepSession.sleep_start.desc())
        .limit(20)
    )
    sleep_result = await db.execute(sleep_stmt)
    sleep_sessions = sleep_result.scalars().all()

    # 4. Construct AIInsightRequest
    req = AIInsightRequest(
        baby_name=baby.name,
        birth_date=baby.birth_date.isoformat(),
        gender=baby.gender,
        feedings=[
            FeedingLogInput(
                type=f.type,
                start_time=f.start_time,
                duration_minutes=f.duration_minutes,
                quantity_ml=f.quantity_ml,
                notes=f.notes,
            )
            for f in feedings
        ],
        sleep_sessions=[
            SleepLogInput(
                sleep_start=s.sleep_start,
                sleep_end=s.sleep_end,
                duration_minutes=s.duration_minutes,
                tracking_method=s.tracking_method,
                notes=s.notes,
            )
            for s in sleep_sessions
        ],
    )

    # 5. Call AI Service
    answer = await ai_service.ask_baby_question(req, question_in.question)
    return AIQuestionResponse(answer=answer)


@router.post("/weekly-summary/{baby_id}", response_model=AIWeeklySummaryResponse)
@limiter.limit(AI_LIMIT)
async def get_weekly_summary(
    request: Request,
    baby_id: int,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    """Generate a comprehensive 7-day AI summary of all baby activity logs."""
    # 1. Check cache first
    cache_key = f"weekly_summary:{baby_id}"
    cached_summary = await cache_service.get(cache_key)
    if cached_summary:
        logger.info("Serving cached weekly summary for baby_id=%s", baby_id)
        return cached_summary

    # 2. Fetch baby
    stmt = select(Baby).where(Baby.id == baby_id)
    result = await db.execute(stmt)
    baby = result.scalar_one_or_none()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    # 3. Define 7-day window
    cutoff = datetime.now(UTC) - timedelta(days=7)

    # 4. Fetch last 7 days of all log types
    f_stmt = (
        select(Feeding)
        .where(Feeding.baby_id == baby_id, Feeding.start_time >= cutoff)
        .order_by(Feeding.start_time.desc())
    )
    s_stmt = (
        select(SleepSession)
        .where(SleepSession.baby_id == baby_id, SleepSession.sleep_start >= cutoff)
        .order_by(SleepSession.sleep_start.desc())
    )
    d_stmt = (
        select(DiaperChange)
        .where(DiaperChange.baby_id == baby_id, DiaperChange.changed_at >= cutoff)
        .order_by(DiaperChange.changed_at.desc())
    )
    g_stmt = (
        select(GrowthRecord)
        .where(GrowthRecord.baby_id == baby_id, GrowthRecord.recorded_at >= cutoff)
        .order_by(GrowthRecord.recorded_at.desc())
    )

    feedings = (await db.execute(f_stmt)).scalars().all()
    sleep_sessions = (await db.execute(s_stmt)).scalars().all()
    diapers = (await db.execute(d_stmt)).scalars().all()
    growth_records = (await db.execute(g_stmt)).scalars().all()

    # 5. Construct request
    req = AIWeeklySummaryRequest(
        baby_name=baby.name,
        birth_date=baby.birth_date.isoformat(),
        gender=baby.gender,
        feedings=[
            FeedingLogInput(
                type=f.type,
                start_time=f.start_time,
                duration_minutes=f.duration_minutes,
                quantity_ml=f.quantity_ml,
                notes=f.notes,
            )
            for f in feedings
        ],
        sleep_sessions=[
            SleepLogInput(
                sleep_start=s.sleep_start,
                sleep_end=s.sleep_end,
                duration_minutes=s.duration_minutes,
                tracking_method=s.tracking_method,
                notes=s.notes,
            )
            for s in sleep_sessions
        ],
        diapers=[
            DiaperLogInput(
                changed_at=d.changed_at,
                type=d.type,
            )
            for d in diapers
        ],
        growth_records=[
            GrowthLogInput(
                recorded_at=g.recorded_at,
                weight_kg=g.weight_kg,
                height_cm=g.height_cm,
            )
            for g in growth_records
        ],
    )

    # 6. Call AI service & cache results
    summary = await ai_service.get_weekly_summary(req)
    await cache_service.set(
        cache_key,
        summary.model_dump() if hasattr(summary, "model_dump") else summary,
    )
    return summary
