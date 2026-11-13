from pathlib import Path

from alembic import command
from alembic.config import Config

from app.config import settings

BACKEND = Path(__file__).resolve().parent.parent


def test_migrations_run_and_match_the_models(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "db_url", f"sqlite:///{tmp_path}/migrations.db")
    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "alembic"))

    command.upgrade(config, "head")
    # Fails when models.py has changes without a migration ("alembic revision --autogenerate").
    command.check(config)
