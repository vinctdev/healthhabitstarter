"""Fill the database with realistic, reproducible demo data.

Usage (from backend/):
    python -m app.demo_seed            # refuses if user data already exists
    python -m app.demo_seed --reset    # wipe user data first, then seed
    python -m app.demo_seed --days 30  # shorter history

The library tables (known foods, supplements) are seeded by the app on startup and are
never deleted here. Data is generated with a fixed random seed relative to "today", so
screenshots look the same on every run of the same day.
"""

import argparse
import json
import random
import sys
from datetime import UTC, date, datetime, timedelta

from .config import settings
from .database import SessionLocal
from .health_providers.demo import demo_daily_metrics, demo_run_cardio, demo_sleep
from .models import (
    BodyMeasurement,
    BodyProfile,
    DailyMetric,
    EnergyAdjustment,
    FoodEntry,
    FoodStreak,
    FoodTemplate,
    Goal,
    PushupEntry,
    Run,
    RunCardio,
    SleepSession,
    Streak,
    Supplement,
    SupplementLog,
    UserSettings,
    UserSupplement,
)
from .routers.body_metrics import calculate_bmi
from .routers.goals import check_streak
from .routers.health_data import _compute_sleep_index
from .schemas.pushups import VARIANTS
from .timeutils import DEFAULT_DAY_START_HOUR, active_date

# Tables holding user data, in a safe deletion order.
USER_TABLES = [
    EnergyAdjustment,
    DailyMetric,
    SleepSession,
    BodyMeasurement,
    BodyProfile,
    SupplementLog,
    UserSupplement,
    PushupEntry,
    RunCardio,
    Run,
    FoodTemplate,
    FoodEntry,
    FoodStreak,
    Goal,
    Streak,
    UserSettings,
]

# Values that must match the current UI options.
MEAL_BREAKFAST, MEAL_LUNCH, MEAL_DINNER, MEAL_SNACK = "Breakfast", "Lunch", "Dinner", "Snack"
RUN_LOCATIONS = ["Forest", "Fields", "Park", "Town", "Trail", "Track"]
GENDER = "male"
SPORT_REASONS = ["Health", "Endurance"]
SUPPLEMENT_STACK = [  # (library name, dosage, unit, time window, interval days)
    ("Vitamin D3+K2", "2000", "IU", "morning", 1),
    ("Omega-3", "1000", "mg", "midday", 1),
    ("Creatine", "5", "g", "anytime", 1),
    ("Magnesium glycinate", "400", "mg", "bedtime", 1),
    ("Vitamin B12", "500", "µg", "morning", 3),
]

# name, emoji, amount, unit, kcal, protein, carbs, fat, sugar, salt, fiber, sat. fat, water ml
Meal = tuple[
    str, str, float, str, int, float, float, float, float, float, float | None, float | None, int
]
BREAKFASTS: list[Meal] = [
    ("Oatmeal with berries", "🥣", 350, "g", 420, 14, 62, 11, 14, 0.2, 9.0, 2.5, 200),
    ("Whole-grain bread with cheese", "🍞", 2, "pcs", 380, 18, 40, 15, 4, 1.6, 6.0, 8.0, 0),
    ("Greek yogurt with granola", "🥛", 300, "g", 390, 24, 42, 13, 18, 0.3, 4.0, 6.5, 150),
    ("Scrambled eggs on toast", "🍳", 1, "pcs", 450, 26, 30, 24, 3, 1.4, 3.0, 8.5, 0),
]
LUNCHES: list[Meal] = [
    ("Chicken rice bowl", "🍛", 450, "g", 640, 42, 72, 16, 6, 1.8, 6.0, 3.5, 250),
    ("Spaghetti bolognese", "🍝", 400, "g", 690, 32, 86, 21, 10, 2.1, 7.0, 7.5, 200),
    ("Lentil soup with bread", "🍲", 500, "g", 520, 26, 74, 10, 8, 2.4, 16.0, 1.5, 350),
    ("Tuna salad", "🥗", 350, "g", 430, 34, 18, 24, 6, 1.5, 7.0, 3.8, 250),
]
DINNERS: list[Meal] = [
    ("Salmon with potatoes and broccoli", "🐟", 450, "g", 610, 38, 48, 26, 4, 1.2, 8.0, 5.0, 300),
    ("Veggie stir-fry with tofu", "🥦", 400, "g", 480, 24, 44, 22, 9, 2.6, 9.0, 3.0, 250),
    ("Chili con carne", "🌶️", 450, "g", 560, 36, 46, 22, 9, 2.3, 14.0, 8.0, 300),
    ("Homemade pizza", "🍕", 2, "pcs", 780, 30, 92, 30, 8, 3.2, 5.0, 13.0, 100),
]
SNACKS: list[Meal] = [
    ("Apple", "🍎", 1, "pcs", 80, 0.4, 19, 0.3, 15, 0.0, 3.5, 0.1, 120),
    ("Mixed nuts", "🥜", 30, "g", 190, 6, 5, 17, 1, 0.0, 2.5, 2.0, 0),
    ("Dark chocolate", "🍫", 25, "g", 140, 2, 9, 10, 6, 0.0, 2.8, 6.0, 0),
    ("Banana", "🍌", 1, "pcs", 105, 1.3, 27, 0.4, 14, 0.0, 3.1, 0.1, 90),
]
DRINKS: list[Meal] = [
    ("Espresso", "☕", 1, "pcs", 5, 0.3, 0.8, 0.1, 0, 0.0, 0.0, 0.0, 30),
    ("Water", "💧", 500, "ml", 0, 0, 0, 0, 0, 0.0, 0.0, 0.0, 500),
]

