"""Run input validation: positive values, plausible pace, no future start."""

from datetime import datetime, timedelta

import pytest

YESTERDAY = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:00")
RUN = {"start_time": YESTERDAY, "distance_km": 5, "duration_minutes": 30, "location": "Park"}


def test_valid_run_is_accepted(client):
    assert client.post("/api/runs/", json=RUN).status_code == 200


@pytest.mark.parametrize(
    "changes",
    [
        {"duration_minutes": 0},
        {"distance_km": 0},
        {"distance_km": 42, "duration_minutes": 30},  # 0:43 min/km
        {"distance_km": 0.001, "duration_minutes": 600},  # 600000 min/km
        {"start_time": "2099-01-01T08:00:00"},
        {"perceived_effort": 0},
    ],
)
def test_implausible_run_is_rejected(client, changes):
    assert client.post("/api/runs/", json={**RUN, **changes}).status_code == 422


def test_update_checks_the_merged_run(client):
    run_id = client.post("/api/runs/", json=RUN).json()["id"]
    assert client.patch(f"/api/runs/{run_id}", json={"distance_km": 42}).status_code == 422
    assert client.get("/api/runs/").json()[0]["distance_km"] == 5
