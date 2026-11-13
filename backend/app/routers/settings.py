import json
from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import UserSettings
from ..timeutils import active_date

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsResponse(BaseModel):
    wake_hour: int
    sleep_hour: int
    calorie_goal: int
    day_start_hour: int
    sport_reasons: list[str] | None = None
    sport_goal: str | None = None


class SettingsUpdate(BaseModel):
    wake_hour: int | None = None
    sleep_hour: int | None = None
    calorie_goal: int | None = None
    day_start_hour: int | None = Field(default=None, ge=0, le=12)
    sport_reasons: list[str] | None = None
    sport_goal: str | None = None


def get_or_create_settings(db: Session) -> UserSettings:
    settings = db.query(UserSettings).first()
    if not settings:
        settings = UserSettings(wake_hour=8, sleep_hour=24)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def get_active_date(db: Session) -> date:
    """Today's date according to the user's configured day boundary."""
    return active_date(get_or_create_settings(db).day_start_hour)


def _serialize_settings(s: UserSettings) -> dict:
    return {
        "wake_hour": s.wake_hour,
        "sleep_hour": s.sleep_hour,
        "calorie_goal": s.calorie_goal,
        "day_start_hour": s.day_start_hour,
        "sport_reasons": json.loads(s.sport_reasons) if s.sport_reasons else None,
        "sport_goal": s.sport_goal,
    }


@router.get("/", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return _serialize_settings(get_or_create_settings(db))


@router.patch("/", response_model=SettingsResponse)
def update_settings(update: SettingsUpdate, db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)
    payload = update.model_dump(exclude_unset=True)
    if "wake_hour" in payload:
        settings.wake_hour = payload["wake_hour"]
    if "sleep_hour" in payload:
        settings.sleep_hour = payload["sleep_hour"]
    if "calorie_goal" in payload:
        settings.calorie_goal = payload["calorie_goal"]
    if "day_start_hour" in payload:
        settings.day_start_hour = payload["day_start_hour"]
    if "sport_reasons" in payload:
        reasons = payload["sport_reasons"]
        settings.sport_reasons = json.dumps(reasons, ensure_ascii=False) if reasons else None
    if "sport_goal" in payload:
        settings.sport_goal = payload["sport_goal"]
    db.commit()
    db.refresh(settings)
    return _serialize_settings(settings)
