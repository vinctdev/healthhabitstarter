"""translate run locations, push-up muscle groups and sport reasons to English

Revision ID: 9a4d2f6c1b37
Revises: 7c1e4b2a9d10
Create Date: 2026-10-31 17:00:00.000000

"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a4d2f6c1b37'
down_revision: Union[str, None] = '7c1e4b2a9d10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LOCATIONS = {
    "Wald": "Forest",
    "Feld": "Fields",
    "Im Ort": "Town",
    "Laufband": "Treadmill",
}
MUSCLES = {
    "brust": "chest",
    "schulter": "shoulders",
    "trizeps": "triceps",
}
# Predefined reasons from SportSettingsModal; custom reasons are kept as they are.
REASONS = {
    "Gesundheit": "Health",
    "Ausdauer": "Endurance",
    "Abnehmen": "Weight loss",
    "Muskelaufbau": "Muscle gain",
    "Stressabbau": "Stress relief",
    "Spaß": "Fun",
    "Wettkampf": "Competition",
    "Naturerlebnis": "Being outdoors",
    "Soziale Kontakte": "Social",
}


def _migrate(locations: dict, muscles: dict, reasons: dict) -> None:
    conn = op.get_bind()

    stmt = sa.text("UPDATE runs SET location = :new WHERE location = :old")
    for old, new in locations.items():
        conn.execute(stmt, {"old": old, "new": new})

    rows = conn.execute(sa.text("SELECT id, muscle_reps FROM pushup_entries")).fetchall()
    for row_id, raw in rows:
        reps = json.loads(raw)
        renamed = {muscles.get(k, k): v for k, v in reps.items()}
        if renamed != reps:
            conn.execute(
                sa.text("UPDATE pushup_entries SET muscle_reps = :reps WHERE id = :id"),
                {"reps": json.dumps(renamed), "id": row_id},
            )

    rows = conn.execute(
        sa.text("SELECT id, sport_reasons FROM user_settings WHERE sport_reasons IS NOT NULL")
    ).fetchall()
    for row_id, raw in rows:
        saved = json.loads(raw)
        renamed = [reasons.get(r, r) for r in saved]
        if renamed != saved:
            conn.execute(
                sa.text("UPDATE user_settings SET sport_reasons = :reasons WHERE id = :id"),
                {"reasons": json.dumps(renamed, ensure_ascii=False), "id": row_id},
            )


def _invert(mapping: dict) -> dict:
    return {v: k for k, v in mapping.items()}


def upgrade() -> None:
    _migrate(LOCATIONS, MUSCLES, REASONS)


def downgrade() -> None:
    _migrate(_invert(LOCATIONS), _invert(MUSCLES), _invert(REASONS))