DAILY_TASKS = [
    "Read 20 pages",
    "Walk 30 minutes",
    "Meal prep for tomorrow",
    "Stretch for 10 minutes",
    "No screens after 22:00",
    "Plan the week",
    "Drink 2 liters of water",
    "Call a friend",
    "Tidy up the desk",
    "Practice Spanish for 15 minutes",
]
SHORT_GOALS = [
    ("Run 10 km without a break", 12, "Build up distance by about 10% per week."),
    ("Cook at home 5 days a week", 20, None),
    ("Finish the online course", 30, "Two modules left."),
]
LONG_GOALS = [
    ("Run a half marathon", 160, "Target: under 2 hours."),
    ("Reach 15% body fat", 220, None),
    ("Build a consistent morning routine", None, None),
]


def add_food(db, rnd: random.Random, day: date, meal_type: str, hhmm: str, meal: Meal) -> None:
    name, emoji, amount, unit, kcal, protein, carbs, fat, sugar, salt, fiber, sat_fat, water = meal
    f = rnd.uniform(0.9, 1.1)  # portion variance
    db.add(
        FoodEntry(
            date=day.isoformat(),
            time=hhmm,
            meal_type=meal_type,
            name=name,
            emoji=emoji,
            is_drink=meal in DRINKS,
            amount=amount,
            unit=unit,
            calories=round(kcal * f),
            protein=round(protein * f, 1),
            carbs=round(carbs * f, 1),
            fat=round(fat * f, 1),
            sugar=round(sugar * f, 1),
            salt=round(salt * f, 2),
            fiber=None if fiber is None else round(fiber * f, 1),
            saturated_fat=None if sat_fat is None else round(sat_fat * f, 1),
            water_ml=water,
        )
    )


def seed_food(db, rnd: random.Random, days: list[date], today: date) -> None:
    for day in days:
        is_today = day == today
        add_food(db, rnd, day, MEAL_BREAKFAST, "07:30", rnd.choice(BREAKFASTS))
        add_food(db, rnd, day, MEAL_BREAKFAST, "07:45", DRINKS[0])
        add_food(db, rnd, day, MEAL_LUNCH, "12:30", rnd.choice(LUNCHES))
        if rnd.random() < 0.7:
            add_food(db, rnd, day, MEAL_SNACK, "15:30", rnd.choice(SNACKS))
        if rnd.random() < 0.5:
            add_food(db, rnd, day, MEAL_SNACK, "14:00", DRINKS[0])
        for hhmm in ("10:00", "13:30", "16:30"):
            add_food(db, rnd, day, MEAL_SNACK, hhmm, DRINKS[1])
        if not is_today:  # today's dinner has not happened yet
            add_food(db, rnd, day, MEAL_DINNER, "18:45", rnd.choice(DINNERS))

    for label, meal in (
        ("Breakfast oatmeal", BREAKFASTS[0]),
        ("Rice bowl", LUNCHES[0]),
        ("Nut snack", SNACKS[1]),
    ):
        name, emoji, amount, unit, kcal, protein, carbs, fat, sugar, salt, fiber, sat_fat, water = (
            meal
        )
        db.add(
            FoodTemplate(
                label=label,
                name=name,
                emoji=emoji,
                amount=amount,
                unit=unit,
                calories=kcal,
                protein=protein,
                carbs=carbs,
                fat=fat,
                sugar=sugar,
                salt=salt,
                fiber=fiber,
                saturated_fat=sat_fat,
                water_ml=water,
            )
        )


