"""add_food_templates_table

Revision ID: 4a6ca43aef6d
Revises: 3f4bc3c35247
Create Date: 2026-06-12 15:32:18.017100

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a6ca43aef6d'
down_revision: Union[str, None] = '3f4bc3c35247'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('food_templates',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('label', sa.String(length=200), nullable=False),
    sa.Column('name', sa.String(length=300), nullable=False),
    sa.Column('emoji', sa.String(length=10), nullable=False),
    sa.Column('is_drink', sa.Boolean(), nullable=False),
    sa.Column('amount', sa.Float(), nullable=False),
    sa.Column('unit', sa.String(length=10), nullable=False),
    sa.Column('calories', sa.Integer(), nullable=False),
    sa.Column('protein', sa.Float(), nullable=False),
    sa.Column('carbs', sa.Float(), nullable=False),
    sa.Column('fat', sa.Float(), nullable=False),
    sa.Column('salt', sa.Float(), nullable=False),
    sa.Column('sugar', sa.Float(), nullable=False),
    sa.Column('water_ml', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_food_templates_id'), 'food_templates', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_food_templates_id'), table_name='food_templates')
    op.drop_table('food_templates')
