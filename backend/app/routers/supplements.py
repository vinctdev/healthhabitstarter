from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Supplement, SupplementLog, UserSupplement
from ..schemas.supplements import (
    StackItemResponse,
    SupplementResponse,
    ToggleRequest,
    UserSupplementCreate,
    UserSupplementResponse,
    UserSupplementUpdate,
)

router = APIRouter(prefix="/api/supplements", tags=["supplements"])

VALID_TIME_WINDOWS = {"morning", "midday", "evening", "bedtime", "anytime"}


@router.get("/library", response_model=list[SupplementResponse])
def get_library(db: Session = Depends(get_db)):
    return db.query(Supplement).order_by(Supplement.name).all()


@router.get("/stack/{date}", response_model=list[StackItemResponse])
def get_stack(date: str, db: Session = Depends(get_db)):
    user_supps = (
        db.query(UserSupplement).order_by(UserSupplement.time_window, UserSupplement.id).all()
    )

    result = []
    for us in user_supps:
        supp = db.query(Supplement).filter(Supplement.id == us.supplement_id).first()
        if not supp:
            continue

        log_today = (
            db.query(SupplementLog)
            .filter(SupplementLog.user_supplement_id == us.id, SupplementLog.date == date)
            .first()
        )
        taken_today = log_today is not None

        last_log = (
            db.query(SupplementLog)
            .filter(SupplementLog.user_supplement_id == us.id, SupplementLog.date <= date)
            .order_by(SupplementLog.date.desc())
            .first()
        )

        if us.interval_days == 1:
            is_due = True
        elif last_log is None:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
            if us.created_at:
                created_date = us.created_at.date()
                is_due = target_date >= created_date
            else:
                is_due = True
        else:
            last_date = datetime.strptime(last_log.date, "%Y-%m-%d").date()
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
            days_since = (target_date - last_date).days
            is_due = days_since >= us.interval_days

        last_taken_date = last_log.date if last_log else None

        result.append(
            {
                "id": us.id,
                "supplement_id": us.supplement_id,
                "name": supp.name,
                "emoji": supp.emoji,
                "tags": supp.tags,
                "custom_tags": us.custom_tags,
                "dosage": us.dosage,
                "unit": us.unit,
                "time_window": us.time_window,
                "interval_days": us.interval_days,
                "is_due_today": is_due,
                "taken_today": taken_today,
                "last_taken_date": last_taken_date,
            }
        )

    return result


@router.post("/stack", response_model=UserSupplementResponse)
def create_user_supplement(data: UserSupplementCreate, db: Session = Depends(get_db)):
    if data.time_window not in VALID_TIME_WINDOWS:
        raise HTTPException(status_code=400, detail=f"Invalid time window: {data.time_window}")
    if data.interval_days < 1:
        raise HTTPException(status_code=400, detail="Interval must be at least 1 day")

    supp = db.query(Supplement).filter(Supplement.id == data.supplement_id).first()
    if not supp:
        raise HTTPException(status_code=404, detail="Supplement not found in the library")

    entry = UserSupplement(
        supplement_id=data.supplement_id,
        dosage=data.dosage,
        unit=data.unit,
        time_window=data.time_window,
        interval_days=data.interval_days,
        custom_tags=data.custom_tags,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {
        "id": entry.id,
        "supplement_id": entry.supplement_id,
        "dosage": entry.dosage,
        "unit": entry.unit,
        "time_window": entry.time_window,
        "interval_days": entry.interval_days,
        "custom_tags": entry.custom_tags,
        "created_at": entry.created_at.isoformat() if entry.created_at else "",
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else "",
    }


@router.patch("/stack/{stack_id}", response_model=UserSupplementResponse)
def update_user_supplement(
    stack_id: int, data: UserSupplementUpdate, db: Session = Depends(get_db)
):
    entry = db.query(UserSupplement).filter(UserSupplement.id == stack_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Stack entry not found")

    if data.time_window is not None and data.time_window not in VALID_TIME_WINDOWS:
        raise HTTPException(status_code=400, detail=f"Invalid time window: {data.time_window}")
    if data.interval_days is not None and data.interval_days < 1:
        raise HTTPException(status_code=400, detail="Interval must be at least 1 day")

    if data.dosage is not None:
        entry.dosage = data.dosage
    if data.unit is not None:
        entry.unit = data.unit
    if data.time_window is not None:
        entry.time_window = data.time_window
    if data.interval_days is not None:
        entry.interval_days = data.interval_days
    if data.custom_tags is not None:
        entry.custom_tags = data.custom_tags

    db.commit()
    db.refresh(entry)

    return {
        "id": entry.id,
        "supplement_id": entry.supplement_id,
        "dosage": entry.dosage,
        "unit": entry.unit,
        "time_window": entry.time_window,
        "interval_days": entry.interval_days,
        "custom_tags": entry.custom_tags,
        "created_at": entry.created_at.isoformat() if entry.created_at else "",
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else "",
    }


@router.delete("/stack/{stack_id}")
def delete_user_supplement(stack_id: int, db: Session = Depends(get_db)):
    entry = db.query(UserSupplement).filter(UserSupplement.id == stack_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Stack entry not found")

    db.query(SupplementLog).filter(SupplementLog.user_supplement_id == stack_id).delete()
    db.delete(entry)
    db.commit()

    return {"ok": True}


@router.post("/toggle")
def toggle_supplement(data: ToggleRequest, db: Session = Depends(get_db)):
    entry = db.query(UserSupplement).filter(UserSupplement.id == data.user_supplement_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Stack entry not found")

    existing = (
        db.query(SupplementLog)
        .filter(
            SupplementLog.user_supplement_id == data.user_supplement_id,
            SupplementLog.date == data.date,
        )
        .first()
    )

    if existing:
        db.delete(existing)
        db.commit()
        return {"taken": False}
    else:
        log = SupplementLog(
            user_supplement_id=data.user_supplement_id,
            date=data.date,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return {"taken": True}
