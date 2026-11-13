"""add telegram tasks table

Revision ID: fea7e4f8b552
Revises: 6d948d7378ed
Create Date: 2026-08-14 22:42:24.893816

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fea7e4f8b552'
down_revision: Union[str, None] = '6d948d7378ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('telegram_tasks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=True),
    sa.Column('prompt', sa.Text(), nullable=False),
    sa.Column('frequency', sa.String(length=10), nullable=False),
    sa.Column('time', sa.String(length=5), nullable=False),
    sa.Column('day', sa.Integer(), nullable=True),
    sa.Column('enabled', sa.Boolean(), nullable=False),
    sa.Column('last_run_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_telegram_tasks_id'), 'telegram_tasks', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_telegram_tasks_id'), table_name='telegram_tasks')
    op.drop_table('telegram_tasks')
