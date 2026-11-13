import json
from datetime import datetime

from pydantic import BaseModel, computed_field, field_validator

# Push-up variants in display order, with the label used in AI chat answers.
# The hand position shifts the focus: wide → chest, close (diamond) → triceps,
# pike (hips up) → shoulders. Keep in sync with frontend/src/components/sport/pushupVariants.ts.
VARIANTS = {
    "standard": "Standard",
    "wide": "Wide",
    "close": "Close-grip",
    "pike": "Pike",
}


def _parse_variant_reps(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return {}
    return value


def _validate_variant_reps(value: dict) -> dict[str, int]:
    if not isinstance(value, dict) or not value:
        raise ValueError("At least one variant is required")
    cleaned: dict[str, int] = {}
    for variant, reps in value.items():
        key = str(variant).strip().lower()
        if key not in VARIANTS:
            raise ValueError(f"Unknown push-up variant: {variant}")
        try:
            reps_int = int(reps)
        except (ValueError, TypeError) as err:
            raise ValueError(f"Invalid rep count for {variant}") from err
        if reps_int <= 0:
            raise ValueError("Reps must be greater than 0")
        cleaned[key] = reps_int
    return cleaned


class PushupEntryCreate(BaseModel):
    date: str
    time: str | None = None
    variant_reps: dict[str, int]
    notes: str | None = None

    @field_validator("variant_reps")
    @classmethod
    def validate_variant_reps(cls, value: dict) -> dict[str, int]:
        return _validate_variant_reps(value)


class PushupEntryUpdate(BaseModel):
    date: str | None = None
    time: str | None = None
    variant_reps: dict[str, int] | None = None
    notes: str | None = None

    @field_validator("variant_reps")
    @classmethod
    def validate_variant_reps(cls, value: dict | None) -> dict[str, int] | None:
        if value is None:
            return value
        return _validate_variant_reps(value)


class PushupEntryResponse(BaseModel):
    id: int
    date: str
    time: str | None = None
    variant_reps: dict[str, int]
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("variant_reps", mode="before")
    @classmethod
    def parse_variant_reps(cls, value):
        return _parse_variant_reps(value)

    @computed_field
    @property
    def total_reps(self) -> int:
        return sum(self.variant_reps.values())


class VariantBreakdown(BaseModel):
    variant: str
    reps: int
    entries: int


class PushupStats(BaseModel):
    total_reps: int
    total_entries: int
    reps_this_week: int
    reps_this_month: int
    breakdown_today: list[VariantBreakdown]
    breakdown_week: list[VariantBreakdown]
    breakdown_month: list[VariantBreakdown]


class PushupBucket(BaseModel):
    label: str
    start_date: str
    reps: int
    entries: int
    variants: dict[str, int]


class PushupSeries(BaseModel):
    granularity: str
    buckets: list[PushupBucket]
    breakdown: list[VariantBreakdown]
