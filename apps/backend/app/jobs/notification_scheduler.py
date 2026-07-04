import asyncio
import logging
from datetime import date, datetime

from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.future import select

from app.config import settings
from app.models.baby import Baby
from app.models.feeding import Feeding
from app.models.sleep import SleepSession
from app.routers.v1.notifications import notification_log

logger = logging.getLogger("app.jobs.notification_scheduler")

# In-memory tracking state to manage alert repetitions
# Maps sleep_session.id -> k (multiplier of repetition interval)
triggered_sleep_milestones: dict[int, int] = {}

# Maps baby_id -> k (multiplier of repetition interval) for feed inactivity gaps
triggered_feed_gaps: dict[int, int] = {}

# Maps baby_id -> k (multiplier of repetition interval) for nap inactivity gaps
triggered_nap_gaps: dict[int, int] = {}

notification_id_counter = 1


def is_active_hours(baby_birth_date: date) -> bool:
    """Evaluate age gate: checks run 24/7 if <= 4 months, else 8 AM - midnight."""
    now = datetime.now()
    age_days = (now.date() - baby_birth_date).days
    age_months = age_days / 30.4

    if age_months <= 4.0:
        return True

    current_hour = now.hour
    return 8 <= current_hour < 24


async def run_scheduler_cycle(
    session_maker: async_sessionmaker,
) -> None:  # pragma: no cover
    global notification_id_counter

    # Define thresholds depending on test mode
    if settings.notification_test_mode:
        sleep_threshold_sec = 60.0  # 1 minute
        sleep_repeat_sec = 15.0  # 15 seconds
        gap_threshold_sec = 120.0  # 2 minutes
        gap_repeat_sec = 30.0  # 30 seconds
    else:
        sleep_threshold_sec = 90.0 * 60.0  # 90 minutes
        sleep_repeat_sec = 30.0 * 60.0  # 30 minutes
        gap_threshold_sec = 90.0 * 60.0  # 90 minutes
        gap_repeat_sec = 30.0 * 60.0  # 30 minutes

    async with session_maker() as db:
        try:
            # 1. Fetch all babies
            babies_stmt = select(Baby)
            babies_result = await db.execute(babies_stmt)
            babies = babies_result.scalars().all()

            if not babies:
                return

            now = datetime.now()

            # Clean up memory states for sleep sessions that are no longer active
            active_ids = []

            for baby in babies:
                # Age gate check
                active_hours = is_active_hours(baby.birth_date)

                # ==========================================
                # A. Live Sleep Timer Milestones
                # ==========================================
                # Find active sleep session (sleep_end is null)
                sleep_stmt = (
                    select(SleepSession)
                    .where(
                        SleepSession.baby_id == baby.id, SleepSession.sleep_end == None
                    )
                    .limit(1)
                )
                sleep_res = await db.execute(sleep_stmt)
                active_sleep = sleep_res.scalar_one_or_none()

                if active_sleep:
                    active_ids.append(active_sleep.id)
                    # Exclude night sleep
                    if active_sleep.tracking_method != "night":
                        # Calculate elapsed time in seconds
                        # Handle offset-naive comparison
                        sleep_start_naive = active_sleep.sleep_start.replace(
                            tzinfo=None
                        )
                        elapsed_sec = (now - sleep_start_naive).total_seconds()

                        k = triggered_sleep_milestones.get(active_sleep.id, -1)
                        next_threshold = (
                            sleep_threshold_sec + (k + 1) * sleep_repeat_sec
                        )

                        if elapsed_sec >= next_threshold:
                            k += 1
                            triggered_sleep_milestones[active_sleep.id] = k

                            msg = (
                                "Your baby has completed approximately one sleep cycle."
                            )
                            logger.info(
                                f"[Sleep Cycle Alert] Baby {baby.name} (ID: {baby.id}): {msg}"
                            )

                            # Add to in-memory notification log
                            notification_entry = {
                                "id": notification_id_counter,
                                "title": "Sleep Cycle Milestone",
                                "body": f"{baby.name} has completed approximately one sleep cycle.",
                                "sent_at": datetime.now().isoformat(),
                                "type": "sleep_timer",
                            }
                            notification_log.append(notification_entry)
                            notification_id_counter += 1

                # ==========================================
                # B. Inactivity Gap Alerts (Only if active hours)
                # ==========================================
                if active_hours:
                    # 1. Feeding Gap Alert
                    feed_stmt = (
                        select(Feeding)
                        .where(Feeding.baby_id == baby.id)
                        .order_by(Feeding.start_time.desc())
                        .limit(1)
                    )
                    feed_res = await db.execute(feed_stmt)
                    last_feed = feed_res.scalar_one_or_none()

                    if last_feed:
                        feed_start_naive = last_feed.start_time.replace(tzinfo=None)
                        elapsed_feed_sec = (now - feed_start_naive).total_seconds()

                        k_feed = triggered_feed_gaps.get(baby.id, -1)
                        next_feed_threshold = (
                            gap_threshold_sec + (k_feed + 1) * gap_repeat_sec
                        )

                        if elapsed_feed_sec >= next_feed_threshold:
                            k_feed += 1
                            triggered_feed_gaps[baby.id] = k_feed

                            msg = "Your baby might be hungry now!"
                            logger.info(
                                f"[Feeding Gap Alert] Baby {baby.name} (ID: {baby.id}): {msg}"
                            )

                            notification_entry = {
                                "id": notification_id_counter,
                                "title": "Hunger Alert",
                                "body": f"{baby.name} might be hungry now!",
                                "sent_at": datetime.now().isoformat(),
                                "type": "feed_gap",
                            }
                            notification_log.append(notification_entry)
                            notification_id_counter += 1
                    else:
                        # No feedings recorded, reset gap tracking
                        triggered_feed_gaps[baby.id] = -1

                    # 2. Nap Gap Alert
                    # Exclude active sleep or sleep sessions marked as 'night'
                    nap_stmt = (
                        select(SleepSession)
                        .where(
                            SleepSession.baby_id == baby.id,
                            SleepSession.sleep_end != None,
                            SleepSession.tracking_method != "night",
                        )
                        .order_by(SleepSession.sleep_end.desc())
                        .limit(1)
                    )
                    nap_res = await db.execute(nap_stmt)
                    last_nap = nap_res.scalar_one_or_none()

                    if last_nap and not active_sleep:
                        nap_end_naive = last_nap.sleep_end.replace(tzinfo=None)
                        elapsed_nap_sec = (now - nap_end_naive).total_seconds()

                        k_nap = triggered_nap_gaps.get(baby.id, -1)
                        next_nap_threshold = (
                            gap_threshold_sec + (k_nap + 1) * gap_repeat_sec
                        )

                        if elapsed_nap_sec >= next_nap_threshold:
                            k_nap += 1
                            triggered_nap_gaps[baby.id] = k_nap

                            msg = "It's time for your baby to sleep!"
                            logger.info(
                                f"[Nap Gap Alert] Baby {baby.name} (ID: {baby.id}): {msg}"
                            )

                            notification_entry = {
                                "id": notification_id_counter,
                                "title": "Nap Reminder",
                                "body": f"It's time for {baby.name} to sleep!",
                                "sent_at": datetime.now().isoformat(),
                                "type": "nap_gap",
                            }
                            notification_log.append(notification_entry)
                            notification_id_counter += 1
                    else:
                        # Reset nap gap tracking when baby is sleeping or no nap exists
                        triggered_nap_gaps[baby.id] = -1

            # Clean memory of inactive sleep IDs
            for sid in list(triggered_sleep_milestones.keys()):
                if sid not in active_ids:
                    triggered_sleep_milestones.pop(sid, None)

        except Exception as e:
            logger.error(f"Error in notification scheduler loop: {e}", exc_info=True)


