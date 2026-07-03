"""initial_base_tables

Revision ID: 1a2b3c4d5e6f
Revises: None
Create Date: 2026-07-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a2b3c4d5e6f'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('firebase_uid', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_firebase_uid'), 'users', ['firebase_uid'], unique=True)

    # 2. babies
    op.create_table(
        'babies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('birth_date', sa.Date(), nullable=False),
        sa.Column('gender', sa.String(length=50), nullable=False),
        sa.Column('family_id', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_babies_id'), 'babies', ['id'], unique=False)

    # 3. feedings
    op.create_table(
        'feedings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('quantity_ml', sa.Float(), nullable=True),
        sa.Column('breast_side', sa.String(length=20), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_feedings_id'), 'feedings', ['id'], unique=False)

    # 4. sleep_sessions
    op.create_table(
        'sleep_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('sleep_start', sa.DateTime(), nullable=False),
        sa.Column('sleep_end', sa.DateTime(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('tracking_method', sa.String(length=50), nullable=False),
        sa.Column('sleep_type', sa.String(length=50), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sleep_sessions_id'), 'sleep_sessions', ['id'], unique=False)

    # 5. diaper_changes
    op.create_table(
        'diaper_changes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('changed_at', sa.DateTime(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_diaper_changes_id'), 'diaper_changes', ['id'], unique=False)

    # 6. growth_records
    op.create_table(
        'growth_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('weight_kg', sa.Float(), nullable=True),
        sa.Column('height_cm', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_growth_records_id'), 'growth_records', ['id'], unique=False)

    # 7. device_tokens
    op.create_table(
        'device_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_firebase_uid', sa.String(length=255), nullable=False),
        sa.Column('baby_id', sa.Integer(), nullable=False),
        sa.Column('fcm_token', sa.String(length=512), nullable=False),
        sa.Column('registered_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['baby_id'], ['babies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('fcm_token')
    )
    op.create_index(op.f('ix_device_tokens_id'), 'device_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_device_tokens_user_firebase_uid'), 'device_tokens', ['user_firebase_uid'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_device_tokens_user_firebase_uid'), table_name='device_tokens')
    op.drop_index(op.f('ix_device_tokens_id'), table_name='device_tokens')
    op.drop_table('device_tokens')
    op.drop_index(op.f('ix_growth_records_id'), table_name='growth_records')
    op.drop_table('growth_records')
    op.drop_index(op.f('ix_diaper_changes_id'), table_name='diaper_changes')
    op.drop_table('diaper_changes')
    op.drop_index(op.f('ix_sleep_sessions_id'), table_name='sleep_sessions')
    op.drop_table('sleep_sessions')
    op.drop_index(op.f('ix_feedings_id'), table_name='feedings')
    op.drop_table('feedings')
    op.drop_index(op.f('ix_babies_id'), table_name='babies')
    op.drop_table('babies')
    op.drop_index(op.f('ix_users_firebase_uid'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
