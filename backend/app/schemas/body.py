from datetime import datetime

from pydantic import BaseModel


class BodyProfileCreate(BaseModel):
    height_cm: float
    age: int
    gender: str
    occupation: str | None = None


class BodyProfileUpdate(BaseModel):
    height_cm: float | None = None
    age: int | None = None
    gender: str | None = None
    occupation: str | None = None


class BodyProfileResponse(BaseModel):
    id: int
    height_cm: float
    age: int
    gender: str
    occupation: str | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class BodyMeasurementCreate(BaseModel):
    date: str
    weight_kg: float
    body_fat_pct: float | None = None
    muscle_mass_kg: float | None = None


class BodyMeasurementUpdate(BaseModel):
    date: str | None = None
    weight_kg: float | None = None
    body_fat_pct: float | None = None
    muscle_mass_kg: float | None = None


class BodyMeasurementResponse(BaseModel):
    id: int
    date: str
    weight_kg: float
    body_fat_pct: float | None
    muscle_mass_kg: float | None
    bmi: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
