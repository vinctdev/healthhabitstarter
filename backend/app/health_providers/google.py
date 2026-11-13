"""Google Health API provider (Fitbit and Pixel Watch data).

Auth: OAuth2 refresh token flow. The refresh token lives in the environment, the short-lived
access token is cached in memory. Setup: docs/google-health.md.
"""

import asyncio
import json
import time
from datetime import UTC, datetime, timedelta

import httpx
from fastapi import HTTPException

from ..config import settings
from ..timeutils import local_now
from .base import DailyMetricsData, HealthProvider, ProviderStatus, RunCardioData, SleepData

TOKEN_URL = "https://oauth2.googleapis.com/token"
HEALTH_API_BASE = "https://health.googleapis.com"

_cached_token: str | None = None
_token_expires_at: float = 0.0
_token_lock = asyncio.Lock()


async def get_access_token() -> str:
    global _cached_token, _token_expires_at

    if _cached_token and time.time() < _token_expires_at - 60:
        return _cached_token

    async with _token_lock:
        if _cached_token and time.time() < _token_expires_at - 60:
            return _cached_token

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(
                    TOKEN_URL,
                    data={
                        "client_id": settings.google_health_client_id,
                        "client_secret": settings.google_health_client_secret,
                        "refresh_token": settings.google_health_refresh_token,
                        "grant_type": "refresh_token",
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=502,
                        detail=f"Token refresh failed: HTTP {response.status_code}",
                    )
                data = response.json()
                access_token = data.get("access_token")
                expires_in = data.get("expires_in", 3599)
                if not access_token:
                    raise HTTPException(
                        status_code=502,
                        detail="Token refresh: no access_token in the response",
                    )
                _cached_token = access_token
                _token_expires_at = time.time() + expires_in
                return access_token
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"Token refresh failed: {e}",
            ) from e


async def get_health_identity() -> dict:
    access_token = await get_access_token()
    url = f"{HEALTH_API_BASE}/v4/users/me/identity"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"Google Health API identity call failed: HTTP {response.status_code}",
                )
            return response.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Google Health API identity call failed: {e}",
        ) from e


async def get_health_steps(days_back: int = 1) -> list[dict[str, object]]:
    access_token = await get_access_token()
    today = local_now().date()
    end = today + timedelta(days=1)
    start = today - timedelta(days=days_back - 1)
    url = f"{HEALTH_API_BASE}/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp"
    body = {
        "range": {
            "start": {"date": {"year": start.year, "month": start.month, "day": start.day}},
            "end": {"date": {"year": end.year, "month": end.month, "day": end.day}},
        },
        "windowSizeDays": 1,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                url,
                json=body,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"Google Health API steps call failed: HTTP {response.status_code}",
                )
            data = response.json()
            result: list[dict[str, object]] = []
            for dp in data.get("rollupDataPoints", []):
                steps_data = dp.get("steps", {})
                count = int(steps_data.get("countSum", 0))
                civil_start = dp.get("civilStartTime", {})
                civil_date = civil_start.get("date", {})
                day_str = f"{civil_date.get('year', 0)}-{civil_date.get('month', 0):02d}-{civil_date.get('day', 0):02d}"
                result.append({"date": day_str, "steps": count})
            return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Google Health API steps call failed: {e}",
        ) from e


def _parse_google_datetime(dt_str: str) -> datetime:
    return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))


