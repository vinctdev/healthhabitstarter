from fastapi.testclient import TestClient

from app.main import app
from app.models import KnownFood, Supplement
from app.seed_foods import KNOWN_FOODS
from app.seed_supplements import KNOWN_SUPPLEMENTS


def test_startup_syncs_the_built_in_libraries(db):
    first_food = KNOWN_FOODS[0]
    db.add(KnownFood(**{**first_food, "emoji": "❓"}))  # outdated entry
    db.add(KnownFood(**{**first_food, "name": "Removed food"}))  # no longer in the seed list
    db.commit()

    with TestClient(app):
        pass

    foods = {f.name: f for f in db.query(KnownFood).all()}
    assert set(foods) == {f["name"] for f in KNOWN_FOODS}
    assert foods[first_food["name"]].emoji == first_food["emoji"]
    assert {s.name for s in db.query(Supplement).all()} == {s["name"] for s in KNOWN_SUPPLEMENTS}
