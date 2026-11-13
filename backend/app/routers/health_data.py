import math
import re
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..health_providers import get_health_provider
from ..models import (
    DailyMetric,
    EnergyAdjustment,
    FoodEntry,
    Run,
    RunCardio,
    SleepSession,
    UserSettings,
)
from ..schemas.health import (
    DailyMetricsResponse,
    EnergyCurveResponse,
    EnergyDataPoint,
    EnergyInfluence,
    HealthStatusResponse,
    HealthStepsResponse,
    PeakWindow,
    ReadinessBreakdown,
    ReadinessComponent,
    SleepAveragesResponse,
    SleepSessionResponse,
    SleepStageSegment,
)
from ..timeutils import local_now, utc_to_local

# --- Energy curve (explained in docs/energy-model.md) ---------------------------------------

# Whole words, so "chocolate" does not match "cola" and "tomate" does not match "mate".
# "kaffee" is matched as a substring to catch German compounds like "Milchkaffee".
CAFFEINE_PATTERN = re.compile(
    r"\b(coffee|espresso|cappuccino|latte|americano|macchiato|flat white|cold brew|"
    r"black tea|green tea|matcha|cola|energy drink|mate)\b|kaffee"
)
CAFFEINE_MAGNITUDE = 15.0
CAFFEINE_HALF_LIFE_H = 5.0
# Caffeine counts as worn off once its effect has dropped to this fraction.
CAFFEINE_EFFECT_END_FRACTION = 0.25

# Food entries within this window count as one meal.
MEAL_GROUP_WINDOW_MIN = 30

# Daily rhythm over the waking hours (progress 0 = wake-up, 1 = bedtime)
FIRST_PEAK_PROGRESS = 0.22
DIP_PROGRESS = 0.44
SECOND_PEAK_PROGRESS = 0.625
AMP_FIRST_PEAK = 85.0
AMP_DIP = 38.0
AMP_SECOND_PEAK = 61.0

# Readiness scales the rhythm so the morning peak reaches the readiness score.
# Low readiness also makes energy fade faster: at readiness 0 the curve would lose
# this share by bedtime (at readiness 100 nothing).
LOW_READINESS_FADE = 0.5

# Carb-heavy meal: carbs supply more than this share of its calories and reach this
# amount, so a sugared coffee doesn't count.
CARB_HEAVY_SHARE = 0.6
CARB_HEAVY_MIN_G = 30.0
SUGAR_SPIKE_MAG = 10.0
SUGAR_SPIKE_DUR = 0.5
SUGAR_CRASH_MAG = -20.0
SUGAR_CRASH_DUR = 2.0

# Large meal: dip after eating.
LARGE_MEAL_KCAL = 800.0
MEAL_DIP_MAG = -10.0
MEAL_DIP_DELAY_H = 0.5
MEAL_DIP_DUR = 1.5

# A run is hard with a perceived effort from EFFORT_HARD (1-10) or a cardio load above
# CARDIO_LOAD_HARD; without either it counts as light.
EFFORT_HARD = 7
CARDIO_LOAD_HARD = 30.0
HARD_DROP_MAG = -20.0
HARD_DROP_DUR = 1.0
HARD_BASE_DRAIN = -5.0
LIGHT_BOOST_MAG = 5.0
LIGHT_BOOST_DUR = 2.0

# Each hour of the curve shows the average effect of the influences during that hour.
SAMPLES_PER_HOUR = 12


def _fmt_hour(h: float) -> str:
    h = h % 24
    hh = int(h)
    mm = int((h - hh) * 60)
    return f"{hh:02d}:{mm:02d}"


# Readiness = weighted average of the available signals (each scored 0-100).
# Missing signals are left out and their weight is shared among the others.
# See docs/energy-model.md.
READINESS_WEIGHTS = {
    "sleep": 40.0,
    "hrv": 30.0,
    "rhr": 30.0,
}

# HRV and resting HR are compared with the personal average of the last 90 days:
# equal to the average scores 50, PERSONAL_RANGE_PCT % better scores 100, as much worse scores 0.
BASELINE_WINDOW_DAYS = 90
BASELINE_MIN_READINGS = 5
PERSONAL_RANGE_PCT = 20.0

