import json
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PushupEntry
from ..schemas.pushups import (
    VARIANTS,
    PushupBucket,
    PushupEntryCreate,
    PushupEntryResponse,
    PushupEntryUpdate,
    PushupSeries,
    PushupStats,
    VariantBreakdown,
)
from .settings import get_active_date

router = APIRouter(prefix="/api/pushups", tags=["pushups"])

MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _month_start(d: date) -> date:
    return d.replace(day=1)


def _shift_month(d: date, delta: int) -> date:
    m = d.month - 1 + delta
    y = d.year + m // 12
    m = m % 12 + 1
    return date(y, m, 1)


def _parse_date(value: str) -> date | None:
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def _variant_reps(entry: PushupEntry) -> dict[str, int]:
    try:
        data = json.loads(entry.variant_reps)
    except (json.JSONDecodeError, TypeError):
        return {}
    if not isinstance(data, dict):
        return {}
    return {k: v for k, v in data.items() if isinstance(v, (int, float))}


def _accumulate(
    entry_reps: dict[str, int],
    reps: dict[str, int],
    entries: dict[str, int],
) -> None:
    for variant, value in entry_reps.items():
        reps[variant] = reps.get(variant, 0) + value
        entries[variant] = entries.get(variant, 0) + 1


def _empty_breakdown(reps: dict[str, int], entries: dict[str, int]) -> list[VariantBreakdown]:
    return [
        VariantBreakdown(variant=v, reps=reps.get(v, 0), entries=entries.get(v, 0))
        for v in VARIANTS
    ]


@router.get("/", response_model=list[PushupEntryResponse])
def get_entries(db: Session = Depends(get_db)):
    return db.query(PushupEntry).order_by(PushupEntry.date.desc(), PushupEntry.id.desc()).all()


@router.post("/", response_model=PushupEntryResponse)
def create_entry(data: PushupEntryCreate, db: Session = Depends(get_db)):
    entry = PushupEntry(
        date=data.date,
        time=data.time,
        variant_reps=json.dumps(data.variant_reps),
        notes=data.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/{entry_id}", response_model=PushupEntryResponse)
def update_entry(entry_id: int, data: PushupEntryUpdate, db: Session = Depends(get_db)):
    entry = db.query(PushupEntry).filter(PushupEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Push-up entry not found")

    changes = data.model_dump(exclude_unset=True)
    if "date" in changes:
        entry.date = changes["date"]
    if "time" in changes:
        entry.time = changes["time"]
    if "variant_reps" in changes:
        entry.variant_reps = json.dumps(changes["variant_reps"])
    if "notes" in changes:
        entry.notes = changes["notes"]

    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(PushupEntry).filter(PushupEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Push-up entry not found")
    db.delete(entry)
    db.commit()


@router.get("/stats", response_model=PushupStats)
def get_stats(db: Session = Depends(get_db)):
    entries = db.query(PushupEntry).all()
    today = get_active_date(db)
    week_start = _week_start(today)
    month_start = _month_start(today)

    total_reps = 0
    reps_this_week = 0
    reps_this_month = 0
    today_reps: dict[str, int] = {}
    today_entries: dict[str, int] = {}
    week_reps: dict[str, int] = {}
    week_entries: dict[str, int] = {}
    month_reps: dict[str, int] = {}
    month_entries: dict[str, int] = {}

    for entry in entries:
        entry_reps = _variant_reps(entry)
        entry_total = sum(entry_reps.values())
        total_reps += entry_total
        parsed = _parse_date(entry.date)
        if parsed is not None:
            if parsed == today:
                _accumulate(entry_reps, today_reps, today_entries)
            if parsed >= week_start:
                reps_this_week += entry_total
                _accumulate(entry_reps, week_reps, week_entries)
            if parsed >= month_start:
                reps_this_month += entry_total
                _accumulate(entry_reps, month_reps, month_entries)

    return PushupStats(
        total_reps=total_reps,
        total_entries=len(entries),
        reps_this_week=reps_this_week,
        reps_this_month=reps_this_month,
        breakdown_today=_empty_breakdown(today_reps, today_entries),
        breakdown_week=_empty_breakdown(week_reps, week_entries),
        breakdown_month=_empty_breakdown(month_reps, month_entries),
    )


@router.get("/series", response_model=PushupSeries)
def get_series(
    granularity: str = Query("week", pattern="^(day|week|month)$"),
    buckets: int = Query(12, ge=1, le=52),
    db: Session = Depends(get_db),
):
    today = get_active_date(db)

    if granularity == "week":
        current = _week_start(today)
        starts = [current - timedelta(weeks=i) for i in range(buckets - 1, -1, -1)]
        labels = [f"W{d.isocalendar()[1]:02d}" for d in starts]
    elif granularity == "month":
        current = _month_start(today)
        starts = [_shift_month(current, -i) for i in range(buckets - 1, -1, -1)]
        labels = [f"{MONTH_LABELS[d.month - 1]} '{str(d.year)[2:]}" for d in starts]
    else:
        starts = [today - timedelta(days=i) for i in range(buckets - 1, -1, -1)]
        labels = [f"{MONTH_LABELS[d.month - 1]} {d.day}" for d in starts]

    def bucket_start(d: date) -> date:
        if granularity == "week":
            return _week_start(d)
        if granularity == "month":
            return _month_start(d)
        return d

    start_of_buckets = starts[0]
    entries = db.query(PushupEntry).filter(PushupEntry.date >= start_of_buckets.isoformat()).all()

    rep_map: dict[str, int] = {d.isoformat(): 0 for d in starts}
    entry_map: dict[str, int] = {d.isoformat(): 0 for d in starts}
    variant_map: dict[str, dict[str, int]] = {d.isoformat(): {} for d in starts}

    window_reps: dict[str, int] = {}
    window_entries: dict[str, int] = {}

    for entry in entries:
        parsed = _parse_date(entry.date)
        if parsed is None:
            continue
        entry_reps = _variant_reps(entry)
        entry_total = sum(entry_reps.values())

        key = bucket_start(parsed).isoformat()
        if key in rep_map:
            rep_map[key] += entry_total
            entry_map[key] += 1
            bucket_variants = variant_map[key]
            for variant, reps in entry_reps.items():
                bucket_variants[variant] = bucket_variants.get(variant, 0) + reps

        for variant, reps in entry_reps.items():
            window_reps[variant] = window_reps.get(variant, 0) + reps
            window_entries[variant] = window_entries.get(variant, 0) + 1

    result_buckets = [
        PushupBucket(
            label=labels[i],
            start_date=starts[i].isoformat(),
            reps=rep_map[starts[i].isoformat()],
            entries=entry_map[starts[i].isoformat()],
            variants=variant_map[starts[i].isoformat()],
        )
        for i in range(len(starts))
    ]

    return PushupSeries(
        granularity=granularity,
        buckets=result_buckets,
        breakdown=_empty_breakdown(window_reps, window_entries),
    )
