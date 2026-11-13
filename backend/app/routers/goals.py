from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..gemini_client import call_gemini, require_ai
from ..models import Goal, Streak
from ..schemas.goals import (
    GoalCreate,
    GoalReorder,
    GoalResponse,
    GoalsForDate,
    GoalUpdate,
    PolishRequest,
    PolishResponse,
    PushRemainingRequest,
)
from .settings import get_active_date

VALID_KINDS = {"daily", "short", "long"}

router = APIRouter(prefix="/api/goals", tags=["goals"])


def get_or_create_streak(db: Session) -> Streak:
    streak = db.query(Streak).first()
    if not streak:
        streak = Streak(count=0, last_processed_date=None)
        db.add(streak)
        db.commit()
        db.refresh(streak)
    return streak


def check_streak(db: Session) -> Streak:
    streak = get_or_create_streak(db)
    today = get_active_date(db)
    last_processed = streak.last_processed_date

    query = (
        db.query(Goal.due_date)
        .distinct()
        .filter(
            Goal.kind == "daily",
            Goal.due_date.isnot(None),
            Goal.due_date < today.strftime("%Y-%m-%d"),
        )
        .order_by(Goal.due_date)
    )
    if last_processed:
        query = query.filter(Goal.due_date > last_processed)

    all_dates = [row[0] for row in query.all()]
    if not all_dates:
        return streak

    current_count = streak.count
    for d in all_dates:
        goals_on_date = db.query(Goal).filter(Goal.kind == "daily", Goal.due_date == d).all()
        if not goals_on_date:
            continue
        if all(g.done for g in goals_on_date):
            current_count += 1
        else:
            current_count = 0

    streak.count = current_count
    streak.last_processed_date = all_dates[-1]
    db.commit()
    db.refresh(streak)
    return streak


@router.get("", response_model=list[GoalResponse])
def list_goals(
    kind: str = Query(..., description="daily | short | long"),
    db: Session = Depends(get_db),
):
    if kind not in VALID_KINDS:
        raise HTTPException(status_code=400, detail="Invalid kind")

    return (
        db.query(Goal)
        .filter(Goal.kind == kind)
        .order_by(
            Goal.done.asc(),
            Goal.due_date.is_(None),
            Goal.due_date.asc(),
            Goal.position.asc(),
        )
        .all()
    )


@router.get("/{date}", response_model=GoalsForDate)
def get_goals(date: str, db: Session = Depends(get_db)):
    if date == get_active_date(db).isoformat():
        check_streak(db)

    goals = (
        db.query(Goal)
        .filter(Goal.kind == "daily", Goal.due_date == date)
        .order_by(Goal.position)
        .all()
    )
    total = len(goals)
    done_count = sum(1 for g in goals if g.done)
    return GoalsForDate(goals=goals, total=total, done_count=done_count)


@router.post("/", response_model=GoalResponse, status_code=201)
def create_goal(goal: GoalCreate, db: Session = Depends(get_db)):
    kind = goal.kind if goal.kind in VALID_KINDS else "daily"
    today = get_active_date(db).isoformat()
    due = goal.due_date if kind != "daily" else (goal.due_date or today)
    if kind == "daily" and due < today:
        # The daily plan only shows today and tomorrow, so a past daily goal would be lost.
        raise HTTPException(status_code=422, detail="Daily goals can't be in the past")

    pos_query = db.query(func.max(Goal.position)).filter(Goal.kind == kind)
    if kind == "daily":
        pos_query = pos_query.filter(Goal.due_date == due)
    max_pos = pos_query.scalar()

    new_goal = Goal(
        text=goal.text,
        due_date=due,
        queued=goal.queued,
        kind=kind,
        description=goal.description,
        position=(max_pos or 0) + 1,
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal


@router.patch("/{goal_id}", response_model=GoalResponse)
def update_goal(goal_id: int, update: GoalUpdate, db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    update_data = update.model_dump(exclude_unset=True)

    if "done" in update_data:
        goal.done_at = datetime.now() if update_data["done"] else None
        goal.done = update_data["done"]
    if "text" in update_data:
        goal.text = update_data["text"]
    if "queued" in update_data:
        goal.queued = update_data["queued"]
    if "position" in update_data:
        goal.position = update_data["position"]
    if "due_date" in update_data:
        goal.due_date = update_data["due_date"]
    if "kind" in update_data and update_data["kind"] in VALID_KINDS:
        goal.kind = update_data["kind"]
    if "description" in update_data:
        goal.description = update_data["description"]

    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()


@router.put("/reorder")
def reorder_goals(reorder: GoalReorder, db: Session = Depends(get_db)):
    for i, goal_id in enumerate(reorder.ids):
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if goal:
            goal.position = i
    db.commit()
    return {"ok": True}


@router.post("/push")
def push_remaining(body: PushRemainingRequest, db: Session = Depends(get_db)):
    from_goals = (
        db.query(Goal)
        .filter(
            Goal.kind == "daily",
            Goal.due_date == body.from_date,
            Goal.done.is_(False),
        )
        .all()
    )
    if not from_goals:
        return {"ok": True, "moved": 0}

    to_goals = db.query(Goal).filter(Goal.kind == "daily", Goal.due_date == body.to_date).all()
    existing = {g.text.strip().casefold() for g in to_goals}
    next_pos = max((g.position for g in to_goals), default=0) + 1

    for goal in from_goals:
        key = goal.text.strip().casefold()
        if key in existing:  # already planned for that day: merge instead of duplicating
            db.delete(goal)
            continue
        existing.add(key)
        goal.due_date = body.to_date
        goal.position = next_pos
        next_pos += 1

    db.commit()
    return {"ok": True, "moved": len(from_goals)}


@router.post("/polish", response_model=PolishResponse)
async def polish_goal(body: PolishRequest):
    require_ai()

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            "Rewrite the following goal as one concise, "
                            "well-phrased sentence. Keep the meaning and reply "
                            "in the same language as the goal. Return ONLY the "
                            "polished text, with no introduction, no quotes "
                            "and no Markdown:\n\n" + body.text
                        )
                    }
                ]
            }
        ]
    }
    data = await call_gemini(payload, timeout=15)

    candidates = data.get("candidates", [])
    if not candidates:
        polished = body.text
    else:
        parts = candidates[0].get("content", {}).get("parts", [{}])
        polished = parts[0].get("text", "").strip() if parts else body.text

    if not polished:
        polished = body.text

    return PolishResponse(polished=polished)