def seed_goals(db, rnd: random.Random, days: list[date], today: date) -> None:
    for day in days + [today + timedelta(days=1)]:
        tasks = rnd.sample(DAILY_TASKS, rnd.randint(3, 5))
        all_done = (today - day).days <= 12 or rnd.random() < 0.75  # recent streak for the demo
        for pos, text in enumerate(tasks):
            if day < today:
                done = all_done or rnd.random() < 0.6
            elif day == today:
                done = pos < 2
            else:
                done = False
            db.add(
                Goal(
                    text=text,
                    kind="daily",
                    due_date=day.isoformat(),
                    position=pos,
                    done=done,
                    done_at=datetime.combine(day, datetime.min.time()) + timedelta(hours=18)
                    if done
                    else None,
                    queued=day == today and pos == 2,
                )
            )
    created = datetime.combine(days[0], datetime.min.time())
    for kind, goals in (("short", SHORT_GOALS), ("long", LONG_GOALS)):
        for pos, (text, in_days, description) in enumerate(goals):
            due = (today + timedelta(days=in_days)).isoformat() if in_days is not None else None
            db.add(
                Goal(
                    text=text,
                    kind=kind,
                    due_date=due,
                    description=description,
                    position=pos,
                    created_at=created,
                )
            )


def seed_sport(db, rnd: random.Random, days: list[date], today: date) -> None:
    distance = 5.0
    for day in days:
        weekday = day.weekday()
        if weekday in (1, 3, 6) and day < today and rnd.random() < 0.85:
            is_long = weekday == 6
            km = round(distance * (1.5 if is_long else 1.0) * rnd.uniform(0.9, 1.1), 2)
            pace = rnd.uniform(5.6, 6.3) + (0.3 if is_long else 0)
            minutes = round(km * pace, 1)
            effort = min(10, max(1, round(4 + km / 3 + rnd.uniform(-1, 1))))
            run = Run(
                start_time=datetime.combine(day, datetime.min.time())
                + timedelta(hours=18, minutes=rnd.randint(0, 40)),
                distance_km=km,
                duration_minutes=minutes,
                location=rnd.choice(RUN_LOCATIONS),
                temperature=round(rnd.uniform(8, 22), 1),
                perceived_effort=effort,
            )
            db.add(run)
            db.flush()
            cardio = demo_run_cardio(run.start_time, run.start_time + timedelta(minutes=minutes))
            db.add(
                RunCardio(
                    run_id=run.id,
                    avg_heart_rate=cardio.avg_heart_rate,
                    active_zone_minutes=cardio.active_zone_minutes,
                    calories_kcal=cardio.calories_kcal,
                    cardio_load=cardio.cardio_load,
                    heart_rate_zones=json.dumps(cardio.heart_rate_zones),
                    steps=cardio.steps,
                    exercise_data=cardio.raw,
                )
            )
            distance = min(10.0, distance + 0.08)  # slow progression
        if weekday in (0, 2, 4) and rnd.random() < 0.8:
            variants = rnd.sample(list(VARIANTS), k=rnd.randint(1, 3))
            reps = {v: rnd.randint(15, 30) for v in variants}
            db.add(PushupEntry(date=day.isoformat(), time="07:00", variant_reps=json.dumps(reps)))


def seed_supplements(db, rnd: random.Random, days: list[date], today: date) -> None:
    library = {s.name: s.id for s in db.query(Supplement).all()}
    for name, dosage, unit, window, interval in SUPPLEMENT_STACK:
        if name not in library:
            continue
        us = UserSupplement(
            supplement_id=library[name],
            dosage=dosage,
            unit=unit,
            time_window=window,
            interval_days=interval,
        )
        db.add(us)
        db.flush()
        for i, day in enumerate(days):
            if day == today or i % interval or rnd.random() > 0.88:
                continue
            db.add(
                SupplementLog(
                    user_supplement_id=us.id,
                    date=day.isoformat(),
                    taken_at=datetime.combine(day, datetime.min.time()) + timedelta(hours=8),
                )
            )


