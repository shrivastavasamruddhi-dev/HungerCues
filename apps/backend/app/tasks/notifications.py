"""
Celery tasks for push notification scheduling.

This module replaces the asyncio notification_scheduler_loop that previously
ran as a background task in the FastAPI lifespan. It is triggered by
Celery Beat on a per-minute schedule (configured in app/worker.py).
"""
import asyncio
import logging

from app.worker import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.notifications.check_and_send_notifications",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def check_and_send_notifications(self):
    """
    Periodic task: check for due notifications and dispatch them via FCM.

    This runs every minute via Celery Beat. It uses asyncio.run() to
    bridge into the async notification scheduler logic.
    """
    try:
        from app.database import async_session
        from app.jobs.notification_scheduler import check_and_send

        async def _run():
            async with async_session() as session:
                await check_and_send(session)

        asyncio.run(_run())

    except Exception as exc:
        logger.exception("Notification task failed: %s", exc)
        raise self.retry(exc=exc)
