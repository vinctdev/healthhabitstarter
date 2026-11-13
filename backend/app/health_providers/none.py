"""Provider used when no health tracker is configured: no data, no errors."""

from datetime import datetime

from .base import DailyMetricsData, HealthProvider, ProviderStatus, RunCardioData, SleepData


class NoProvider(HealthProvider):
    name = "none"
    enabled = False

    async def status(self) -> ProviderStatus:
        return ProviderStatus(connected=False)

    async def sleep(self, day: str) -> SleepData | None:
        return None

    async def daily_metrics(self, day: str) -> DailyMetricsData:
        return DailyMetricsData()

    async def run_cardio(self, start_local: datetime, end_local: datetime) -> RunCardioData | None:
        return None
