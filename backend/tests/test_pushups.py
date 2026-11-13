import json
from datetime import datetime
from pathlib import Path

import sqlalchemy as sa
from alembic import command
from alembic.config import Config

from app.config import settings

BACKEND = Path(__file__).resolve().parent.parent


def test_entries_are_logged_per_variant(client, set_now):
    set_now(datetime(2026, 11, 3, 12, 0))
    created = client.post(
        "/api/pushups/",
        json={"date": "2026-11-03", "variant_reps": {"standard": 20, "pike": 10}},
    )
    assert created.status_code == 200, created.text
    assert created.json()["total_reps"] == 30

    stats = client.get("/api/pushups/stats").json()
    today = {b["variant"]: b["reps"] for b in stats["breakdown_today"]}
    assert today == {"standard": 20, "wide": 0, "close": 0, "pike": 10}


def test_unknown_variant_is_rejected(client):
    response = client.post(
        "/api/pushups/", json={"date": "2026-11-03", "variant_reps": {"chest": 20}}
    )
    assert response.status_code == 422


def test_migration_maps_muscle_groups_to_variants(tmp_path, monkeypatch):
    db_url = f"sqlite:///{tmp_path}/migrations.db"
    monkeypatch.setattr(settings, "db_url", db_url)
    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "alembic"))

    command.upgrade(config, "c5a7d9e2f4b8")
    engine = sa.create_engine(db_url)
    with engine.begin() as conn:
        conn.execute(
            sa.text("INSERT INTO pushup_entries (date, muscle_reps) VALUES (:d, :r)"),
            {"d": "2026-11-01", "r": json.dumps({"chest": 20, "shoulders": 5, "triceps": 10})},
        )

    command.upgrade(config, "d1f6a3b9e2c7")
    with engine.connect() as conn:
        raw = conn.execute(sa.text("SELECT variant_reps FROM pushup_entries")).scalar_one()
    engine.dispose()
    assert json.loads(raw) == {"wide": 20, "pike": 5, "close": 10}
