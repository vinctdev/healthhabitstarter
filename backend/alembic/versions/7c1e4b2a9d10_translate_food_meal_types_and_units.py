"""translate food meal types and units to English

Revision ID: 7c1e4b2a9d10
Revises: 02d9568e86a1
Create Date: 2026-10-31 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c1e4b2a9d10'
down_revision: Union[str, None] = '02d9568e86a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MEAL_TYPES = {
    "Frühstück": "Breakfast",
    "Mittagessen": "Lunch",
    "Abendessen": "Dinner",
}
UNITS = {
    "Stk": "pcs",
    "TL": "tsp",
    "EL": "tbsp",
}


def _rename(table: str, column: str, mapping: dict[str, str]) -> None:
    stmt = sa.text(f"UPDATE {table} SET {column} = :new WHERE {column} = :old")
    for old, new in mapping.items():
        op.execute(stmt.bindparams(old=old, new=new))


def upgrade() -> None:
    _rename("food_entries", "meal_type", MEAL_TYPES)
    _rename("food_entries", "unit", UNITS)
    _rename("food_templates", "unit", UNITS)


def downgrade() -> None:
    _rename("food_entries", "meal_type", {v: k for k, v in MEAL_TYPES.items()})
    _rename("food_entries", "unit", {v: k for k, v in UNITS.items()})
    _rename("food_templates", "unit", {v: k for k, v in UNITS.items()})
