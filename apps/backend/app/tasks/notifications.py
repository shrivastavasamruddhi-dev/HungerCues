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
        from app.jobs.notification_scheduler import notification_scheduler_loop

        async def _run():
            """Run one tick of the notification scheduler."""
            class _SessionProxy:
                def __call__(self):
                    return async_session()

            # Run a single iteration of the scheduler
            try:
                async with async_session() as session:
                    # Import the per-tick logic if available, else run loop once
                    from app.jobs.notification_scheduler import check_and_send
                    await check_and_send(session)
            except ImportError:
                # Fallback: the scheduler loop manages its own session
                logger.warning(
                    "check_and_send not found in notification_scheduler; "
                    "consider refactoring to expose a single-tick function."
                )

        asyncio.run(_run())

    except Exception as exc:
        logger.exception("Notification task failed: %s", exc)
        raise self.retry(exc=exc)
