"""The interface every health data provider implements.

A provider turns one data source (Google Health, a demo generator, your own Whoop/Garmin/Oura
integration, ...) into the plain data classes below. The routers only talk to this interface,
cache the results in the database and never see provider-specific formats.

Rules for implementations:
- Timestamps are UTC (naive or tz-aware). Dates are local calendar days as "YYYY-MM-DD".
- Every field that the source cannot deliver stays `None`. Do not invent values.
- Return `None` (or empty data) when nothing was recorded; raise `fastapi.HTTPException`
  (usually 502) only for real failures such as an expired token, so the UI can show them.

See docs/adding-a-health-provider.md for a walkthrough.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta


@dataclass
class ProviderStatus:
    connected: bool
    user_id: str | None = None
    error: str | None = None


@dataclass
class SleepData:
    """The main sleep of the night that ends on the requested day (naps excluded)."""

    start_time_utc: datetime
    end_time_utc: datetime
    minutes_in_sleep_period: int
    minutes_asleep: int
    minutes_awake: int
    minutes_deep: int
    minutes_rem: int
    minutes_light: int
    minutes_to_fall_asleep: int | None = None
    minutes_after_wake_up: int | None = None
    # Hypnogram: [{"type": "LIGHT"|"DEEP"|"REM"|"AWAKE", "start_time_utc": iso, "end_time_utc": iso}]
    stages: list[dict] = field(default_factory=list)
    avg_heart_rate: float | None = None
    skin_temperature_celsius: float | None = None  # deviation from the baseline
    baseline_temperature_celsius: float | None = None
    respiratory_rate_avg: float | None = None  # breaths per minute
    respiratory_rate_deep: float | None = None
    respiratory_rate_light: float | None = None
    respiratory_rate_rem: float | None = None


@dataclass
class DailyMetricsData:
    resting_heart_rate: float | None = None  # bpm
    hrv_rmssd: float | None = None  # ms
    hrv_entropy: float | None = None
    spo2_avg: float | None = None  # percent
    spo2_low: float | None = None  # percent
    steps: int | None = None


@dataclass
class RunCardioData:
    """Heart rate data of a tracked run, matched to a manually logged run."""

    avg_heart_rate: float | None = None
    active_zone_minutes: float | None = None
    calories_kcal: float | None = None
    cardio_load: float | None = None
    # Minutes per zone: {"light": .., "moderate": .., "vigorous": .., "peak": ..}
    heart_rate_zones: dict[str, float] | None = None
    steps: int | None = None
    raw: str | None = None  # optional raw JSON from the source, stored for later analysis


class HealthProvider(ABC):
    name: str = ""
    # False for the "none" provider: the routers then skip fetching and caching entirely.
    enabled: bool = True

    @abstractmethod
    async def status(self) -> ProviderStatus:
        """Check that the source is reachable (e.g. credentials are valid)."""

    @abstractmethod
    async def sleep(self, day: str) -> SleepData | None:
        """Main sleep of the night ending on `day`, or None if there was none."""

    @abstractmethod
    async def daily_metrics(self, day: str) -> DailyMetricsData:
        """Resting heart rate, HRV, SpO2 and steps for `day`. Today's values may still change."""

    @abstractmethod
    async def run_cardio(self, start_local: datetime, end_local: datetime) -> RunCardioData | None:
        """Cardio data of the run recorded in this local time window, or None if no run matches."""

    async def daily_steps(self, days_back: int) -> list[dict]:
        """Steps of the last `days_back` days as [{"date": "YYYY-MM-DD", "steps": int}].

        The default asks `daily_metrics` once per day; override it if the source has a cheaper call.
        """
        from ..timeutils import local_now

        today = local_now().date()
        result = []
        for offset in range(days_back - 1, -1, -1):
            day = (today - timedelta(days=offset)).isoformat()
            metrics = await self.daily_metrics(day)
            result.append({"date": day, "steps": metrics.steps or 0})
        return result


def parse_day(day: str) -> date:
    return datetime.strptime(day, "%Y-%m-%d").date()
