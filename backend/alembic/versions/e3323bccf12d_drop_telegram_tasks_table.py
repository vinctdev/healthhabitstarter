"""drop telegram tasks table

Revision ID: e3323bccf12d
Revises: 4cc68db0fc77
Create Date: 2026-10-29 21:36:20.431732

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3323bccf12d'
down_revision: Union[str, None] = '4cc68db0fc77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(op.f('ix_telegram_tasks_id'), table_name='telegram_tasks')
    op.drop_table('telegram_tasks')


def downgrade() -> None:
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
