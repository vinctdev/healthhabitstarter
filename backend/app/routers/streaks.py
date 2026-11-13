from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.goals import StreakResponse
from .goals import check_streak, get_or_create_streak

router = APIRouter(prefix="/api/streaks", tags=["streaks"])


@router.get("/", response_model=StreakResponse)
def get_streak(db: Session = Depends(get_db)):
    streak = get_or_create_streak(db)
    return StreakResponse(
        count=streak.count,
        last_processed_date=streak.last_processed_date,
    )


@router.post("/check", response_model=StreakResponse)
def check_streak_endpoint(db: Session = Depends(get_db)):
    streak = check_streak(db)
    return StreakResponse(
        count=streak.count,
        last_processed_date=streak.last_processed_date,
    )