async def get_health_sleep(date_str: str) -> dict | None:
    access_token = await get_access_token()
    date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
    next_day = (date_obj + timedelta(days=1)).isoformat()

    url = f"{HEALTH_API_BASE}/v4/users/me/dataTypes/sleep/dataPoints"
    params = {
        "filter": f'sleep.interval.civil_end_time >= "{date_str}" AND sleep.interval.civil_end_time < "{next_day}"',
        "pageSize": 25,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                url,
                params=params,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"Google Health API sleep call failed: HTTP {response.status_code}",
                )
            data = response.json()
            points = data.get("dataPoints", [])

            if not points:
                return None

            non_naps = []
            for dp in points:
                sleep = dp.get("sleep", {})
                if not sleep:
                    continue
                metadata = sleep.get("metadata", {})
                if metadata.get("nap"):
                    continue
                non_naps.append(sleep)

            if not non_naps:
                return None

            merged_start = None
            merged_end = None
            merged_minutes_asleep = 0
            merged_minutes_deep = 0
            merged_minutes_rem = 0
            merged_minutes_light = 0
            merged_minutes_to_fall_asleep = None
            merged_minutes_after_wake_up = None
            all_stages = []

            earliest_session = None
            latest_session = None

            for sleep in non_naps:
                interval = sleep.get("interval", {})
                start_str = interval.get("startTime", "")
                end_str = interval.get("endTime", "")
                if not start_str or not end_str:
                    continue

                start_dt = _parse_google_datetime(start_str)
                end_dt = _parse_google_datetime(end_str)

                if merged_start is None or start_dt < merged_start:
                    merged_start = start_dt
                    earliest_session = sleep
                if merged_end is None or end_dt > merged_end:
                    merged_end = end_dt
                    latest_session = sleep

                summary = sleep.get("summary", {})
                merged_minutes_asleep += int(summary.get("minutesAsleep", 0))

                for ss in summary.get("stagesSummary", []):
                    stype = ss.get("type", "")
                    mins = int(ss.get("minutes", 0))
                    if stype == "DEEP":
                        merged_minutes_deep += mins
                    elif stype == "REM":
                        merged_minutes_rem += mins
                    elif stype == "LIGHT":
                        merged_minutes_light += mins

                for stage in sleep.get("stages", []):
                    all_stages.append(
                        {
                            "type": stage.get("type", "UNKNOWN"),
                            "start_time_utc": _parse_google_datetime(
                                stage.get("startTime", "")
                            ).isoformat(),
                            "end_time_utc": _parse_google_datetime(
                                stage.get("endTime", "")
                            ).isoformat(),
                        }
                    )

            if merged_start is None or merged_end is None:
                return None

            all_stages.sort(key=lambda s: s["start_time_utc"])

            if earliest_session:
                es = earliest_session.get("summary", {})
                val = int(es.get("minutesToFallAsleep") or 0)
                merged_minutes_to_fall_asleep = val if val > 0 else None
            if latest_session:
                ls = latest_session.get("summary", {})
                val = int(ls.get("minutesAfterWakeUp") or 0)
                merged_minutes_after_wake_up = val if val > 0 else None

            minutes_in_sleep_period = int((merged_end - merged_start).total_seconds() / 60)
            minutes_awake = max(0, minutes_in_sleep_period - merged_minutes_asleep)

            return {
                "start_time_utc": merged_start,
                "end_time_utc": merged_end,
                "minutes_in_sleep_period": minutes_in_sleep_period,
                "minutes_awake": minutes_awake,
                "minutes_asleep": merged_minutes_asleep,
                "minutes_to_fall_asleep": merged_minutes_to_fall_asleep,
                "minutes_after_wake_up": merged_minutes_after_wake_up,
                "minutes_deep": merged_minutes_deep,
                "minutes_rem": merged_minutes_rem,
                "minutes_light": merged_minutes_light,
                "stages": all_stages,
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Google Health API sleep call failed: {e}",
        ) from e


