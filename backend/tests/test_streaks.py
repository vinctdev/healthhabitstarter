from datetime import date, datetime

from app.models import FoodEntry, Goal, UserSettings
from app.routers.food import check_food_streak
from app.routers.goals import check_streak
from app.timeutils import active_date

# --- Day boundary ---------------------------------------------------------------------------


def test_day_starts_at_the_configured_hour(set_now):
    set_now(datetime(2026, 11, 5, 3, 59))
    assert active_date(4) == date(2026, 11, 4)

    set_now(datetime(2026, 11, 5, 4, 0))
    assert active_date(4) == date(2026, 11, 5)


def test_day_start_at_midnight(set_now):
    set_now(datetime(2026, 11, 5, 0, 30))
    assert active_date(0) == date(2026, 11, 5)


# --- Goal streak ----------------------------------------------------------------------------


def add_goals(db, day: str, *done: bool):
    for i, is_done in enumerate(done):
        db.add(Goal(text=f"Goal {i}", kind="daily", due_date=day, done=is_done, position=i))
    db.commit()


def test_counts_consecutive_days_with_all_goals_done(db, set_now):
    set_now(datetime(2026, 11, 5, 12, 0))
    add_goals(db, "2026-11-02", True, True)
    add_goals(db, "2026-11-03", True)
    add_goals(db, "2026-11-04", True, True, True)
    add_goals(db, "2026-11-05", False)  # today is still open and does not count yet

    assert check_streak(db).count == 3


def test_one_open_goal_resets_the_streak(db, set_now):
    set_now(datetime(2026, 11, 5, 12, 0))
    add_goals(db, "2026-11-02", True)
    add_goals(db, "2026-11-03", True, False)
    add_goals(db, "2026-11-04", True)

    assert check_streak(db).count == 1


def test_days_without_goals_do_not_break_the_streak(db, set_now):
    set_now(datetime(2026, 11, 5, 12, 0))
    add_goals(db, "2026-11-01", True)
    add_goals(db, "2026-11-04", True)

    assert check_streak(db).count == 2


def test_days_are_only_counted_once(db, set_now):
    set_now(datetime(2026, 11, 4, 12, 0))
    add_goals(db, "2026-11-03", True)
    assert check_streak(db).count == 1

    set_now(datetime(2026, 11, 5, 12, 0))
    add_goals(db, "2026-11-04", True)
    assert check_streak(db).count == 2
    assert check_streak(db).count == 2


def test_yesterday_counts_only_after_the_day_boundary(db, set_now):
    db.add(UserSettings(wake_hour=8, sleep_hour=24, day_start_hour=4))
    db.commit()
    add_goals(db, "2026-11-04", True)

    set_now(datetime(2026, 11, 5, 3, 0))  # still Nov 4
    assert check_streak(db).count == 0

    set_now(datetime(2026, 11, 5, 4, 0))
    assert check_streak(db).count == 1


def test_streak_endpoint(client, db, set_now):
    set_now(datetime(2026, 11, 5, 12, 0))
    add_goals(db, "2026-11-04", True)

    response = client.post("/api/streaks/check")
    assert response.status_code == 200
    assert response.json()["count"] == 1


# --- Food streak ----------------------------------------------------------------------------


def add_food(db, *days: str):
    for day in days:
        db.add(FoodEntry(date=day, time="12:00", meal_type="Lunch", name="Soup", emoji="🍲"))
    db.commit()


def test_food_streak_counts_consecutive_days_up_to_today(db, set_now):
    set_now(datetime(2026, 11, 5, 12, 0))
    add_food(db, "2026-11-01", "2026-11-03", "2026-11-04", "2026-11-05")

    assert check_food_streak(db).count == 3


def test_empty_today_keeps_the_food_streak(db, set_now):
    set_now(datetime(2026, 11, 5, 7, 0))  # before breakfast
    add_food(db, "2026-11-03", "2026-11-04")
    assert check_food_streak(db).count == 2

    add_food(db, "2026-11-05")
    assert check_food_streak(db).count == 3


def test_missed_yesterday_ends_the_food_streak(db, set_now):
    set_now(datetime(2026, 11, 5, 12, 0))
    add_food(db, "2026-11-02", "2026-11-03")
    assert check_food_streak(db).count == 0


def test_food_streak_follows_the_day_boundary(db, set_now):
    db.add(UserSettings(wake_hour=8, sleep_hour=24, day_start_hour=4))
    db.commit()
    add_food(db, "2026-11-03", "2026-11-04")

    set_now(datetime(2026, 11, 5, 3, 0))  # still Nov 4, which has entries
    assert check_food_streak(db).count == 2
    set_now(datetime(2026, 11, 6, 3, 0))  # still Nov 5, empty so far
    assert check_food_streak(db).count == 2
    set_now(datetime(2026, 11, 6, 4, 0))  # Nov 6: Nov 5 was missed
    assert check_food_streak(db).count == 0
