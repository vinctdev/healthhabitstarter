import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..health_providers import get_health_provider
from ..models import Run, RunCardio
from ..schemas.runs import (
    HeartRateZones,
    RunCardioResponse,
    RunCreate,
    RunResponse,
    RunStats,
    RunUpdate,
)
from ..timeutils import local_now

router = APIRouter(prefix="/api/runs", tags=["runs"])

# Plausible pace range in min/km: faster than the marathon world record is a typo,
# slower is walking. Keep in sync with frontend/src/components/sport/RunFormModal.tsx.
MIN_PACE = 2.0
MAX_PACE = 30.0


def _validate_run(run: Run) -> None:
    """Reject runs in the future or with an implausible pace (start_time is local time)."""
    if run.start_time > local_now().replace(tzinfo=None):
        raise HTTPException(status_code=422, detail="Start time is in the future")
    if not MIN_PACE <= run.duration_minutes / run.distance_km <= MAX_PACE:
        raise HTTPException(
            status_code=422, detail=f"Pace must be between {MIN_PACE:g} and {MAX_PACE:g} min/km"
        )


@router.get("/", response_model=list[RunResponse])
def get_runs(db: Session = Depends(get_db)):
    return db.query(Run).order_by(Run.start_time.desc()).all()


@router.post("/", response_model=RunResponse)
def create_run(data: RunCreate, db: Session = Depends(get_db)):
    run = Run(
        start_time=datetime.fromisoformat(data.start_time),
        distance_km=data.distance_km,
        duration_minutes=data.duration_minutes,
        location=data.location,
        temperature=data.temperature,
        perceived_effort=data.perceived_effort,
    )
    _validate_run(run)
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


@router.patch("/{run_id}", response_model=RunResponse)
def update_run(run_id: int, data: RunUpdate, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    if data.start_time is not None:
        run.start_time = datetime.fromisoformat(data.start_time)
    if data.distance_km is not None:
        run.distance_km = data.distance_km
    if data.duration_minutes is not None:
        run.duration_minutes = data.duration_minutes
    if data.location is not None:
        run.location = data.location
    if data.temperature is not None:
        run.temperature = data.temperature
    if data.perceived_effort is not None:
        run.perceived_effort = data.perceived_effort

    _validate_run(run)
    db.commit()
    db.refresh(run)
    return run


@router.delete("/{run_id}", status_code=204)
def delete_run(run_id: int, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    db.delete(run)
    db.commit()


@router.get("/stats", response_model=RunStats)
def get_run_stats(db: Session = Depends(get_db)):
    total_runs = db.query(func.count(Run.id)).scalar() or 0
    if total_runs == 0:
        return RunStats(total_runs=0, total_km=0, total_minutes=0)

    total_km = db.query(func.sum(Run.distance_km)).scalar() or 0
    total_minutes = db.query(func.sum(Run.duration_minutes)).scalar() or 0

    runs = db.query(Run.distance_km, Run.duration_minutes).all()
    paces = [(t / d) if d > 0 else None for d, t in runs]
    paces = [p for p in paces if p is not None]

    avg_pace = total_minutes / total_km if total_km > 0 else None
    avg_speed = (total_km * 60) / total_minutes if total_minutes > 0 else None
    best_pace = min(paces) if paces else None

    return RunStats(
        total_runs=total_runs,
        total_km=round(total_km, 2),
        total_minutes=round(total_minutes, 1),
        avg_pace_min_per_km=round(avg_pace, 2) if avg_pace is not None else None,
        avg_speed_kmh=round(avg_speed, 1) if avg_speed is not None else None,
        best_pace_min_per_km=round(best_pace, 2) if best_pace is not None else None,
    )


@router.get("/{run_id}/cardio", response_model=RunCardioResponse | None)
def get_run_cardio(run_id: int, db: Session = Depends(get_db)):
    """Stored cardio data of a run, or null if none was fetched yet."""
    cardio = db.query(RunCardio).filter(RunCardio.run_id == run_id).first()
    return _cardio_response(cardio) if cardio else None


@router.post("/{run_id}/fetch-cardio", response_model=RunCardioResponse)
async def fetch_run_cardio(run_id: int, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    existing = db.query(RunCardio).filter(RunCardio.run_id == run_id).first()

    start_time = datetime(
        run.start_time.year,
        run.start_time.month,
        run.start_time.day,
        run.start_time.hour,
        run.start_time.minute,
        run.start_time.second,
    )
    end_time = start_time + timedelta_from_minutes(run.duration_minutes)

    provider = get_health_provider()
    if not provider.enabled:
        raise HTTPException(status_code=409, detail="No health provider configured")
    cardio = await provider.run_cardio(start_time, end_time)
    if cardio is None:
        raise HTTPException(status_code=404, detail="No matching run found at the health provider")

    if not existing:
        existing = RunCardio(run_id=run_id)
    existing.avg_heart_rate = cardio.avg_heart_rate
    existing.active_zone_minutes = cardio.active_zone_minutes
    existing.calories_kcal = cardio.calories_kcal
    existing.cardio_load = cardio.cardio_load
    existing.heart_rate_zones = (
        json.dumps(cardio.heart_rate_zones) if cardio.heart_rate_zones else None
    )
    existing.steps = cardio.steps
    existing.exercise_data = cardio.raw
    existing.fetched_at = datetime.utcnow()

    db.add(existing)
    db.commit()
    db.refresh(existing)
    return _cardio_response(existing)


def _cardio_response(cardio: RunCardio) -> RunCardioResponse:
    zones = None
    if cardio.heart_rate_zones:
        try:
            zones_raw = json.loads(cardio.heart_rate_zones)
            zones = HeartRateZones(**zones_raw)
        except (json.JSONDecodeError, TypeError):
            pass

    return RunCardioResponse(
        id=cardio.id,
        run_id=cardio.run_id,
        avg_heart_rate=cardio.avg_heart_rate,
        active_zone_minutes=cardio.active_zone_minutes,
        calories_kcal=cardio.calories_kcal,
        cardio_load=cardio.cardio_load,
        heart_rate_zones=zones,
        steps=cardio.steps,
        fetched_at=cardio.fetched_at,
    )


def timedelta_from_minutes(minutes: float):
    from datetime import timedelta

    return timedelta(minutes=minutes)
