from pydantic import BaseModel


class SupplementResponse(BaseModel):
    id: int
    name: str
    emoji: str
    category: str
    default_dosage: str
    default_unit: str
    tags: str | None = None

    model_config = {"from_attributes": True}


class UserSupplementCreate(BaseModel):
    supplement_id: int
    dosage: str
    unit: str
    time_window: str
    interval_days: int = 1
    custom_tags: str | None = None


class UserSupplementUpdate(BaseModel):
    dosage: str | None = None
    unit: str | None = None
    time_window: str | None = None
    interval_days: int | None = None
    custom_tags: str | None = None


class StackItemResponse(BaseModel):
    id: int
    supplement_id: int
    name: str
    emoji: str
    tags: str | None = None
    custom_tags: str | None = None
    dosage: str
    unit: str
    time_window: str
    interval_days: int
    is_due_today: bool
    taken_today: bool
    last_taken_date: str | None = None

    model_config = {"from_attributes": True}


class UserSupplementResponse(BaseModel):
    id: int
    supplement_id: int
    dosage: str
    unit: str
    time_window: str
    interval_days: int
    custom_tags: str | None = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class ToggleRequest(BaseModel):
    user_supplement_id: int
    date: str