async def notification_scheduler_loop(
    session_maker: async_sessionmaker,
) -> None:  # pragma: no cover
    """Loop wrapper that runs the scheduler cycle periodically."""
    logger.info("Notification scheduler background task started.")
    while True:
        try:
            await run_scheduler_cycle(session_maker)
        except Exception as e:
            logger.error(f"Failed to run scheduler cycle: {e}", exc_info=True)

        # Determine wait interval
        interval = 10 if settings.notification_test_mode else 60
        await asyncio.sleep(interval)


async def check_and_send(session) -> None:
    """
    Single-tick entry point called by the Celery task.

    Runs one cycle of all notification checks using an already-open
    AsyncSession (provided by the Celery task via asyncio.run()).
    This avoids creating a second session inside run_scheduler_cycle.
    """
    global notification_id_counter

    if settings.notification_test_mode:
        sleep_threshold_sec = 60.0
        sleep_repeat_sec = 15.0
        gap_threshold_sec = 120.0
        gap_repeat_sec = 30.0
    else:
        sleep_threshold_sec = 90.0 * 60.0
        sleep_repeat_sec = 30.0 * 60.0
        gap_threshold_sec = 90.0 * 60.0
        gap_repeat_sec = 30.0 * 60.0

    try:
        from sqlalchemy.future import select as sa_select

        babies_result = await session.execute(sa_select(Baby))
        babies = babies_result.scalars().all()

        if not babies:
            return

        now = datetime.now()
        active_ids: list[int] = []

        for baby in babies:
            active_hours = is_active_hours(baby.birth_date)

            # Active sleep check
            sleep_stmt = (
                sa_select(SleepSession)
                .where(SleepSession.baby_id == baby.id, SleepSession.sleep_end == None)
                .limit(1)
            )
            sleep_res = await session.execute(sleep_stmt)
            active_sleep = sleep_res.scalar_one_or_none()

            if active_sleep:
                active_ids.append(active_sleep.id)
                if active_sleep.tracking_method != "night":
                    sleep_start_naive = active_sleep.sleep_start.replace(tzinfo=None)
                    elapsed_sec = (now - sleep_start_naive).total_seconds()
                    k = triggered_sleep_milestones.get(active_sleep.id, -1)
                    next_threshold = sleep_threshold_sec + (k + 1) * sleep_repeat_sec
                    if elapsed_sec >= next_threshold:
                        k += 1
                        triggered_sleep_milestones[active_sleep.id] = k
                        notification_log.append(
                            {
                                "id": notification_id_counter,
                                "title": "Sleep Cycle Milestone",
                                "body": f"{baby.name} has completed approximately one sleep cycle.",
                                "sent_at": datetime.now().isoformat(),
                                "type": "sleep_timer",
                            }
                        )
                        notification_id_counter += 1

            if active_hours:
                feed_stmt = (
                    sa_select(Feeding)
                    .where(Feeding.baby_id == baby.id)
                    .order_by(Feeding.start_time.desc())
                    .limit(1)
                )
                feed_res = await session.execute(feed_stmt)
                last_feed = feed_res.scalar_one_or_none()

                if last_feed:
                    feed_start_naive = last_feed.start_time.replace(tzinfo=None)
                    elapsed_feed_sec = (now - feed_start_naive).total_seconds()
                    k_feed = triggered_feed_gaps.get(baby.id, -1)
                    next_feed_threshold = (
                        gap_threshold_sec + (k_feed + 1) * gap_repeat_sec
                    )
                    if elapsed_feed_sec >= next_feed_threshold:
                        k_feed += 1
                        triggered_feed_gaps[baby.id] = k_feed
                        notification_log.append(
                            {
                                "id": notification_id_counter,
                                "title": "Hunger Alert",
                                "body": f"{baby.name} might be hungry now!",
                                "sent_at": datetime.now().isoformat(),
                                "type": "feed_gap",
                            }
                        )
                        notification_id_counter += 1
                else:
                    triggered_feed_gaps[baby.id] = -1

        # Clean up stale sleep milestone state
        for sid in list(triggered_sleep_milestones.keys()):
            if sid not in active_ids:
                triggered_sleep_milestones.pop(sid, None)

    except Exception as e:
        logger.error("check_and_send error: %s", e, exc_info=True)
