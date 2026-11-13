from datetime import datetime

import pytest

from app.models import DailyMetric, FoodEntry, Run, UserSettings
from app.routers.health_data import (
    AMP_DIP,
    AMP_FIRST_PEAK,
    AMP_SECOND_PEAK,
    DIP_PROGRESS,
    FIRST_PEAK_PROGRESS,
    SECOND_PEAK_PROGRESS,
    _compute_biphasic_baseline,
    _energy_at,
    compute_energy_curve,
)
from app.schemas.health import EnergyInfluence

DATE = "2026-11-02"


# --- Baseline shape -------------------------------------------------------------------------


def test_baseline_is_zero_at_wake_and_bed():
    assert _compute_biphasic_baseline(0.0) == 0.0
    assert _compute_biphasic_baseline(1.0) == 0.0


def test_baseline_has_two_peaks_with_a_dip_between():
    assert _compute_biphasic_baseline(FIRST_PEAK_PROGRESS) == pytest.approx(AMP_FIRST_PEAK)
    assert _compute_biphasic_baseline(DIP_PROGRESS) == pytest.approx(AMP_DIP)
    assert _compute_biphasic_baseline(SECOND_PEAK_PROGRESS) == pytest.approx(AMP_SECOND_PEAK)


def test_baseline_never_overshoots_its_peaks():
    values = [_compute_biphasic_baseline(i / 1000) for i in range(1001)]
    assert max(values) == pytest.approx(AMP_FIRST_PEAK)
    second_half = [_compute_biphasic_baseline(i / 1000) for i in range(440, 1001)]
    assert max(second_half) == pytest.approx(AMP_SECOND_PEAK)


# --- Energy per hour ------------------------------------------------------------------------


def energy(t, wake=8, bed=24, readiness=None, influences=None):
    return _energy_at(t, wake, bed, readiness, influences or [])


def manual(start, end, magnitude):
    return EnergyInfluence(
        type="manual", hour=int(start), magnitude=magnitude, start_h=start, end_h=end
    )


def test_no_energy_while_asleep():
    assert energy(6) == 0.0  # before wake
    assert energy(24) == 0.0  # bed at midnight


def test_bedtime_after_midnight():
    assert energy(25, bed=26) > 0.0  # 01:00
    assert energy(27, bed=26) == 0.0


def test_without_readiness_the_rhythm_is_unchanged():
    peak = 8 + FIRST_PEAK_PROGRESS * 16
    assert energy(peak) == pytest.approx(AMP_FIRST_PEAK)


def test_readiness_sets_the_height_of_the_morning_peak():
    peak = 8 + FIRST_PEAK_PROGRESS * 16
    assert energy(peak, readiness=100) == pytest.approx(100)
    assert 45 < energy(peak, readiness=50) < 50  # slightly below: low readiness fades faster


def test_low_readiness_fades_faster_over_the_day():
    late = 8 + SECOND_PEAK_PROGRESS * 16
    peak = 8 + FIRST_PEAK_PROGRESS * 16
    good = energy(late, readiness=100) / energy(peak, readiness=100)
    poor = energy(late, readiness=40) / energy(peak, readiness=40)
    assert poor < good


def test_influences_shift_energy_within_0_100():
    assert energy(12, influences=[manual(12, 13, 10)]) == pytest.approx(energy(12) + 10)
    assert energy(12, influences=[manual(12, 13, -500)]) == 0.0
    assert energy(12, influences=[manual(12, 13, 500)]) == 100.0


def test_short_influences_count_for_their_share_of_the_hour():
    # 30 minutes of +10 inside the hour 12:00-13:00 -> +5 on average
    assert energy(12, influences=[manual(12.25, 12.75, 10)]) == pytest.approx(energy(12) + 5)


# --- Full curve from the database -----------------------------------------------------------


@pytest.fixture
def day(db):
    db.add(UserSettings(wake_hour=7, sleep_hour=23))
    db.commit()
    return db


def curve(db) -> dict[int, float]:
    return {p.hour: p.energy for p in compute_energy_curve(db, DATE).curve}


