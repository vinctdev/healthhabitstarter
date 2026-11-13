"""Health data providers (sleep, daily metrics, run cardio).

Pick one with `HEALTH_PROVIDER` in `.env`:
- `google`: Google Health API (Fitbit / Pixel Watch), see docs/google-health.md
- `demo`:   generated, deterministic demo data
- `none`:   no tracker; health features show an empty state
- `auto` (default): `google` if Google credentials are set, otherwise `none`

To add your own tracker, implement `HealthProvider` (base.py) and register it in PROVIDERS.
"""

from functools import lru_cache

from ..config import settings
from .base import DailyMetricsData, HealthProvider, ProviderStatus, RunCardioData, SleepData
from .demo import DemoProvider
from .google import GoogleHealthProvider
from .none import NoProvider

PROVIDERS: dict[str, type[HealthProvider]] = {
    "google": GoogleHealthProvider,
    "demo": DemoProvider,
    "none": NoProvider,
}

__all__ = [
    "DailyMetricsData",
    "HealthProvider",
    "ProviderStatus",
    "RunCardioData",
    "SleepData",
    "PROVIDERS",
    "get_health_provider",
]


@lru_cache
def get_health_provider() -> HealthProvider:
    name = settings.health_provider.strip().lower() or "auto"
    if name == "auto":
        name = "google" if settings.google_health_refresh_token else "none"
    if name not in PROVIDERS:
        raise ValueError(
            f"Unknown HEALTH_PROVIDER '{name}'. Choose one of: auto, {', '.join(PROVIDERS)}"
        )
    return PROVIDERS[name]()
