"""add_sport_reasons_and_goal

Revision ID: 6d948d7378ed
Revises: 08e72028b28c
Create Date: 2026-07-10 22:23:13.479136

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6d948d7378ed'
down_revision: Union[str, None] = '08e72028b28c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user_settings', sa.Column('sport_reasons', sa.Text(), nullable=True))
    op.add_column('user_settings', sa.Column('sport_goal', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('user_settings', 'sport_goal')
    op.drop_column('user_settings', 'sport_reasons')