# Fixed scales until there are enough readings for a personal average: (value for 0, value for 100)
HRV_FIXED_SCALE = (20.0, 80.0)  # ms
RHR_FIXED_SCALE = (80.0, 45.0)  # bpm

router = APIRouter(prefix="/api/health-data", tags=["health-data"])


@router.get("/status", response_model=HealthStatusResponse)
async def health_data_status():
    provider = get_health_provider()
    status = await provider.status()
    return HealthStatusResponse(
        provider=provider.name,
        connected=status.connected,
        health_user_id=status.user_id,
        error=status.error,
    )


@router.get("/steps", response_model=HealthStepsResponse)
async def health_data_steps(days: int = Query(default=1, ge=1, le=30)):
    steps = await get_health_provider().daily_steps(days)
    return HealthStepsResponse(days=steps)


def _compute_sleep_index(
    minutes_in_sleep_period: int,
    minutes_asleep: int,
    minutes_deep: int,
    minutes_rem: int,
    minutes_awake: int,
    avg_heart_rate: float | None = None,
) -> int:
    if minutes_in_sleep_period <= 0 or minutes_asleep <= 0:
        return 0

    D = minutes_asleep / 60.0
    W = minutes_awake / 60.0
    P = (minutes_deep + minutes_rem) / 60.0
    H = avg_heart_rate if avg_heart_rate is not None else 50.0

    total = 50.0 + (D * 3.5) - (W * 2.0) + (P * 2.5) - ((H - 50.0) * 1.5)
    return max(0, min(100, round(total)))


