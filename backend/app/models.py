from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.sql import func

from .database import Base


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String(500), nullable=False)
    done = Column(Boolean, default=False, nullable=False)
    done_at = Column(DateTime, nullable=True)
    queued = Column(Boolean, default=False, nullable=False)
    due_date = Column(String(10), nullable=True, index=True)
    kind = Column(String(10), default="daily", server_default="daily", nullable=False, index=True)
    description = Column(Text, nullable=True)
    position = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class Streak(Base):
    __tablename__ = "streaks"

    id = Column(Integer, primary_key=True)
    count = Column(Integer, default=0, nullable=False)
    last_processed_date = Column(String(10), nullable=True)


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True)
    wake_hour = Column(Integer, default=8, nullable=False)
    sleep_hour = Column(Integer, default=24, nullable=False)
    calorie_goal = Column(Integer, default=2000, nullable=False)
    day_start_hour = Column(Integer, default=4, server_default="4", nullable=False)
    sport_reasons = Column(Text, nullable=True)
    sport_goal = Column(Text, nullable=True)


class KnownFood(Base):
    __tablename__ = "known_foods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    emoji = Column(String(10), nullable=False)
    category = Column(String(20), nullable=False)


class FoodEntry(Base):
    __tablename__ = "food_entries"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), nullable=False, index=True)
    time = Column(String(5), nullable=False)
    meal_type = Column(String(20), nullable=False)
    name = Column(String(300), nullable=False)
    emoji = Column(String(10), nullable=False)
    is_drink = Column(Boolean, default=False, nullable=False)
    amount = Column(Float, nullable=True)
    unit = Column(String(10), nullable=True)
    grams_total = Column(Float, nullable=True)
    calories = Column(Integer, default=0, nullable=False)
    protein = Column(Float, default=0, nullable=False)
    carbs = Column(Float, default=0, nullable=False)
    fat = Column(Float, default=0, nullable=False)
    salt = Column(Float, default=0, nullable=False)
    sugar = Column(Float, default=0, nullable=False)
    water_ml = Column(Integer, default=0, nullable=False)
    fiber = Column(Float, nullable=True)
    saturated_fat = Column(Float, nullable=True)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class FoodStreak(Base):
    __tablename__ = "food_streaks"

    id = Column(Integer, primary_key=True)
    count = Column(Integer, default=0, nullable=False)
    last_processed_date = Column(String(10), nullable=True)


class FoodTemplate(Base):
    __tablename__ = "food_templates"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String(200), nullable=False)
    name = Column(String(300), nullable=False)
    emoji = Column(String(10), nullable=False)
    is_drink = Column(Boolean, default=False, nullable=False)
    amount = Column(Float, nullable=False)
    unit = Column(String(10), nullable=False)
    grams_per_piece = Column(Float, nullable=True)
    calories = Column(Integer, default=0, nullable=False)
    protein = Column(Float, default=0, nullable=False)
    carbs = Column(Float, default=0, nullable=False)
    fat = Column(Float, default=0, nullable=False)
    salt = Column(Float, default=0, nullable=False)
    sugar = Column(Float, default=0, nullable=False)
    water_ml = Column(Integer, default=0, nullable=False)
    fiber = Column(Float, nullable=True)
    saturated_fat = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class Run(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime, nullable=False, index=True)
    distance_km = Column(Float, nullable=False)
    duration_minutes = Column(Float, nullable=False)
    location = Column(String(20), nullable=False)
    temperature = Column(Float, nullable=True)
    perceived_effort = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class Supplement(Base):
    __tablename__ = "supplements"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    emoji = Column(String(10), nullable=False)
    category = Column(String(50), nullable=False)
    default_dosage = Column(String(20), nullable=False)
    default_unit = Column(String(10), nullable=False)
    tags = Column(String(300), nullable=True)


