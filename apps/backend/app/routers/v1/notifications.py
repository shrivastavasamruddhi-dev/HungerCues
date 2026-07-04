"""
Notifications router.

Provides endpoints for:
- Registering FCM device tokens for push notifications.
- Retrieving recent in-memory notification log entries (for testing / Notification Center UI).
"""

from collections import deque
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.dependencies.auth import get_current_firebase_uid
from app.models.device_token import DeviceToken

router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory notification log (last 50 entries, survives until server restart)
# Populated by the background scheduler in app/jobs/notification_scheduler.py
# ---------------------------------------------------------------------------
notification_log: deque[dict] = deque(maxlen=50)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class RegisterTokenRequest(BaseModel):
    fcm_token: str
    baby_id: int


class RegisterTokenResponse(BaseModel):
    status: str


class NotificationEntry(BaseModel):
    id: int
    title: str
    body: str
    sent_at: str
    type: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/register", response_model=RegisterTokenResponse)
async def register_device_token(
    req: RegisterTokenRequest,
    db: AsyncSession = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    """Register or update an FCM device token for the authenticated user."""
    if not req.fcm_token or len(req.fcm_token) < 10:
        raise HTTPException(status_code=400, detail="Invalid FCM token")

    # Upsert: update if token already exists, otherwise create
    stmt = select(DeviceToken).where(DeviceToken.fcm_token == req.fcm_token)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        existing.user_firebase_uid = firebase_uid
        existing.baby_id = req.baby_id
        existing.registered_at = datetime.utcnow()
    else:
        token = DeviceToken(
            user_firebase_uid=firebase_uid,
            baby_id=req.baby_id,
            fcm_token=req.fcm_token,
            registered_at=datetime.utcnow(),
        )
        db.add(token)

    await db.commit()
    return RegisterTokenResponse(status="registered")


@router.get("/recent", response_model=list[NotificationEntry])
async def get_recent_notifications(
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    """Return the last 50 in-memory notification log entries (for the Notification Center UI)."""
    entries = list(notification_log)
    entries.reverse()  # Most recent first
    return [NotificationEntry(**entry) for entry in entries]


@router.post("/clear", response_model=RegisterTokenResponse)
async def clear_notifications(
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    """Clear all entries from the in-memory notification log."""
    notification_log.clear()
    return RegisterTokenResponse(status="cleared")


@router.delete("/{notification_id}", response_model=RegisterTokenResponse)
async def delete_notification(
    notification_id: int,
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    """Remove a single notification entry by ID from the in-memory log."""
    original_len = len(notification_log)
    to_keep = [
        entry for entry in notification_log if entry.get("id") != notification_id
    ]
    if len(to_keep) == original_len:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification_log.clear()
    notification_log.extend(to_keep)
    return RegisterTokenResponse(status="deleted")
