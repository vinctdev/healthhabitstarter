from datetime import datetime

from pydantic import BaseModel


class GoalCreate(BaseModel):
    text: str
    due_date: str | None = None
    queued: bool = False
    kind: str = "daily"
    description: str | None = None


class GoalUpdate(BaseModel):
    text: str | None = None
    done: bool | None = None
    queued: bool | None = None
    position: int | None = None
    due_date: str | None = None
    kind: str | None = None
    description: str | None = None


class GoalResponse(BaseModel):
    id: int
    text: str
    done: bool
    done_at: datetime | None = None
    queued: bool
    due_date: str | None = None
    kind: str
    description: str | None = None
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GoalsForDate(BaseModel):
    goals: list[GoalResponse]
    total: int
    done_count: int


class GoalReorder(BaseModel):
    ids: list[int]


class PushRemainingRequest(BaseModel):
    from_date: str
    to_date: str


class PolishRequest(BaseModel):
    text: str


class PolishResponse(BaseModel):
    polished: str


class StreakResponse(BaseModel):
    count: int
    last_processed_date: str | None = None
