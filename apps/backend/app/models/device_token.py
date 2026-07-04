from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DeviceToken(Base):
    """Stores FCM device tokens for push notification delivery."""

    __tablename__ = "device_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_firebase_uid: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    baby_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("babies.id", ondelete="CASCADE"),
        nullable=False,
    )
    fcm_token: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    registered_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
