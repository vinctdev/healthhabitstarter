"""Shared test setup.

Every test runs against a fresh SQLite database, without a health tracker and without AI.
The environment is set before `app` is imported, because settings and the engine are
created at import time.
"""

import os
import tempfile
from collections.abc import Callable
from datetime import datetime

os.environ.update(
    {
        "DB_URL": f"sqlite:///{tempfile.mkdtemp(prefix='hhs-tests-')}/test.db",
        "HEALTH_PROVIDER": "none",
        "GEMINI_API_KEY": "",  # also overrides a key from a local .env
        "TZ": "UTC",
    }
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import timeutils  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def schema():
    Base.metadata.create_all(engine)


@pytest.fixture(autouse=True)
def fresh_db(schema):
    """Empty all tables before each test (much faster than recreating them)."""
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def client():
    with TestClient(app) as test_client:  # runs the startup seeding
        yield test_client


@pytest.fixture
def set_now(monkeypatch) -> Callable[[datetime], None]:
    """Freeze the local clock used for the active day (`timeutils.local_now`)."""

    def _set(now: datetime) -> None:
        monkeypatch.setattr(
            timeutils, "local_now", lambda: now.replace(tzinfo=timeutils.local_tz())
        )

    return _set
