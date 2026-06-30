"""
Celery worker configuration for Baby Tracker.

This module defines the Celery app instance used by:
  - celery-worker (task execution)
  - celery-beat  (periodic task scheduling)
  - Flower       (monitoring UI)

Usage:
    # Start worker:
    celery -A app.worker worker --loglevel=info
    # Start beat scheduler:
    celery -A app.worker beat --loglevel=info
"""
import os

from celery import Celery
from celery.schedules import crontab

from app.config import settings

# ---------------------------------------------------------------------------
# Redis connection URL — constructed from settings
# The REDIS_URL can also be set directly as an env var for flexibility.
# ---------------------------------------------------------------------------
REDIS_URL = os.getenv(
    "REDIS_URL",
    f"redis://:{os.getenv('REDIS_PASSWORD', 'changeme')}@redis:6379/0",
)

# ---------------------------------------------------------------------------
# Celery app instance
# ---------------------------------------------------------------------------
celery_app = Celery(
    "baby_tracker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks.notifications"],  # modules with @celery_app.task definitions
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    # Timezone
    timezone="UTC",
    enable_utc=True,
    # Worker reliability
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    # Result expiry
    result_expires=3600,  # 1 hour
    # Beat schedule — replaces the asyncio notification loop
    beat_schedule={
        "check-notifications-every-minute": {
            "task": "app.tasks.notifications.check_and_send_notifications",
            "schedule": crontab(minute="*"),  # every minute
        },
    },
)

# Expose as `worker` for the `celery -A app.worker` CLI command
worker = celery_app
