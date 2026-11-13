"""rename push-up muscle groups to push-up variants

Push-ups were logged per muscle group (chest/shoulders/triceps), which only made sense
with a push-up board. They are now logged per variant; old groups map to the variant
with the same focus.

Revision ID: d1f6a3b9e2c7
Revises: c5a7d9e2f4b8
Create Date: 2026-11-03 12:00:00.000000

"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1f6a3b9e2c7'
down_revision: Union[str, None] = 'c5a7d9e2f4b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MUSCLE_TO_VARIANT = {
    "chest": "wide",
    "triceps": "close",
    "shoulders": "pike",
}


def _rename_keys(column: str, mapping: dict) -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.text(f"SELECT id, {column} FROM pushup_entries")).fetchall()
    for row_id, raw in rows:
        reps = json.loads(raw)
        renamed: dict = {}
        for key, value in reps.items():
            new_key = mapping.get(key, key)
            renamed[new_key] = renamed.get(new_key, 0) + value
        if renamed != reps:
            conn.execute(
                sa.text(f"UPDATE pushup_entries SET {column} = :reps WHERE id = :id"),
                {"reps": json.dumps(renamed), "id": row_id},
            )


def upgrade() -> None:
    with op.batch_alter_table('pushup_entries') as batch_op:
        batch_op.alter_column(
            'muscle_reps', new_column_name='variant_reps', existing_type=sa.Text(), existing_nullable=False
        )
    _rename_keys('variant_reps', MUSCLE_TO_VARIANT)


def downgrade() -> None:
    # "standard" has no muscle group; it is counted as chest.
    inverse = {v: k for k, v in MUSCLE_TO_VARIANT.items()}
    inverse["standard"] = "chest"
    _rename_keys('variant_reps', inverse)
    with op.batch_alter_table('pushup_entries') as batch_op:
        batch_op.alter_column(
            'variant_reps', new_column_name='muscle_reps', existing_type=sa.Text(), existing_nullable=False
        )
