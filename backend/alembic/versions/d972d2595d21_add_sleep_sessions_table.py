"""add sleep_sessions table

Revision ID: d972d2595d21
Revises: 8389a1ad2f26
Create Date: 2026-06-24 16:51:08.060587

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd972d2595d21'
down_revision: Union[str, None] = '8389a1ad2f26'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('sleep_sessions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('date', sa.String(length=10), nullable=False),
    sa.Column('sleep_index', sa.Integer(), nullable=False),
    sa.Column('start_time_utc', sa.DateTime(), nullable=False),
    sa.Column('end_time_utc', sa.DateTime(), nullable=False),
    sa.Column('minutes_in_sleep_period', sa.Integer(), nullable=False),
    sa.Column('minutes_awake', sa.Integer(), nullable=False),
    sa.Column('minutes_asleep', sa.Integer(), nullable=False),
    sa.Column('minutes_to_fall_asleep', sa.Integer(), nullable=True),
    sa.Column('minutes_after_wake_up', sa.Integer(), nullable=True),
    sa.Column('minutes_deep', sa.Integer(), nullable=False),
    sa.Column('minutes_rem', sa.Integer(), nullable=False),
    sa.Column('minutes_light', sa.Integer(), nullable=False),
    sa.Column('stages_data', sa.Text(), nullable=True),
    sa.Column('skin_temperature_celsius', sa.Float(), nullable=True),
    sa.Column('baseline_temperature_celsius', sa.Float(), nullable=True),
    sa.Column('respiratory_rate_avg', sa.Float(), nullable=True),
    sa.Column('respiratory_rate_deep', sa.Float(), nullable=True),
    sa.Column('respiratory_rate_light', sa.Float(), nullable=True),
    sa.Column('respiratory_rate_rem', sa.Float(), nullable=True),
    sa.Column('fetched_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sleep_sessions_date'), 'sleep_sessions', ['date'], unique=True)
    op.create_index(op.f('ix_sleep_sessions_id'), 'sleep_sessions', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_sleep_sessions_id'), table_name='sleep_sessions')
    op.drop_index(op.f('ix_sleep_sessions_date'), table_name='sleep_sessions')
    op.drop_table('sleep_sessions')