class UserSupplement(Base):
    __tablename__ = "user_supplements"

    id = Column(Integer, primary_key=True, index=True)
    supplement_id = Column(Integer, nullable=False, index=True)
    dosage = Column(String(20), nullable=False)
    unit = Column(String(10), nullable=False)
    time_window = Column(String(20), nullable=False)
    interval_days = Column(Integer, default=1, nullable=False)
    custom_tags = Column(String(300), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class SupplementLog(Base):
    __tablename__ = "supplement_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_supplement_id = Column(Integer, nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)
    taken_at = Column(DateTime, server_default=func.now(), nullable=False)


class BodyProfile(Base):
    __tablename__ = "body_profile"

    id = Column(Integer, primary_key=True)
    height_cm = Column(Float, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(10), nullable=False)
    occupation = Column(String(200), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class BodyMeasurement(Base):
    __tablename__ = "body_measurements"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), nullable=False, index=True)
    weight_kg = Column(Float, nullable=False)
    body_fat_pct = Column(Float, nullable=True)
    muscle_mass_kg = Column(Float, nullable=True)
    bmi = Column(Float, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class SleepSession(Base):
    __tablename__ = "sleep_sessions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), nullable=False, unique=True, index=True)
    sleep_index = Column(Integer, nullable=False)
    start_time_utc = Column(DateTime, nullable=False)
    end_time_utc = Column(DateTime, nullable=False)
    minutes_in_sleep_period = Column(Integer, nullable=False)
    minutes_awake = Column(Integer, nullable=False)
    minutes_asleep = Column(Integer, nullable=False)
    minutes_to_fall_asleep = Column(Integer, nullable=True)
    minutes_after_wake_up = Column(Integer, nullable=True)
    minutes_deep = Column(Integer, nullable=False, default=0)
    minutes_rem = Column(Integer, nullable=False, default=0)
    minutes_light = Column(Integer, nullable=False, default=0)
    stages_data = Column(Text, nullable=True)
    skin_temperature_celsius = Column(Float, nullable=True)
    baseline_temperature_celsius = Column(Float, nullable=True)
    respiratory_rate_avg = Column(Float, nullable=True)
    respiratory_rate_deep = Column(Float, nullable=True)
    respiratory_rate_light = Column(Float, nullable=True)
    respiratory_rate_rem = Column(Float, nullable=True)
    avg_heart_rate = Column(Float, nullable=True)
    fetched_at = Column(DateTime, server_default=func.now(), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class DailyMetric(Base):
    __tablename__ = "daily_metrics"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), nullable=False, unique=True, index=True)
    resting_heart_rate = Column(Float, nullable=True)
    hrv_rmssd = Column(Float, nullable=True)
    hrv_entropy = Column(Float, nullable=True)
    spo2_avg = Column(Float, nullable=True)
    spo2_low = Column(Float, nullable=True)
    steps = Column(Integer, nullable=True)
    fetched_at = Column(DateTime, server_default=func.now(), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class EnergyAdjustment(Base):
    __tablename__ = "energy_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), nullable=False, index=True)
    type = Column(String(30), default="manual", nullable=False)
    magnitude = Column(Float, nullable=False)
    start_h = Column(Float, nullable=True)
    end_h = Column(Float, nullable=True)
    reason = Column(String(500), nullable=True)
    source = Column(String(20), default="chat", nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class PushupEntry(Base):
    __tablename__ = "pushup_entries"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), nullable=False, index=True)
    time = Column(String(5), nullable=True)
    variant_reps = Column(Text, nullable=False)  # JSON: {variant: reps}
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class RunCardio(Base):
    __tablename__ = "run_cardio"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, nullable=False, unique=True, index=True)
    avg_heart_rate = Column(Float, nullable=True)
    active_zone_minutes = Column(Float, nullable=True)
    calories_kcal = Column(Float, nullable=True)
    cardio_load = Column(Float, nullable=True)
    heart_rate_zones = Column(Text, nullable=True)
    steps = Column(Integer, nullable=True)
    exercise_data = Column(Text, nullable=True)
    fetched_at = Column(DateTime, server_default=func.now(), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
