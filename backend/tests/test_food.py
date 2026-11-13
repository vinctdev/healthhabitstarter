"""Food input validation: nutrients can't be negative, amounts must be positive."""

import pytest

ENTRY = {
    "date": "2026-11-02",
    "time": "12:30",
    "meal_type": "lunch",
    "name": "Test",
    "emoji": "🍽️",
    "amount": 100,
    "unit": "g",
    "calories": 500,
}


def test_valid_entry_is_accepted(client):
    assert client.post("/api/food/", json=ENTRY).status_code == 201


@pytest.mark.parametrize(
    "field,value",
    [("calories", -5000), ("protein", -1), ("fiber", -0.5), ("amount", -100), ("amount", 0)],
)
def test_invalid_entry_is_rejected(client, field, value):
    assert client.post("/api/food/", json={**ENTRY, field: value}).status_code == 422


def test_negative_template_is_rejected(client):
    template = {"label": "T", "name": "T", "emoji": "🍽️", "amount": -100, "unit": "g"}
    assert client.post("/api/food/templates", json=template).status_code == 422
