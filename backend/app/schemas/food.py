from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

# Input constraints: nutrients can't be negative, amounts must be positive.
NonNegInt = Annotated[int, Field(ge=0)]
NonNegFloat = Annotated[float, Field(ge=0)]
PosFloat = Annotated[float, Field(gt=0)]


class FoodEntryCreate(BaseModel):
    date: str
    time: str
    meal_type: str
    name: str
    emoji: str
    is_drink: bool = False
    amount: PosFloat | None = None
    unit: str | None = None
    grams_total: PosFloat | None = None
    calories: NonNegInt = 0
    protein: NonNegFloat = 0
    carbs: NonNegFloat = 0
    fat: NonNegFloat = 0
    salt: NonNegFloat = 0
    sugar: NonNegFloat = 0
    water_ml: NonNegInt = 0
    fiber: NonNegFloat | None = None
    saturated_fat: NonNegFloat | None = None
    notes: str | None = None


class FoodEntryUpdate(BaseModel):
    time: str | None = None
    meal_type: str | None = None
    name: str | None = None
    emoji: str | None = None
    is_drink: bool | None = None
    amount: PosFloat | None = None
    unit: str | None = None
    grams_total: PosFloat | None = None
    calories: NonNegInt | None = None
    protein: NonNegFloat | None = None
    carbs: NonNegFloat | None = None
    fat: NonNegFloat | None = None
    salt: NonNegFloat | None = None
    sugar: NonNegFloat | None = None
    water_ml: NonNegInt | None = None
    fiber: NonNegFloat | None = None
    saturated_fat: NonNegFloat | None = None
    notes: str | None = None


class FoodEntryResponse(BaseModel):
    id: int
    date: str
    time: str
    meal_type: str
    name: str
    emoji: str
    is_drink: bool
    amount: float | None = None
    unit: str | None = None
    grams_total: float | None = None
    calories: int
    protein: float
    carbs: float
    fat: float
    salt: float
    sugar: float
    water_ml: int
    fiber: float | None = None
    saturated_fat: float | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DaySummary(BaseModel):
    date: str
    total_calories: int
    total_protein: float
    total_carbs: float
    total_fat: float
    total_salt: float
    total_sugar: float
    total_water_ml: int
    total_fiber: float | None = None
    total_saturated_fat: float | None = None
    fiber_known_entries: int = 0
    saturated_fat_known_entries: int = 0
    entry_count: int
    calorie_goal: int | None = None


class FoodStreakResponse(BaseModel):
    count: int
    last_processed_date: str | None = None


class WeeklyEntry(BaseModel):
    date: str
    total_calories: int
    entry_count: int


class AveragesResponse(BaseModel):
    avg_calories: float
    avg_protein: float
    avg_fiber: float | None = None
    avg_saturated_fat: float | None = None
    days_counted: int


class RecentMeal(BaseModel):
    name: str
    emoji: str
    is_drink: bool
    meal_type: str
    amount: float | None = None
    unit: str | None = None
    grams_total: float | None = None
    calories: int
    protein: float
    carbs: float
    fat: float
    salt: float
    sugar: float
    fiber: float | None = None
    saturated_fat: float | None = None


class KnownFoodResponse(BaseModel):
    id: int
    name: str
    emoji: str
    category: str

    model_config = {"from_attributes": True}


class PhotoAnalysisResponse(BaseModel):
    name: str
    emoji: str
    calories: int
    protein: float
    carbs: float
    fat: float
    salt: float
    sugar: float
    water_ml: int = 0
    fiber: float | None = None
    saturated_fat: float | None = None
    amount: float | None = None
    unit: str | None = None


class NutritionSuggestionRequest(BaseModel):
    name: str
    amount: PosFloat
    unit: str


class NutritionSuggestionResponse(BaseModel):
    name: str
    emoji: str
    calories: int
    protein: float
    carbs: float
    fat: float
    salt: float
    sugar: float
    water_ml: int = 0
    fiber: float | None = None
    saturated_fat: float | None = None


class FoodTemplateCreate(BaseModel):
    label: str
    name: str
    emoji: str
    is_drink: bool = False
    amount: PosFloat
    unit: str
    grams_per_piece: PosFloat | None = None
    calories: NonNegInt = 0
    protein: NonNegFloat = 0
    carbs: NonNegFloat = 0
    fat: NonNegFloat = 0
    salt: NonNegFloat = 0
    sugar: NonNegFloat = 0
    water_ml: NonNegInt = 0
    fiber: NonNegFloat | None = None
    saturated_fat: NonNegFloat | None = None


class FoodTemplateUpdate(BaseModel):
    label: str | None = None
    name: str | None = None
    emoji: str | None = None
    is_drink: bool | None = None
    amount: PosFloat | None = None
    unit: str | None = None
    grams_per_piece: PosFloat | None = None
    calories: NonNegInt | None = None
    protein: NonNegFloat | None = None
    carbs: NonNegFloat | None = None
    fat: NonNegFloat | None = None
    salt: NonNegFloat | None = None
    sugar: NonNegFloat | None = None
    water_ml: NonNegInt | None = None
    fiber: NonNegFloat | None = None
    saturated_fat: NonNegFloat | None = None


class FoodTemplateResponse(BaseModel):
    id: int
    label: str
    name: str
    emoji: str
    is_drink: bool
    amount: float
    unit: str
    grams_per_piece: float | None = None
    calories: int
    protein: float
    carbs: float
    fat: float
    salt: float
    sugar: float
    water_ml: int
    fiber: float | None = None
    saturated_fat: float | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TemplateScaleRequest(BaseModel):
    template_id: int
    target_amount: PosFloat


class FoodExportResponse(BaseModel):
    content: str
    filename: str
