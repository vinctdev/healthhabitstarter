"""add_avg_heart_rate_to_sleep_sessions

Revision ID: 4408d2aae8e6
Revises: d972d2595d21
Create Date: 2026-06-28 19:39:37.357884

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4408d2aae8e6'
down_revision: Union[str, None] = 'd972d2595d21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sleep_sessions', sa.Column('avg_heart_rate', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('sleep_sessions', 'avg_heart_rate')