def test_empty_day_gives_a_full_day_curve(day):
    result = compute_energy_curve(day, DATE)
    assert [p.hour for p in result.curve] == list(range(24))
    assert all(p.energy >= 0 for p in result.curve)
    assert (result.wake_hour, result.bed_hour) == (7, 23)
    assert result.influences == []


def test_coffee_raises_energy_afterwards(day):
    before = curve(day)
    day.add(FoodEntry(date=DATE, time="09:00", meal_type="Breakfast", name="Coffee", emoji="☕"))
    day.commit()
    after = curve(day)

    assert after[8] == pytest.approx(before[8])
    assert after[10] > before[10]


def test_hard_run_drops_energy_after_the_run(day):
    before = curve(day)
    day.add(
        Run(
            start_time=datetime(2026, 11, 2, 14, 0),
            distance_km=10,
            duration_minutes=60,
            location="Forest",
            perceived_effort=8,
        )
    )
    day.commit()
    after = curve(day)

    assert after[13] == pytest.approx(before[13])
    assert after[15] < before[15]
    assert after[18] < before[18]  # lasting drain for the rest of the day


def test_light_run_boosts_energy(day):
    before = curve(day)
    day.add(
        Run(
            start_time=datetime(2026, 11, 2, 14, 0),
            distance_km=3,
            duration_minutes=20,
            location="Town",
            perceived_effort=2,
        )
    )
    day.commit()
    after = curve(day)

    assert after[15] > before[15]
    assert after[20] == pytest.approx(before[20])


def test_run_without_effort_or_cardio_counts_as_light(day):
    day.add(
        Run(
            start_time=datetime(2026, 11, 2, 14, 0),
            distance_km=5,
            duration_minutes=30,
            location="Park",
        )
    )
    day.commit()
    types = [i.type for i in compute_energy_curve(day, DATE).influences]
    assert types == ["light_exercise_boost"]


def food(time, name, calories, carbs, emoji="🍽️"):
    return FoodEntry(
        date=DATE,
        time=time,
        meal_type="Meal",
        name=name,
        emoji=emoji,
        calories=calories,
        carbs=carbs,
    )


def test_short_sugar_spike_shows_in_the_curve(day):
    before = curve(day)
    day.add(food("08:15", "Jam toast", calories=300, carbs=60))  # 80 % of kcal from carbs
    day.commit()
    result = compute_energy_curve(day, DATE)
    after = {p.hour: p.energy for p in result.curve}

    assert [i.type for i in result.influences] == ["sugar_spike", "sugar_crash"]
    # 08:15-08:45 spike (+10 for half the hour) partly offset by the crash from 08:45
    assert after[8] - before[8] == pytest.approx(10 * 0.5 - 20 * 0.25)
    assert after[9] - before[9] == pytest.approx(-20)


def test_small_carb_snack_gives_no_sugar_crash(day):
    day.add(food("14:00", "Espresso", calories=5, carbs=0.8))  # 64 % of kcal, but under 1 g
    day.commit()

    types = [i.type for i in compute_energy_curve(day, DATE).influences]
    assert types == ["caffeine"]  # still caffeinated, but no spike or crash


def test_large_meal_gives_a_dip(day):
    before = curve(day)
    day.add(food("12:00", "Schnitzel with fries", calories=1000, carbs=60))
    day.commit()
    result = compute_energy_curve(day, DATE)
    after = {p.hour: p.energy for p in result.curve}

    assert [i.type for i in result.influences] == ["meal_dip"]
    assert after[13] < before[13]
    assert after[15] == pytest.approx(before[15])


def test_readiness_scales_instead_of_capping(day):
    # HRV 50 ms and resting HR 62.5 bpm both score 50 on the fixed scale -> readiness 50
    day.add(DailyMetric(date=DATE, hrv_rmssd=50, resting_heart_rate=62.5))
    day.commit()
    result = compute_energy_curve(day, DATE)
    energies = [p.energy for p in result.curve if p.energy > 0]

    assert result.readiness_score == 50
    assert max(energies) <= 50
    assert energies.count(max(energies)) == 1  # a real peak, no flat plateau
