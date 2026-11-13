"""add_muscle_mass_kg_to_body_measurements

Revision ID: 6aa3383dfcb8
Revises: c812d31df28e
Create Date: 2026-07-02 23:17:05.552520

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6aa3383dfcb8'
down_revision: Union[str, None] = 'c812d31df28e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('body_measurements', sa.Column('muscle_mass_kg', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('body_measurements', 'muscle_mass_kg')