async def get_daily_sleep_temperature(date_str: str) -> dict | None:
    access_token = await get_access_token()
    date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
    next_day = (date_obj + timedelta(days=1)).isoformat()

    url = f"{HEALTH_API_BASE}/v4/users/me/dataTypes/daily-sleep-temperature-derivations/dataPoints"
    params = {
        "filter": f'daily_sleep_temperature_derivations.date >= "{date_str}" AND daily_sleep_temperature_derivations.date < "{next_day}"',
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                url,
                params=params,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if response.status_code != 200:
                return None
            data = response.json()
            points = data.get("dataPoints", [])
            if not points:
                return None

            dp = points[0]
            temp_data = dp.get("dailySleepTemperatureDerivations", {})
            if not temp_data:
                return None

            return {
                "skin_temperature_celsius": temp_data.get("nightlyTemperatureCelsius"),
                "baseline_temperature_celsius": temp_data.get("baselineTemperatureCelsius"),
            }
    except Exception:
        return None


async def get_daily_respiratory_rate(date_str: str) -> dict | None:
    access_token = await get_access_token()
    date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
    next_day = (date_obj + timedelta(days=1)).isoformat()

    url = f"{HEALTH_API_BASE}/v4/users/me/dataTypes/respiratory-rate-sleep-summary/dataPoints"
    params = {
        "filter": f'respiratory_rate_sleep_summary.sample_time.civil_time >= "{date_str}" AND respiratory_rate_sleep_summary.sample_time.civil_time < "{next_day}"',
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                url,
                params=params,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if response.status_code != 200:
                return None
            data = response.json()
            points = data.get("dataPoints", [])
            if not points:
                return None

            dp = points[0]
            resp_data = dp.get("respiratoryRateSleepSummary", {})
            if not resp_data:
                return None

            full_stats = resp_data.get("fullSleepStats", {})
            deep_stats = resp_data.get("deepSleepStats", {})
            light_stats = resp_data.get("lightSleepStats", {})
            rem_stats = resp_data.get("remSleepStats", {})

            return {
                "respiratory_rate_avg": full_stats.get("breathsPerMinute"),
                "respiratory_rate_deep": deep_stats.get("breathsPerMinute"),
                "respiratory_rate_light": light_stats.get("breathsPerMinute"),
                "respiratory_rate_rem": rem_stats.get("breathsPerMinute"),
            }
    except Exception:
        return None


async def get_heart_rate_avg_for_interval(
    start_time_utc: datetime, end_time_utc: datetime
) -> float | None:
    access_token = await get_access_token()
    start_str = start_time_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    end_str = end_time_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    url = f"{HEALTH_API_BASE}/v4/users/me/dataTypes/heart-rate/dataPoints"
    params = {
        "filter": f'heart_rate.sample_time.physical_time >= "{start_str}" AND heart_rate.sample_time.physical_time < "{end_str}"',
        "pageSize": 1000,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                url,
                params=params,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if response.status_code != 200:
                return None
            data = response.json()
            points = data.get("dataPoints", [])

            total_bpm = 0.0
            count = 0
            for dp in points:
                hr = dp.get("heartRate", {})
                bpm_str = hr.get("beatsPerMinute")
                if bpm_str is not None:
                    total_bpm += float(bpm_str)
                    count += 1

            if count == 0:
                return None

            return round(total_bpm / count, 1)
    except Exception:
        return None


async def get_daily_resting_heart_rate(date_str: str) -> int | None:
    access_token = await get_access_token()
    date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
    next_day = (date_obj + timedelta(days=1)).isoformat()
    url = f"{HEALTH_API_BASE}/v4/users/me/dataTypes/daily-resting-heart-rate/dataPoints"
    params = {
        "filter": f'daily_resting_heart_rate.date >= "{date_str}" AND daily_resting_heart_rate.date < "{next_day}"',
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                url,
                params=params,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if response.status_code != 200:
                return None
            data = response.json()
            points = data.get("dataPoints", [])
            if not points:
                return None
            hr_data = points[0].get("dailyRestingHeartRate", {})
            bpm_val = hr_data.get("beatsPerMinute")
            return int(bpm_val) if bpm_val is not None else None
    except Exception:
        return None


async def get_daily_heart_rate_variability(date_str: str) -> dict | None:
    access_token = await get_access_token()
    date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
    next_day = (date_obj + timedelta(days=1)).isoformat()
    url = f"{HEALTH_API_BASE}/v4/users/me/dataTypes/daily-heart-rate-variability/dataPoints"
    params = {
        "filter": f'daily_heart_rate_variability.date >= "{date_str}" AND daily_heart_rate_variability.date < "{next_day}"',
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                url,
                params=params,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if response.status_code != 200:
                return None
            data = response.json()
            points = data.get("dataPoints", [])
            if not points:
                return None
            hrv_data = points[0].get("dailyHeartRateVariability", {})
            rmssd = hrv_data.get("averageHeartRateVariabilityMilliseconds")
            entropy = hrv_data.get("entropy")
            return {
                "rmssd": round(rmssd, 1) if rmssd is not None else None,
                "entropy": round(entropy, 2) if entropy is not None else None,
            }
    except Exception:
        return None


async def get_daily_oxygen_saturation(date_str: str) -> dict | None:
    access_token = await get_access_token()
    date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
    next_day = (date_obj + timedelta(days=1)).isoformat()
    url = f"{HEALTH_API_BASE}/v4/users/me/dataTypes/daily-oxygen-saturation/dataPoints"
    params = {
        "filter": f'daily_oxygen_saturation.date >= "{date_str}" AND daily_oxygen_saturation.date < "{next_day}"',
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                url,
                params=params,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if response.status_code != 200:
                return None
            data = response.json()
            points = data.get("dataPoints", [])
            if not points:
                return None
            spo2_data = points[0].get("dailyOxygenSaturation", {})
            avg_val = spo2_data.get("averagePercentage")
            low_val = spo2_data.get("lowerBoundPercentage")
            return {
                "avg": round(avg_val, 1) if avg_val is not None else None,
                "low": round(low_val, 1) if low_val is not None else None,
            }
    except Exception:
        return None


def _parse_google_duration_to_minutes(duration_str: str) -> float:
    if not duration_str or not duration_str.endswith("s"):
        return 0.0
    return float(duration_str.rstrip("s")) / 60.0


def _parse_utc_offset(offset_str: str) -> float:
    if not offset_str or not offset_str.endswith("s"):
        return 0.0
    return float(offset_str.rstrip("s"))


async def get_exercise_cardio_for_time_range(
    start_time_local: datetime,
    end_time_local: datetime,
) -> dict | None:
    access_token = await get_access_token()
    search_start = (start_time_local - timedelta(minutes=60)).strftime("%Y-%m-%dT%H:%M")
    search_end = (end_time_local + timedelta(minutes=60)).strftime("%Y-%m-%dT%H:%M")

    url = f"{HEALTH_API_BASE}/v4/users/me/dataTypes/exercise/dataPoints"
    params = {
        "filter": (
            f'exercise.interval.civil_start_time >= "{search_start}"'
            f' AND exercise.interval.civil_start_time < "{search_end}"'
        ),
        "pageSize": 25,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                url,
                params=params,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if response.status_code != 200:
                return None
            data = response.json()
            points = data.get("dataPoints", [])
            if not points:
                return None

            run_exercise_types = {"RUNNING", "TRAIL_RUN"}
            best_overlap = 0
            best_exercise = None

            for dp in points:
                exercise = dp.get("exercise", {})
                if not exercise:
                    continue
                ex_type = exercise.get("exerciseType", "")
                if ex_type not in run_exercise_types:
                    continue

                interval = exercise.get("interval", {})
                ex_start_str = interval.get("startTime", "")
                ex_end_str = interval.get("endTime", "")
                offset_str = interval.get("startUtcOffset", "0s")

                if not ex_start_str or not ex_end_str:
                    continue

                offset_seconds = _parse_utc_offset(offset_str)
                ex_start_utc = _parse_google_datetime(ex_start_str)
                ex_end_utc = _parse_google_datetime(ex_end_str)

                run_start_utc = (start_time_local - timedelta(seconds=offset_seconds)).replace(
                    tzinfo=UTC
                )
                run_end_utc = (end_time_local - timedelta(seconds=offset_seconds)).replace(
                    tzinfo=UTC
                )

                overlap_start = max(run_start_utc, ex_start_utc)
                overlap_end = min(run_end_utc, ex_end_utc)

                overlap = (overlap_end - overlap_start).total_seconds()
                if overlap > best_overlap:
                    best_overlap = overlap
                    best_exercise = exercise

            if best_exercise is None:
                return None

            metrics = best_exercise.get("metricsSummary", {})

            avg_hr_str = metrics.get("averageHeartRateBeatsPerMinute")
            avg_hr = float(avg_hr_str) if avg_hr_str is not None else None

            azm_str = metrics.get("activeZoneMinutes")
            azm = float(azm_str) if azm_str is not None else None

            cals = metrics.get("caloriesKcal")

            zones_data = metrics.get("heartRateZoneDurations", {})
            heart_rate_zones = {
                "light": _parse_google_duration_to_minutes(zones_data.get("lightTime", "")),
                "moderate": _parse_google_duration_to_minutes(zones_data.get("moderateTime", "")),
                "vigorous": _parse_google_duration_to_minutes(zones_data.get("vigorousTime", "")),
                "peak": _parse_google_duration_to_minutes(zones_data.get("peakTime", "")),
            }

            steps_str = metrics.get("steps")
            steps = int(steps_str) if steps_str is not None else None

            cardio_load = None
            if azm is not None and cals is not None:
                cardio_load = round(azm + cals / 100.0, 1)

            return {
                "avg_heart_rate": avg_hr,
                "active_zone_minutes": azm,
                "calories_kcal": cals,
                "cardio_load": cardio_load,
                "heart_rate_zones": heart_rate_zones,
                "steps": steps,
                "exercise_data": json.dumps(best_exercise, default=str),
            }
    except HTTPException:
        raise
    except Exception:
        return None


async def get_steps_for_date(date_str: str) -> int | None:
    access_token = await get_access_token()
    date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
    next_day = date_obj + timedelta(days=1)
    url = f"{HEALTH_API_BASE}/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp"
    body = {
        "range": {
            "start": {
                "date": {"year": date_obj.year, "month": date_obj.month, "day": date_obj.day}
            },
            "end": {"date": {"year": next_day.year, "month": next_day.month, "day": next_day.day}},
        },
        "windowSizeDays": 1,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                url,
                json=body,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )
            if response.status_code != 200:
                return None
            data = response.json()
            rollups = data.get("rollupDataPoints", [])
            if not rollups:
                return None
            steps_data = rollups[0].get("steps", {})
            count = steps_data.get("countSum")
            return int(count) if count is not None else None
    except Exception:
        return None


class GoogleHealthProvider(HealthProvider):
    name = "google"

    async def status(self) -> ProviderStatus:
        try:
            identity = await get_health_identity()
            return ProviderStatus(connected=True, user_id=identity.get("healthUserId"))
        except Exception as e:
            return ProviderStatus(connected=False, error=str(getattr(e, "detail", e)))

    async def sleep(self, day: str) -> SleepData | None:
        data = await get_health_sleep(day)
        if data is None:
            return None
        temp, resp = await asyncio.gather(
            get_daily_sleep_temperature(day), get_daily_respiratory_rate(day)
        )
        hr = await get_heart_rate_avg_for_interval(data["start_time_utc"], data["end_time_utc"])
        return SleepData(**data, avg_heart_rate=hr, **(temp or {}), **(resp or {}))

    async def daily_metrics(self, day: str) -> DailyMetricsData:
        hr, hrv, spo2, steps = await asyncio.gather(
            get_daily_resting_heart_rate(day),
            get_daily_heart_rate_variability(day),
            get_daily_oxygen_saturation(day),
            get_steps_for_date(day),
        )
        return DailyMetricsData(
            resting_heart_rate=float(hr) if hr is not None else None,
            hrv_rmssd=hrv["rmssd"] if hrv else None,
            hrv_entropy=hrv["entropy"] if hrv else None,
            spo2_avg=spo2["avg"] if spo2 else None,
            spo2_low=spo2["low"] if spo2 else None,
            steps=steps,
        )

    async def run_cardio(self, start_local: datetime, end_local: datetime) -> RunCardioData | None:
        data = await get_exercise_cardio_for_time_range(start_local, end_local)
        if data is None:
            return None
        raw = data.pop("exercise_data", None)
        return RunCardioData(**data, raw=raw)

    async def daily_steps(self, days_back: int) -> list[dict]:
        return await get_health_steps(days_back=days_back)
