# Adding your own health provider (Whoop, Garmin, Oura, ...)

Health Habit Starter ships with a Google Health provider (Fitbit, Pixel Watch). Connecting another
tracker such as Whoop, Garmin or Oura is possible, but it is a real project, not a setting: the
Google provider alone is about 700 lines, mostly API and OAuth handling.

This is a good task to hand to an AI coding assistant, see the prompt at the end.

## Before you start

The data classes in `base.py` were shaped after what Fitbit delivers. Compare your tracker's API
with them first:

- Fields your tracker does not provide stay `None`, and the app shows less. Readiness re-weights
  what is available.
- Without sleep stages (deep, REM, light) the sleep index comes out too low, because it counts
  deep and REM sleep.
- Heart rate zones use Fitbit's four zones, and `active_zone_minutes`, `cardio_load` and
  `hrv_entropy` are Fitbit metrics. Map what fits, leave the rest empty.

## How it fits together

```
backend/app/health_providers/
  base.py      HealthProvider interface + data classes (SleepData, DailyMetricsData, RunCardioData)
  google.py    Google Health API (OAuth refresh token)
  demo.py      generated data, the shortest complete example
  none.py      no tracker
  __init__.py  PROVIDERS registry + get_health_provider() (reads HEALTH_PROVIDER)
```

The routers (`routers/health_data.py`, `routers/runs.py`) call the active provider and store the
results in the database, so your provider is only asked once per past day.

## The interface

| Method | Returns | Used for |
|--------|---------|----------|
| `status()` | `ProviderStatus(connected, user_id, error)` | Connection badge in the Performance tab |
| `sleep(day)` | `SleepData` or `None` | Sleep analysis, sleep index, readiness, energy curve |
| `daily_metrics(day)` | `DailyMetricsData` | Resting HR, HRV, SpO2, steps (readiness) |
| `run_cardio(start_local, end_local)` | `RunCardioData` or `None` | Heart rate zones of a logged run |
| `daily_steps(days_back)` | list of `{date, steps}` | Optional, defaults to `daily_metrics` per day |

Rules (also in `base.py`):

- Timestamps in UTC, days as local `YYYY-MM-DD`. `sleep(day)` is the night that **ends** on `day`.
- Leave fields `None` that your tracker does not provide, see [Before you start](#before-you-start).
- Return `None`/empty data when nothing was recorded. Raise `fastapi.HTTPException(502, ...)` only
  for real failures (expired token, API down).

## Steps

1. Create `backend/app/health_providers/<name>.py` with a class that extends `HealthProvider`
   and sets `name = "<name>"`. Start from `demo.py` (structure) and `google.py` (OAuth token
   caching, HTTP calls).
2. Register it in `PROVIDERS` in `health_providers/__init__.py`.
3. Add your credentials to `backend/app/config.py` (e.g. `whoop_refresh_token: str = ""`) and
   document them in `.env.example`.
4. Set `HEALTH_PROVIDER=<name>` in `.env` and restart the backend.
5. Optional: add a display name to `PROVIDER_LABELS` in
   `frontend/src/components/PerformanceView.tsx` (otherwise the raw name is shown).
6. Check the Performance tab and `http://localhost:8000/docs` → `/api/health-data/*`.

Developer portals: [Whoop](https://developer.whoop.com/), [Oura](https://cloud.ouraring.com/v2/docs),
[Garmin](https://developer.garmin.com/gc-developer-program/) (Garmin's Health API requires an
approved developer account).

## Prompt for your AI agent

> Add a health provider for **<tracker>** to this project. Read
> `backend/app/health_providers/base.py`, `demo.py` and `google.py` first. Then compare the
> <tracker> API with the data classes in `base.py` and list what is missing or different. Wait for
> my OK before implementing. Then implement
> `backend/app/health_providers/<tracker>.py` using the official <tracker> API (<link to API docs>).
> Map its sleep, recovery/HRV, resting heart rate, SpO2, steps and workout data to the data
> classes in `base.py`, leave unavailable fields `None`, register the provider in `PROVIDERS`, add
> the credentials to `config.py` and `.env.example`, and follow `docs/adding-a-health-provider.md`.
