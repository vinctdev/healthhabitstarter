from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

PosFloat = Annotated[float, Field(gt=0)]
Effort = Annotated[int, Field(ge=1, le=10)]


class RunCreate(BaseModel):
    start_time: str
    distance_km: PosFloat
    duration_minutes: PosFloat
    location: str
    temperature: float | None = None
    perceived_effort: Effort | None = None


class RunUpdate(BaseModel):
    start_time: str | None = None
    distance_km: PosFloat | None = None
    duration_minutes: PosFloat | None = None
    location: str | None = None
    temperature: float | None = None
    perceived_effort: Effort | None = None


class RunResponse(BaseModel):
    id: int
    start_time: datetime
    distance_km: float
    duration_minutes: float
    location: str
    temperature: float | None = None
    perceived_effort: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RunStats(BaseModel):
    total_runs: int
    total_km: float
    total_minutes: float
    avg_pace_min_per_km: float | None = None
    avg_speed_kmh: float | None = None
    best_pace_min_per_km: float | None = None


class HeartRateZones(BaseModel):
    light: float | None = None
    moderate: float | None = None
    vigorous: float | None = None
    peak: float | None = None


class RunCardioResponse(BaseModel):
    id: int
    run_id: int
    avg_heart_rate: float | None = None
    active_zone_minutes: float | None = None
    calories_kcal: float | None = None
    cardio_load: float | None = None
    heart_rate_zones: HeartRateZones | None = None
    steps: int | None = None
    fetched_at: datetime

    model_config = {"from_attributes": True}


class RunWithCardioResponse(RunResponse):
    cardio: RunCardioResponse | None = None
