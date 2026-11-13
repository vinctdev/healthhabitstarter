from datetime import datetime

from app import timeutils
from app.config import settings


def test_fake_now_freezes_the_clock(monkeypatch):
    monkeypatch.setattr(settings, "fake_now", "2026-10-14T17:30:00Z")
    assert timeutils.local_now() == datetime.fromisoformat("2026-10-14T17:30:00+00:00")
    assert timeutils.active_date().isoformat() == "2026-10-14"


def test_fake_now_without_offset_is_local_time(monkeypatch):
    monkeypatch.setattr(settings, "fake_now", "2026-10-14T02:00:00")
    assert timeutils.local_now().tzinfo == timeutils.local_tz()
    assert timeutils.active_date().isoformat() == "2026-10-13"  # before the 04:00 day start


def test_fake_now_is_ignored_in_production(monkeypatch):
    monkeypatch.setattr(settings, "fake_now", "2000-01-01T00:00:00Z")
    monkeypatch.setattr(settings, "environment", "production")
    assert timeutils.local_now().year > 2000
