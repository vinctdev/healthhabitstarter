"""Demo provider: plausible, deterministic data without any tracker.

Every value is derived from a random generator seeded with the date (or run start), so the same
day always looks the same, no matter when it is requested or seeded. `app.demo_seed` uses the
same functions, which keeps seeded history and live "today" values consistent.

This file is also a compact template for writing your own provider.
"""

import json
import random
from datetime import date, datetime, timedelta

from ..timeutils import local_now, local_to_utc
from .base import (
    DailyMetricsData,
    HealthProvider,
    ProviderStatus,
    RunCardioData,
    SleepData,
    parse_day,
)

STEP_GOAL_RANGE = (6000, 14000)


def demo_sleep(day: date) -> SleepData:
    """A night of 4-6 sleep cycles ending on the morning of `day`."""
    rnd = random.Random(f"sleep-{day.isoformat()}")
    bed_local = datetime.combine(day - timedelta(days=1), datetime.min.time()) + timedelta(
        hours=23, minutes=rnd.randint(-40, 50)
    )
    start = local_to_utc(bed_local)
    fall_asleep = rnd.randint(6, 20)
    stages, t = [], start + timedelta(minutes=fall_asleep)
    minutes = {"DEEP": 0, "REM": 0, "LIGHT": 0, "AWAKE": 0}

    def add(stage: str, length: int) -> None:
        nonlocal t
        stages.append(
            {
                "type": stage,
                "start_time_utc": t.isoformat(),
                "end_time_utc": (t + timedelta(minutes=length)).isoformat(),
            }
        )
        minutes[stage] += length
        t += timedelta(minutes=length)

    for cycle in range(rnd.randint(4, 6)):
        for stage, lo, hi in (
            ("LIGHT", 20, 35),
            ("DEEP", 10 if cycle > 1 else 20, 30),
            ("LIGHT", 10, 20),
            ("REM", 10 + 5 * cycle, 20 + 5 * cycle),
        ):
            add(stage, rnd.randint(lo, hi))
        if rnd.random() < 0.4:
            add("AWAKE", rnd.randint(2, 8))

    asleep = minutes["DEEP"] + minutes["REM"] + minutes["LIGHT"]
    return SleepData(
        start_time_utc=start,
        end_time_utc=t,
        minutes_in_sleep_period=round((t - start).total_seconds() / 60),
        minutes_asleep=asleep,
        minutes_awake=minutes["AWAKE"],
        minutes_deep=minutes["DEEP"],
        minutes_rem=minutes["REM"],
        minutes_light=minutes["LIGHT"],
        minutes_to_fall_asleep=fall_asleep,
        minutes_after_wake_up=None,
        stages=stages,
        avg_heart_rate=round(rnd.uniform(50, 58), 1),
        skin_temperature_celsius=round(rnd.uniform(-0.4, 0.4), 2),
        baseline_temperature_celsius=34.1,
        respiratory_rate_avg=round(rnd.uniform(13.5, 15.5), 1),
    )


def demo_daily_metrics(day: date) -> DailyMetricsData:
    rnd = random.Random(f"metrics-{day.isoformat()}")
    steps = rnd.randint(*STEP_GOAL_RANGE)
    now = local_now()
    if day == now.date():
        # Steps accumulate between 07:00 and 22:00, so today's value grows while you watch.
        progress = min(1.0, max(0.0, (now.hour + now.minute / 60 - 7) / 15))
        steps = round(steps * progress)
    elif day > now.date():
        steps = None
    return DailyMetricsData(
        resting_heart_rate=float(rnd.randint(52, 60)),
        hrv_rmssd=round(rnd.uniform(38, 62), 1),
        hrv_entropy=round(rnd.uniform(2.6, 3.2), 2),
        spo2_avg=round(rnd.uniform(95.5, 97.5), 1),
        spo2_low=round(rnd.uniform(90, 93), 1),
        steps=steps,
    )


def demo_run_cardio(start_local: datetime, end_local: datetime) -> RunCardioData:
    rnd = random.Random(f"run-{start_local.isoformat(timespec='minutes')}")
    minutes = (end_local - start_local).total_seconds() / 60
    zones = {
        "light": round(minutes * 0.15, 1),
        "moderate": round(minutes * 0.45, 1),
        "vigorous": round(minutes * 0.35, 1),
        "peak": round(minutes * 0.05, 1),
    }
    azm = round(zones["moderate"] + 2 * (zones["vigorous"] + zones["peak"]))
    kcal = round(minutes * 11.5)
    return RunCardioData(
        avg_heart_rate=float(rnd.randint(148, 162)),
        active_zone_minutes=azm,
        calories_kcal=kcal,
        cardio_load=round(azm + kcal / 100.0, 1),
        heart_rate_zones=zones,
        steps=round(minutes * 165),
        raw=json.dumps({"source": "demo"}),
    )


class DemoProvider(HealthProvider):
    name = "demo"

    async def status(self) -> ProviderStatus:
        return ProviderStatus(connected=True, user_id="demo")

    async def sleep(self, day: str) -> SleepData | None:
        d = parse_day(day)
        return demo_sleep(d) if d <= local_now().date() else None

    async def daily_metrics(self, day: str) -> DailyMetricsData:
        return demo_daily_metrics(parse_day(day))

    async def run_cardio(self, start_local: datetime, end_local: datetime) -> RunCardioData | None:
        if start_local > local_now().replace(tzinfo=None):
            return None
        return demo_run_cardio(start_local, end_local)
