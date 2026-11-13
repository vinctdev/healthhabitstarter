"""Time zone helpers.

Timestamps from health providers are stored as naive UTC datetimes. The user's local
time zone comes from the `TZ` environment variable (IANA name, e.g. "Europe/Berlin").
"""

from datetime import UTC, date, datetime, timedelta
from functools import lru_cache
from zoneinfo import ZoneInfo

from .config import settings


@lru_cache
def local_tz() -> ZoneInfo:
    return ZoneInfo(settings.tz)


def utc_to_local(dt: datetime) -> datetime:
    """Convert a naive (or aware) UTC datetime to the configured local time zone."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(local_tz())


def local_to_utc(dt: datetime) -> datetime:
    """Convert a naive local datetime to a naive UTC datetime (as stored in the DB)."""
    return dt.replace(tzinfo=local_tz()).astimezone(UTC).replace(tzinfo=None)


def local_now() -> datetime:
    if settings.fake_now and settings.environment != "production":
        fake = datetime.fromisoformat(settings.fake_now)
        if fake.tzinfo is None:
            return fake.replace(tzinfo=local_tz())
        return fake.astimezone(local_tz())
    return datetime.now(local_tz())


# A "day" starts at this local hour, so late-night entries still count for the previous day.
DEFAULT_DAY_START_HOUR = 4


def active_date(day_start_hour: int = DEFAULT_DAY_START_HOUR) -> date:
    """The current day, taking the configurable day boundary into account."""
    now = local_now()
    if now.hour < day_start_hour:
        now -= timedelta(days=1)
    return now.date()
