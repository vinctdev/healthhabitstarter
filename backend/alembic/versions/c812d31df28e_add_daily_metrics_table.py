"""add_daily_metrics_table

Revision ID: c812d31df28e
Revises: 4408d2aae8e6
Create Date: 2026-06-30 23:31:05.782256

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c812d31df28e'
down_revision: Union[str, None] = '4408d2aae8e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('daily_metrics',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('date', sa.String(length=10), nullable=False),
    sa.Column('resting_heart_rate', sa.Float(), nullable=True),
    sa.Column('hrv_rmssd', sa.Float(), nullable=True),
    sa.Column('hrv_entropy', sa.Float(), nullable=True),
    sa.Column('spo2_avg', sa.Float(), nullable=True),
    sa.Column('spo2_low', sa.Float(), nullable=True),
    sa.Column('steps', sa.Integer(), nullable=True),
    sa.Column('fetched_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_daily_metrics_date'), 'daily_metrics', ['date'], unique=True)
    op.create_index(op.f('ix_daily_metrics_id'), 'daily_metrics', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_daily_metrics_id'), table_name='daily_metrics')
    op.drop_index(op.f('ix_daily_metrics_date'), table_name='daily_metrics')
    op.drop_table('daily_metrics')
