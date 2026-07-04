"""create_milestones_table

Revision ID: 443e3ca5b076
Revises:
Create Date: 2026-06-20 23:18:46.815322

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "443e3ca5b076"
down_revision: str | None = "1a2b3c4d5e6f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "milestones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("baby_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("achieved_at", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["baby_id"], ["babies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_milestones_id"), "milestones", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_milestones_id"), table_name="milestones")
    op.drop_table("milestones")
