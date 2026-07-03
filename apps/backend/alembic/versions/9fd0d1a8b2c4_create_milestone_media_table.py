"""create_milestone_media_table

Revision ID: 9fd0d1a8b2c4
Revises: 443e3ca5b076
Create Date: 2026-06-30 22:15:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9fd0d1a8b2c4"
down_revision: Union[str, None] = "443e3ca5b076"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "milestone_media",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("milestone_id", sa.Integer(), nullable=False),
        sa.Column("media_type", sa.String(length=20), nullable=False),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["milestone_id"],
            ["milestones.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_index(
        op.f("ix_milestone_media_id"),
        "milestone_media",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_milestone_media_milestone_id"),
        "milestone_media",
        ["milestone_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_milestone_media_milestone_id"), table_name="milestone_media")
    op.drop_index(op.f("ix_milestone_media_id"), table_name="milestone_media")
    op.drop_table("milestone_media")
