from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    baby_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("babies.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    achieved_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    media: Mapped[list["MilestoneMedia"]] = relationship(
        back_populates="milestone",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="MilestoneMedia.created_at.asc()",
    )


class MilestoneMedia(Base):
    __tablename__ = "milestone_media"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    milestone_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("milestones.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    media_type: Mapped[str] = mapped_column(String(20), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    milestone: Mapped[Milestone] = relationship(back_populates="media")
