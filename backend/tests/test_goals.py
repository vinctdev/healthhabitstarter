"""Daily goals can only be created for today or later, the daily plan shows nothing else."""

from datetime import datetime

import pytest


@pytest.fixture(autouse=True)
def _now(set_now):
    set_now(datetime(2026, 11, 12, 2, 0))  # before the 04:00 day start: still Nov 11


def test_daily_goal_defaults_to_the_active_day(client):
    response = client.post("/api/goals/", json={"text": "Read"})
    assert response.status_code == 201
    assert response.json()["due_date"] == "2026-11-11"


def test_daily_goal_for_tomorrow_is_accepted(client):
    response = client.post("/api/goals/", json={"text": "Read", "due_date": "2026-11-12"})
    assert response.status_code == 201


def test_daily_goal_in_the_past_is_rejected(client):
    response = client.post("/api/goals/", json={"text": "Read", "due_date": "2026-11-10"})
    assert response.status_code == 422


def test_short_term_goal_keeps_its_own_date(client):
    goal = {"text": "Book trip", "kind": "short", "due_date": "2026-11-10"}
    assert client.post("/api/goals/", json=goal).status_code == 201


def test_push_merges_goals_already_planned_for_the_target_day(client):
    for text, day in [
        ("Read 20 pages", "2026-11-11"),
        ("Walk", "2026-11-11"),
        ("read 20 pages ", "2026-11-12"),
    ]:
        client.post("/api/goals/", json={"text": text, "due_date": day})

    response = client.post(
        "/api/goals/push", json={"from_date": "2026-11-11", "to_date": "2026-11-12"}
    )

    assert response.json()["moved"] == 2
    assert client.get("/api/goals/2026-11-11").json()["total"] == 0
    tomorrow = [g["text"] for g in client.get("/api/goals/2026-11-12").json()["goals"]]
    assert tomorrow == ["read 20 pages ", "Walk"]
