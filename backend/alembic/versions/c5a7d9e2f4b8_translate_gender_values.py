"""translate body profile gender values to English

Revision ID: c5a7d9e2f4b8
Revises: b3e8f1a4c6d2
Create Date: 2026-10-31 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5a7d9e2f4b8'
down_revision: Union[str, None] = 'b3e8f1a4c6d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

GENDERS = {
    "männlich": "male",
    "weiblich": "female",
    "divers": "other",
}


def _rename(mapping: dict[str, str]) -> None:
    stmt = sa.text("UPDATE body_profile SET gender = :new WHERE gender = :old")
    for old, new in mapping.items():
        op.execute(stmt.bindparams(old=old, new=new))


def upgrade() -> None:
    _rename(GENDERS)


def downgrade() -> None:
    _rename({v: k for k, v in GENDERS.items()})
