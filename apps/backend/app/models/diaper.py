from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DiaperChange(Base):
    __tablename__ = "diaper_changes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    baby_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("babies.id", ondelete="CASCADE"),
        nullable=False,
    )
    changed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