@router.get("/sleep", response_model=SleepSessionResponse)
async def health_data_sleep(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
):
    existing = db.query(SleepSession).filter(SleepSession.date == date).first()
    if existing:
        stages = []
        if existing.stages_data:
            import json

            stages_raw = json.loads(existing.stages_data)
            from datetime import datetime

            stages = [
                SleepStageSegment(
                    type=s["type"],
                    start_time_utc=datetime.fromisoformat(s["start_time_utc"]),
                    end_time_utc=datetime.fromisoformat(s["end_time_utc"]),
                )
                for s in stages_raw
            ]

        sleep_index = _compute_sleep_index(
            existing.minutes_in_sleep_period,
            existing.minutes_asleep,
            existing.minutes_deep,
            existing.minutes_rem,
            existing.minutes_awake,
            existing.avg_heart_rate,
        )

        return SleepSessionResponse(
            date=existing.date,
            sleep_index=sleep_index,
            start_time_utc=existing.start_time_utc,
            end_time_utc=existing.end_time_utc,
            minutes_in_sleep_period=existing.minutes_in_sleep_period,
            minutes_awake=existing.minutes_awake,
            minutes_asleep=existing.minutes_asleep,
            minutes_to_fall_asleep=existing.minutes_to_fall_asleep,
            minutes_after_wake_up=existing.minutes_after_wake_up,
            minutes_deep=existing.minutes_deep,
            minutes_rem=existing.minutes_rem,
            minutes_light=existing.minutes_light,
            stages=stages,
            skin_temperature_celsius=existing.skin_temperature_celsius,
            baseline_temperature_celsius=existing.baseline_temperature_celsius,
            respiratory_rate_avg=existing.respiratory_rate_avg,
            respiratory_rate_deep=existing.respiratory_rate_deep,
            respiratory_rate_light=existing.respiratory_rate_light,
            respiratory_rate_rem=existing.respiratory_rate_rem,
            avg_heart_rate=existing.avg_heart_rate,
        )

    sleep_data = await get_health_provider().sleep(date)
    if sleep_data is None:
        return SleepSessionResponse(
            date=date,
            sleep_index=0,
            start_time_utc=None,
            end_time_utc=None,
            minutes_in_sleep_period=0,
            minutes_awake=0,
            minutes_asleep=0,
            minutes_to_fall_asleep=None,
            minutes_after_wake_up=None,
            minutes_deep=0,
            minutes_rem=0,
            minutes_light=0,
            stages=[],
        )

    import json

    stages_json = json.dumps(sleep_data.stages) if sleep_data.stages else None

    sleep_index = _compute_sleep_index(
        sleep_data.minutes_in_sleep_period,
        sleep_data.minutes_asleep,
        sleep_data.minutes_deep,
        sleep_data.minutes_rem,
        sleep_data.minutes_awake,
        sleep_data.avg_heart_rate,
    )

    session = SleepSession(
        date=date,
        sleep_index=sleep_index,
        start_time_utc=sleep_data.start_time_utc.replace(tzinfo=None),
        end_time_utc=sleep_data.end_time_utc.replace(tzinfo=None),
        minutes_in_sleep_period=sleep_data.minutes_in_sleep_period,
        minutes_awake=sleep_data.minutes_awake,
        minutes_asleep=sleep_data.minutes_asleep,
        minutes_to_fall_asleep=sleep_data.minutes_to_fall_asleep,
        minutes_after_wake_up=sleep_data.minutes_after_wake_up,
        minutes_deep=sleep_data.minutes_deep,
        minutes_rem=sleep_data.minutes_rem,
        minutes_light=sleep_data.minutes_light,
        stages_data=stages_json,
        skin_temperature_celsius=sleep_data.skin_temperature_celsius,
        baseline_temperature_celsius=sleep_data.baseline_temperature_celsius,
        respiratory_rate_avg=sleep_data.respiratory_rate_avg,
        respiratory_rate_deep=sleep_data.respiratory_rate_deep,
        respiratory_rate_light=sleep_data.respiratory_rate_light,
        respiratory_rate_rem=sleep_data.respiratory_rate_rem,
        avg_heart_rate=sleep_data.avg_heart_rate,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    stages = [
        SleepStageSegment(
            type=s["type"],
            start_time_utc=s["start_time_utc"],
            end_time_utc=s["end_time_utc"],
        )
        for s in sleep_data.stages
    ]

    return SleepSessionResponse(
        date=session.date,
        sleep_index=session.sleep_index,
        start_time_utc=session.start_time_utc,
        end_time_utc=session.end_time_utc,
        minutes_in_sleep_period=session.minutes_in_sleep_period,
        minutes_awake=session.minutes_awake,
        minutes_asleep=session.minutes_asleep,
        minutes_to_fall_asleep=session.minutes_to_fall_asleep,
        minutes_after_wake_up=session.minutes_after_wake_up,
        minutes_deep=session.minutes_deep,
        minutes_rem=session.minutes_rem,
        minutes_light=session.minutes_light,
        stages=stages,
        skin_temperature_celsius=session.skin_temperature_celsius,
        baseline_temperature_celsius=session.baseline_temperature_celsius,
        respiratory_rate_avg=session.respiratory_rate_avg,
        respiratory_rate_deep=session.respiratory_rate_deep,
        respiratory_rate_light=session.respiratory_rate_light,
        respiratory_rate_rem=session.respiratory_rate_rem,
        avg_heart_rate=session.avg_heart_rate,
    )


@router.get("/sleep/averages", response_model=SleepAveragesResponse)
def sleep_averages(db: Session = Depends(get_db)):
    sessions = db.query(SleepSession).all()
    if not sessions:
        return SleepAveragesResponse(avg_minutes_asleep=0, avg_sleep_index=0, session_count=0)
    avg_asleep = sum(s.minutes_asleep for s in sessions) / len(sessions)
    avg_index = sum(s.sleep_index for s in sessions) / len(sessions)
    return SleepAveragesResponse(
        avg_minutes_asleep=round(avg_asleep, 1),
        avg_sleep_index=round(avg_index, 1),
        session_count=len(sessions),
    )


TTL_SECONDS = 30 * 60


@router.get("/daily-metrics", response_model=DailyMetricsResponse)
async def daily_metrics(date: str = Query(...), db: Session = Depends(get_db)):
    today_str = local_now().date().isoformat()
    existing = db.query(DailyMetric).filter(DailyMetric.date == date).first()

    if date != today_str and existing:
        return _daily_metrics_response(existing)

    if not get_health_provider().enabled:
        # No tracker: show what is stored (e.g. from an earlier provider), never write.
        return _daily_metrics_response(existing or DailyMetric(date=date))

    if date == today_str and existing and existing.fetched_at:
        age = (datetime.now(UTC) - existing.fetched_at.replace(tzinfo=UTC)).total_seconds()
        if age < TTL_SECONDS:
            return _daily_metrics_response(existing)

    data = await get_health_provider().daily_metrics(date)

    metric = existing or DailyMetric(date=date)
    metric.resting_heart_rate = data.resting_heart_rate
    metric.hrv_rmssd = data.hrv_rmssd
    metric.hrv_entropy = data.hrv_entropy
    metric.spo2_avg = data.spo2_avg
    metric.spo2_low = data.spo2_low
    metric.steps = data.steps
    metric.fetched_at = datetime.now(UTC)

    if not existing:
        db.add(metric)
    db.commit()
    db.refresh(metric)

    return _daily_metrics_response(metric)


def _detect_caffeine(food_entry: FoodEntry) -> bool:
    return CAFFEINE_PATTERN.search(food_entry.name.lower()) is not None


def _group_meals(food_entries: list[FoodEntry]) -> list[dict]:
    sorted_entries = sorted(food_entries, key=lambda e: e.time)
    groups: list[dict] = []

    for entry in sorted_entries:
        try:
            hh, mm = entry.time.split(":")
            entry_minutes = int(hh) * 60 + int(mm)
        except (ValueError, AttributeError):
            continue

        if entry.calories is None or entry.calories <= 0:
            continue

        added = False
        for group in groups:
            if entry_minutes - group["start_minutes"] <= MEAL_GROUP_WINDOW_MIN:
                group["entries"].append(entry)
                group["total_calories"] += entry.calories
                group["end_minutes"] = max(group["end_minutes"], entry_minutes)
                added = True
                break

        if not added:
            groups.append(
                {
                    "start_minutes": entry_minutes,
                    "end_minutes": entry_minutes,
                    "entries": [entry],
                    "total_calories": entry.calories,
                    "time": entry.time,
                }
            )

    return groups


def _compute_biphasic_baseline(p: float) -> float:
    """Daily rhythm at progress `p` (0 = wake-up, 1 = bedtime): a smooth curve through
    wake-up (0), first peak, afternoon dip, second peak and bedtime (0)."""
    if p <= 0.0 or p >= 1.0:
        return 0.0
    points = [
        (0.0, 0.0),
        (FIRST_PEAK_PROGRESS, AMP_FIRST_PEAK),
        (DIP_PROGRESS, AMP_DIP),
        (SECOND_PEAK_PROGRESS, AMP_SECOND_PEAK),
        (1.0, 0.0),
    ]
    for (p0, v0), (p1, v1) in zip(points, points[1:], strict=False):
        if p <= p1:
            t = (p - p0) / (p1 - p0)
            return v0 + (v1 - v0) * (1.0 - math.cos(math.pi * t)) / 2.0
    return 0.0


def _influence(
    type_: str, start_h: float, end_h: float, magnitude: float, **extra
) -> EnergyInfluence:
    return EnergyInfluence(
        type=type_,
        hour=int(start_h) % 24,
        magnitude=magnitude,
        start_h=round(start_h, 2),
        end_h=round(end_h, 2),
        **extra,
    )


def _caffeine_effect(hours_after: float) -> float:
    return CAFFEINE_MAGNITUDE * 0.5 ** (hours_after / CAFFEINE_HALF_LIFE_H)


def _meal_influences(group: dict, start_h: float) -> list[EnergyInfluence]:
    kcal = float(group["total_calories"] or 0)
    if kcal <= 0:
        return []
    carbs = sum(float(e.carbs or 0) for e in group["entries"])
    carb_share = carbs * 4.0 / kcal

    influences = []
    if carb_share > CARB_HEAVY_SHARE and carbs >= CARB_HEAVY_MIN_G:
        crash_start = start_h + SUGAR_SPIKE_DUR
        description = f"Carb-heavy meal ({round(carb_share * 100)}% of kcal from carbs)"
        influences += [
            _influence(
                "sugar_spike", start_h, crash_start, SUGAR_SPIKE_MAG, description=description
            ),
            _influence(
                "sugar_crash",
                crash_start,
                crash_start + SUGAR_CRASH_DUR,
                SUGAR_CRASH_MAG,
                description=description,
                recommendation="Tip: take a short walk",
            ),
        ]
    if kcal >= LARGE_MEAL_KCAL:
        dip_start = start_h + MEAL_DIP_DELAY_H
        influences.append(
            _influence(
                "meal_dip",
                dip_start,
                dip_start + MEAL_DIP_DUR,
                MEAL_DIP_MAG,
                description=f"Large meal ({kcal:.0f} kcal)",
            )
        )
    return influences


def _is_hard_run(run: Run, cardio: RunCardio | None) -> bool:
    effort = run.perceived_effort
    load = cardio.cardio_load if cardio is not None else None
    return (effort is not None and effort >= EFFORT_HARD) or (
        load is not None and load > CARDIO_LOAD_HARD
    )


def _run_influences(hard: bool, end_h: float, bed_h: float) -> list[EnergyInfluence]:
    if not hard:
        return [_influence("light_exercise_boost", end_h, end_h + LIGHT_BOOST_DUR, LIGHT_BOOST_MAG)]
    drain_start = end_h + HARD_DROP_DUR
    return [
        _influence("hard_exercise_drop", end_h, drain_start, HARD_DROP_MAG),
        _influence("hard_exercise_base_drain", drain_start, bed_h, HARD_BASE_DRAIN),
    ]


def _effect_at(influence: EnergyInfluence, t: float) -> float:
    if not influence.start_h <= t < influence.end_h:
        return 0.0
    if influence.type == "caffeine":
        return _caffeine_effect(t - influence.start_h)
    return influence.magnitude


def _hour_effect(influences: list[EnergyInfluence], t: float) -> float:
    """Average effect of all influences during the hour [t, t + 1)."""
    samples = [t + (i + 0.5) / SAMPLES_PER_HOUR for i in range(SAMPLES_PER_HOUR)]
    return sum(_effect_at(inf, s) for inf in influences for s in samples) / SAMPLES_PER_HOUR


def _energy_at(
    t: float,
    wake_h: float,
    bed_h: float,
    readiness: float | None,
    influences: list[EnergyInfluence],
) -> float:
    """Energy (0-100) for the hour starting at `t`. Hours count from midnight of the day and
    go past 24 after midnight, so `bed_h` may be e.g. 25 for 01:00."""
    if not wake_h <= t < bed_h:
        return 0.0
    p = (t - wake_h) / (bed_h - wake_h)
    energy = _compute_biphasic_baseline(p)
    if readiness is not None:
        level = readiness / 100.0
        energy *= level * (100.0 / AMP_FIRST_PEAK) * (1.0 - LOW_READINESS_FADE * (1.0 - level) * p)
    return _clamp100(energy + _hour_effect(influences, t))


def _clamp100(x: float) -> float:
    return max(0.0, min(100.0, x))


def _compute_baselines(db: Session, date: str, window_days: int = BASELINE_WINDOW_DAYS) -> dict:
    """Personal averages of HRV and resting heart rate over the days before `date`.

    A value is `None` when there are fewer than BASELINE_MIN_READINGS readings; the
    score then falls back to the fixed scale.
    """
    dt = datetime.strptime(date, "%Y-%m-%d").date()
    start = (dt - timedelta(days=window_days)).isoformat()
    rows = db.query(DailyMetric).filter(DailyMetric.date >= start, DailyMetric.date < date).all()

    def average(values: list[float]) -> float | None:
        return sum(values) / len(values) if len(values) >= BASELINE_MIN_READINGS else None

    return {
        "hrv": average([float(r.hrv_rmssd) for r in rows if r.hrv_rmssd is not None]),
        "rhr": average(
            [float(r.resting_heart_rate) for r in rows if r.resting_heart_rate is not None]
        ),
    }


def _vitals_score(
    value: float, baseline: float | None, fixed_scale: tuple[float, float], higher_is_better: bool
) -> float:
    """Score HRV or resting HR from 0 to 100.

    With a personal baseline: 50 at the baseline, +-PERSONAL_RANGE_PCT % maps to 100 / 0.
    Without one: linear on the fixed scale (value for 0, value for 100).
    """
    if baseline is not None and baseline > 0:
        deviation_pct = (value - baseline) / baseline * 100.0
        if not higher_is_better:
            deviation_pct = -deviation_pct
        return _clamp100(50.0 + 50.0 * deviation_pct / PERSONAL_RANGE_PCT)
    at_0, at_100 = fixed_scale
    return _clamp100((value - at_0) / (at_100 - at_0) * 100.0)


def _component(
    key: str,
    label: str,
    score: float | None,
    detail: str | None = None,
    personal: bool = False,
) -> dict:
    available = score is not None
    return {
        "key": key,
        "label": label,
        "score": round(score) if available else None,
        "weight": READINESS_WEIGHTS[key],
        "available": available,
        "detail": detail if available else None,
        "personal": personal,
    }


def _compute_readiness(
    sleep: SleepSession | None,
    metrics: DailyMetric | None,
    baselines: dict,
    sleep_is_previous: bool = False,
) -> dict:
    components: list[dict] = []

    if sleep is not None and sleep.sleep_index > 0:
        detail = f"Sleep index {sleep.sleep_index}"
        if sleep_is_previous:
            detail += " (previous day)"
        components.append(_component("sleep", "Sleep", float(sleep.sleep_index), detail))
    else:
        components.append(_component("sleep", "Sleep", None))

    vitals = [
        ("hrv", "HRV", metrics.hrv_rmssd if metrics else None, HRV_FIXED_SCALE, True, "ms"),
        (
            "rhr",
            "Resting HR",
            metrics.resting_heart_rate if metrics else None,
            RHR_FIXED_SCALE,
            False,
            "bpm",
        ),
    ]
    for key, label, raw, fixed_scale, higher_is_better, unit in vitals:
        if raw is None:
            components.append(_component(key, label, None))
            continue
        value = float(raw)
        baseline = baselines.get(key)
        score = _vitals_score(value, baseline, fixed_scale, higher_is_better)
        detail = f"{label} {value:g} {unit}"
        if baseline is not None:
            detail += f" vs. avg {baseline:.0f}"
        components.append(_component(key, label, score, detail, personal=baseline is not None))

    available = [c for c in components if c["available"]]
    available_weight = sum(c["weight"] for c in available)
    for c in components:
        c["share"] = round(c["weight"] / available_weight * 100) if c["available"] else None

    total = None
    if available:
        total = round(sum(c["score"] * c["weight"] for c in available) / available_weight)

    breakdown = ReadinessBreakdown(
        components=[ReadinessComponent(**c) for c in components],
        coverage_pct=available_weight,
    )
    return {"total": total, "breakdown": breakdown}


def compute_energy_curve(db: Session, date: str) -> EnergyCurveResponse:
    settings_row = db.query(UserSettings).first()
    wake = settings_row.wake_hour if settings_row else 8
    bed = settings_row.sleep_hour if settings_row else 24
    day_start = settings_row.day_start_hour if settings_row else 4

    def on_timeline(clock_h: float) -> float:
        """Hours since midnight of `date`; times before the day start belong to the night after."""
        return clock_h + 24.0 if clock_h < day_start else clock_h

    sleep = db.query(SleepSession).filter(SleepSession.date == date).first()
    sleep_is_previous = False
    if not sleep:
        sleep = (
            db.query(SleepSession)
            .filter(SleepSession.date < date)
            .order_by(SleepSession.date.desc())
            .first()
        )
        sleep_is_previous = sleep is not None
    if sleep and sleep.end_time_utc:
        wake = utc_to_local(sleep.end_time_utc).hour

    dt = datetime.strptime(date, "%Y-%m-%d").date()
    next_dt = dt + timedelta(days=1)
    next_sleep = db.query(SleepSession).filter(SleepSession.date == next_dt.isoformat()).first()
    if next_sleep and next_sleep.start_time_utc:
        bed = utc_to_local(next_sleep.start_time_utc).hour

    wake_h = on_timeline(wake)
    bed_h = on_timeline(bed)
    if bed_h <= wake_h:
        bed_h += 24.0

    metrics = db.query(DailyMetric).filter(DailyMetric.date == date).first()
    baselines = _compute_baselines(db, date)
    readiness_data = _compute_readiness(sleep, metrics, baselines, sleep_is_previous)
    readiness = readiness_data["total"]

    influences: list[EnergyInfluence] = []

    food_entries = db.query(FoodEntry).filter(FoodEntry.date == date).all()
    caffeine_dur = CAFFEINE_HALF_LIFE_H * math.log2(1.0 / CAFFEINE_EFFECT_END_FRACTION)
    for entry in food_entries:
        if not _detect_caffeine(entry):
            continue
        try:
            hh, mm = entry.time.split(":")
            start = on_timeline(int(hh) + int(mm) / 60.0)
        except (ValueError, AttributeError):
            continue
        influences.append(_influence("caffeine", start, start + caffeine_dur, CAFFEINE_MAGNITUDE))

    for group in _group_meals(food_entries):
        influences += _meal_influences(group, on_timeline(group["start_minutes"] / 60.0))

    runs = db.query(Run).filter(Run.start_time >= dt, Run.start_time < next_dt).all()
    for run in runs:
        cardio = db.query(RunCardio).filter(RunCardio.run_id == run.id).first()
        start = on_timeline(run.start_time.hour + run.start_time.minute / 60.0)
        end = start + run.duration_minutes / 60.0
        influences += _run_influences(_is_hard_run(run, cardio), end, bed_h)

    adjustments = db.query(EnergyAdjustment).filter(EnergyAdjustment.date == date).all()
    for adj in adjustments:
        # Without a time range the adjustment covers the whole waking day.
        start_clock = adj.start_h if adj.start_h is not None else float(wake)
        end_clock = adj.end_h if adj.end_h is not None else float(bed)
        start = on_timeline(start_clock)
        duration = (end_clock - start_clock) % 24 or 24.0
        influences.append(
            _influence("manual", start, start + duration, adj.magnitude, description=adj.reason)
        )

    # Only what happens while awake counts; effects end at bedtime.
    influences = [i for i in influences if i.start_h < bed_h and i.end_h > wake_h]
    for inf in influences:
        inf.end_h = min(inf.end_h, round(bed_h, 2))
        if inf.type == "caffeine":
            inf.end_magnitude = round(_caffeine_effect(inf.end_h - inf.start_h), 1)
    influences.sort(key=lambda i: i.start_h)

    curve = [
        EnergyDataPoint(
            hour=h,
            energy=round(_energy_at(on_timeline(h), wake_h, bed_h, readiness, influences), 1),
        )
        for h in range(24)
    ]
    baseline_curve = [
        EnergyDataPoint(
            hour=h, energy=round(_energy_at(on_timeline(h), wake_h, bed_h, None, []), 1)
        )
        for h in range(24)
    ]

    peak_windows: list[PeakWindow] = []
    in_window = False
    window_start = 0
    for h in range(24):
        energy = curve[h].energy
        if energy > 70.0:
            if not in_window:
                in_window = True
                window_start = h
        elif in_window:
            peak_windows.append(PeakWindow(start=window_start, end=h))
            in_window = False
    if in_window:
        peak_windows.append(PeakWindow(start=window_start, end=24))

    return EnergyCurveResponse(
        date=date,
        readiness_score=readiness,
        readiness_breakdown=readiness_data["breakdown"],
        curve=curve,
        baseline_curve=baseline_curve,
        peak_windows=peak_windows,
        influences=influences,
        wake_hour=wake,
        bed_hour=bed,
    )


@router.get("/energy-curve", response_model=EnergyCurveResponse)
def energy_curve(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
):
    return compute_energy_curve(db, date)


def _daily_metrics_response(metric: DailyMetric) -> DailyMetricsResponse:
    return DailyMetricsResponse(
        date=metric.date,
        resting_heart_rate=metric.resting_heart_rate,
        hrv_rmssd=metric.hrv_rmssd,
        hrv_entropy=metric.hrv_entropy,
        spo2_avg=metric.spo2_avg,
        spo2_low=metric.spo2_low,
        steps=metric.steps,
    )