def seed_body(db, rnd: random.Random, days: list[date]) -> None:
    height = 181.0
    db.add(BodyProfile(height_cm=height, age=34, gender=GENDER, occupation="Software developer"))
    weight, fat = 84.5, 21.5
    for day in days[::7]:
        db.add(
            BodyMeasurement(
                date=day.isoformat(),
                weight_kg=round(weight, 1),
                body_fat_pct=round(fat, 1),
                muscle_mass_kg=round(weight * 0.42, 1),
                bmi=calculate_bmi(weight, height),
            )
        )
        weight -= rnd.uniform(0.1, 0.4)
        fat -= rnd.uniform(0.05, 0.25)


def seed_health(db, days: list[date], today: date) -> None:
    # Same generators as HEALTH_PROVIDER=demo, so live values match the seeded history.
    for day in days:
        sleep = demo_sleep(day)
        db.add(
            SleepSession(
                date=day.isoformat(),
                sleep_index=_compute_sleep_index(
                    sleep.minutes_in_sleep_period,
                    sleep.minutes_asleep,
                    sleep.minutes_deep,
                    sleep.minutes_rem,
                    sleep.minutes_awake,
                    sleep.avg_heart_rate,
                ),
                start_time_utc=sleep.start_time_utc,
                end_time_utc=sleep.end_time_utc,
                minutes_in_sleep_period=sleep.minutes_in_sleep_period,
                minutes_awake=sleep.minutes_awake,
                minutes_asleep=sleep.minutes_asleep,
                minutes_to_fall_asleep=sleep.minutes_to_fall_asleep,
                minutes_after_wake_up=sleep.minutes_after_wake_up,
                minutes_deep=sleep.minutes_deep,
                minutes_rem=sleep.minutes_rem,
                minutes_light=sleep.minutes_light,
                stages_data=json.dumps(sleep.stages),
                skin_temperature_celsius=sleep.skin_temperature_celsius,
                baseline_temperature_celsius=sleep.baseline_temperature_celsius,
                respiratory_rate_avg=sleep.respiratory_rate_avg,
                avg_heart_rate=sleep.avg_heart_rate,
            )
        )
        metrics = demo_daily_metrics(day)
        db.add(
            DailyMetric(
                date=day.isoformat(),
                resting_heart_rate=metrics.resting_heart_rate,
                hrv_rmssd=metrics.hrv_rmssd,
                hrv_entropy=metrics.hrv_entropy,
                spo2_avg=metrics.spo2_avg,
                spo2_low=metrics.spo2_low,
                steps=metrics.steps,
                fetched_at=datetime.now(UTC).replace(tzinfo=None),
            )
        )
    db.add(
        EnergyAdjustment(
            date=(today - timedelta(days=2)).isoformat(),
            magnitude=-10,
            start_h=13,
            end_h=18,
            reason="Long meeting day, felt drained in the afternoon",
            source="chat",
        )
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed the database with demo data.")
    parser.add_argument("--days", type=int, default=90, help="days of history (default: 90)")
    parser.add_argument("--reset", action="store_true", help="delete existing user data first")
    args = parser.parse_args()

    if settings.environment == "production":
        print("Refusing to seed demo data: ENVIRONMENT=production.", file=sys.stderr)
        return 1

    from .main import seed_known_foods
    from .main import seed_supplements as seed_supplement_library

    seed_known_foods()
    seed_supplement_library()

    db = SessionLocal()
    try:
        has_data = any(db.query(model).first() for model in USER_TABLES)
        if has_data and not args.reset:
            print(
                "Database already contains user data. Use --reset to replace it.", file=sys.stderr
            )
            return 1
        for model in USER_TABLES:
            db.query(model).delete()

        rnd = random.Random(42)
        today = active_date(DEFAULT_DAY_START_HOUR)
        days = [today - timedelta(days=i) for i in range(args.days - 1, -1, -1)]

        db.add(
            UserSettings(
                wake_hour=7,
                sleep_hour=23,
                calorie_goal=2300,
                day_start_hour=DEFAULT_DAY_START_HOUR,
                sport_reasons=json.dumps(SPORT_REASONS),
                sport_goal="Run a half marathon next spring",
            )
        )
        seed_goals(db, rnd, days, today)
        seed_food(db, rnd, days, today)
        seed_sport(db, rnd, days, today)
        seed_supplements(db, rnd, days, today)
        seed_body(db, rnd, days)
        seed_health(db, days, today)
        db.commit()
        check_streak(db)
    finally:
        db.close()

    print(f"Seeded {args.days} days of demo data (until {today.isoformat()}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
