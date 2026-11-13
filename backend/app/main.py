from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.orm import Session

from .database import SessionLocal
from .health_providers import get_health_provider
from .routers import (
    ai,
    body_metrics,
    chat,
    food,
    goals,
    health_data,
    pushups,
    runs,
    settings,
    streaks,
    supplements,
)

get_health_provider()  # fail fast on an invalid HEALTH_PROVIDER


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """On startup: sync the built-in food and supplement libraries (defined below)."""
    seed_known_foods()
    seed_supplements()
    yield


app = FastAPI(
    title="Health Habit Starter API",
    description=(
        "Self-hosted personal health dashboard - habits, goals, nutrition, "
        "sport, supplements, sleep, body metrics and an AI mentor."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# No CORS middleware on purpose: the frontend always reaches the API from the same origin
# (nginx in Docker, the Vite proxy in development). Allowing other origins would let any website
# open in the browser read this login-less API.

app.include_router(goals.router)
app.include_router(streaks.router)
app.include_router(settings.router)
app.include_router(food.router)
app.include_router(runs.router)
app.include_router(pushups.router)
app.include_router(supplements.router)
app.include_router(health_data.router)
app.include_router(body_metrics.router)
app.include_router(chat.router)
app.include_router(ai.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


def seed_known_foods():
    from .models import KnownFood
    from .seed_foods import KNOWN_FOODS

    db: Session = SessionLocal()
    try:
        existing = {f.name: f for f in db.query(KnownFood).all()}
        seed_names = {item["name"] for item in KNOWN_FOODS}
        changed = False

        for item in KNOWN_FOODS:
            if item["name"] in existing:
                f = existing[item["name"]]
                if f.emoji != item["emoji"] or f.category != item["category"]:
                    f.emoji = item["emoji"]
                    f.category = item["category"]
                    changed = True
            else:
                db.add(KnownFood(**item))
                changed = True

        stale = [f for name, f in existing.items() if name not in seed_names]
        for f in stale:
            db.delete(f)
            changed = True

        if changed:
            db.commit()
    finally:
        db.close()


def seed_supplements():
    from .models import Supplement
    from .seed_supplements import KNOWN_SUPPLEMENTS

    db: Session = SessionLocal()
    try:
        existing = {s.name: s for s in db.query(Supplement).all()}
        seed_names = {item["name"] for item in KNOWN_SUPPLEMENTS}
        changed = False

        for item in KNOWN_SUPPLEMENTS:
            if item["name"] in existing:
                s = existing[item["name"]]
                if (
                    s.emoji != item["emoji"]
                    or s.category != item["category"]
                    or s.default_dosage != item["default_dosage"]
                    or s.default_unit != item["default_unit"]
                    or s.tags != item.get("tags")
                ):
                    s.emoji = item["emoji"]
                    s.category = item["category"]
                    s.default_dosage = item["default_dosage"]
                    s.default_unit = item["default_unit"]
                    s.tags = item.get("tags")
                    changed = True
            else:
                db.add(Supplement(**item))
                changed = True

        stale = [s for name, s in existing.items() if name not in seed_names]
        for s in stale:
            db.delete(s)
            changed = True

        if changed:
            db.commit()
    finally:
        db.close()
