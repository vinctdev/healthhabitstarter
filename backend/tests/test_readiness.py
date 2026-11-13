"""Readiness score: weighted average of sleep index, HRV and resting heart rate."""

from datetime import date, timedelta

import pytest

from app.models import DailyMetric, SleepSession, UserSettings
from app.routers.health_data import (
    BASELINE_MIN_READINGS,
    PERSONAL_RANGE_PCT,
    READINESS_WEIGHTS,
    _compute_baselines,
    _compute_readiness,
    _vitals_score,
    compute_energy_curve,
)

DATE = "2026-11-02"
NO_BASELINES = {"hrv": None, "rhr": None}


def sleep(index: int) -> SleepSession:
    return SleepSession(sleep_index=index, minutes_asleep=420)


def readiness(sleep_session=None, hrv=None, rhr=None, baselines=NO_BASELINES):
    metrics = DailyMetric(hrv_rmssd=hrv, resting_heart_rate=rhr)
    return _compute_readiness(sleep_session, metrics, baselines)


def by_key(result) -> dict:
    return {c.key: c for c in result["breakdown"].components}


def test_weights_add_up_to_100():
    assert sum(READINESS_WEIGHTS.values()) == 100


def test_no_data_gives_no_score():
    result = readiness()
    assert result["total"] is None
    assert result["breakdown"].coverage_pct == 0
    assert all(not c.available and c.share is None for c in result["breakdown"].components)


def test_all_signals_give_the_weighted_average():
    # Fixed scales: HRV 50 ms -> 50, resting HR 62.5 bpm -> 50
    result = readiness(sleep(80), hrv=50, rhr=62.5)
    parts = by_key(result)
    assert [parts[k].score for k in ("sleep", "hrv", "rhr")] == [80, 50, 50]
    assert [parts[k].share for k in ("sleep", "hrv", "rhr")] == [40, 30, 30]
    assert result["total"] == round(80 * 0.4 + 50 * 0.3 + 50 * 0.3)
    assert result["breakdown"].coverage_pct == 100


def test_missing_signals_share_their_weight():
    # Only sleep: it carries the full weight, the score equals the sleep index
    result = readiness(sleep(90))
    parts = by_key(result)
    assert result["total"] == 90
    assert parts["sleep"].share == 100
    assert parts["hrv"].share is None
    assert result["breakdown"].coverage_pct == 40

    # Sleep + HRV: 40 : 30 -> 57 % : 43 %
    result = readiness(sleep(90), hrv=80)
    parts = by_key(result)
    assert (parts["sleep"].share, parts["hrv"].share) == (57, 43)
    assert result["total"] == round((90 * 40 + 100 * 30) / 70)


def test_shares_never_exceed_100():
    for args in [{}, {"hrv": 60}, {"rhr": 55}, {"hrv": 60, "rhr": 55}]:
        result = readiness(sleep(70), **args)
        shares = [c.share for c in result["breakdown"].components if c.share is not None]
        assert sum(shares) == pytest.approx(100, abs=1)


def test_personal_baseline_scale():
    # At the baseline: 50; PERSONAL_RANGE_PCT % better: 100; as much worse: 0
    assert _vitals_score(60, 60, (20, 80), higher_is_better=True) == 50
    better = 60 * (1 + PERSONAL_RANGE_PCT / 100)
    assert _vitals_score(better, 60, (20, 80), higher_is_better=True) == pytest.approx(100)
    # Resting HR: lower is better
    assert _vitals_score(48, 60, (80, 45), higher_is_better=False) == pytest.approx(100)
    assert _vitals_score(72, 60, (80, 45), higher_is_better=False) == pytest.approx(0)


def test_fixed_scale_is_clamped():
    assert _vitals_score(10, None, (20, 80), higher_is_better=True) == 0
    assert _vitals_score(120, None, (20, 80), higher_is_better=True) == 100
    assert _vitals_score(40, None, (80, 45), higher_is_better=False) == 100


def test_baselines_need_enough_readings(db):
    start = date.fromisoformat(DATE)
    for i in range(1, BASELINE_MIN_READINGS):
        db.add(DailyMetric(date=(start - timedelta(days=i)).isoformat(), hrv_rmssd=40))
    db.commit()
    assert _compute_baselines(db, DATE)["hrv"] is None

    db.add(
        DailyMetric(date=(start - timedelta(days=BASELINE_MIN_READINGS)).isoformat(), hrv_rmssd=70)
    )
    # Today's reading is not part of the baseline
    db.add(DailyMetric(date=DATE, hrv_rmssd=999))
    db.commit()
    expected = (40 * (BASELINE_MIN_READINGS - 1) + 70) / BASELINE_MIN_READINGS
    assert _compute_baselines(db, DATE)["hrv"] == pytest.approx(expected)
    assert _compute_baselines(db, DATE)["rhr"] is None


def test_zero_readiness_flattens_the_energy_curve(db):
    db.add(UserSettings(wake_hour=7, sleep_hour=23))
    db.add(DailyMetric(date=DATE, hrv_rmssd=20, resting_heart_rate=80))  # both score 0
    db.commit()
    result = compute_energy_curve(db, DATE)
    assert result.readiness_score == 0
    assert max(p.energy for p in result.curve) == 0
