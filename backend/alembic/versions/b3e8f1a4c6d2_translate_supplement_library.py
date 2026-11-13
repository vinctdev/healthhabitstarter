"""translate supplement library names and units to English

Stack entries reference library rows by id. The startup sync in main.py
deletes library rows whose name is no longer seeded, so the names are
renamed in place here before the sync runs. Category, tags and default
units of the library are updated by the sync afterwards.

Revision ID: b3e8f1a4c6d2
Revises: 9a4d2f6c1b37
Create Date: 2026-10-31 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3e8f1a4c6d2'
down_revision: Union[str, None] = '9a4d2f6c1b37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NAMES = {
    "Magnesiumcitrat": "Magnesium citrate",
    "Magnesiumglycinat": "Magnesium glycinate",
    "Magnesiumoxid": "Magnesium oxide",
    "Magnesiummalat": "Magnesium malate",
    "Magnesiumbisglycinat": "Magnesium bisglycinate",
    "Magnesiumchlorid": "Magnesium chloride",
    "Magnesium-Komplex": "Magnesium complex",
    "Zink": "Zinc",
    "Eisen": "Iron",
    "Vitamin B-Komplex": "Vitamin B complex",
    "Creatin": "Creatine",
    "Protein-Pulver": "Protein powder",
    "Coenzym Q10": "Coenzyme Q10",
    "L-Theanin": "L-Theanine",
    "Johanniskraut": "St. John's wort",
    "Ginkgo Biloba": "Ginkgo biloba",
    "Selen": "Selenium",
    "Probiotika": "Probiotics",
    "Rhodiola Rosea": "Rhodiola rosea",
    "Kollagen": "Collagen",
    "L-Arginin": "L-Arginine",
    "Grüntee-Extrakt": "Green tea extract",
}
UNITS = {
    "IE": "IU",
    "Kapsel": "capsule",
}


def _rename(table: str, column: str, mapping: dict[str, str]) -> None:
    stmt = sa.text(f"UPDATE {table} SET {column} = :new WHERE {column} = :old")
    for old, new in mapping.items():
        op.execute(stmt.bindparams(old=old, new=new))


def upgrade() -> None:
    _rename("supplements", "name", NAMES)
    _rename("supplements", "default_unit", UNITS)
    _rename("user_supplements", "unit", UNITS)


def downgrade() -> None:
    _rename("supplements", "name", {v: k for k, v in NAMES.items()})
    _rename("supplements", "default_unit", {v: k for k, v in UNITS.items()})
    _rename("user_supplements", "unit", {v: k for k, v in UNITS.items()})
