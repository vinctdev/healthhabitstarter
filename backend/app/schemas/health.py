from datetime import datetime

from pydantic import BaseModel


class HealthStatusResponse(BaseModel):
    provider: str  # google | demo | none | <custom>
    connected: bool
    health_user_id: str | None = None
    error: str | None = None


class DailySteps(BaseModel):
    date: str
    steps: int


class HealthStepsResponse(BaseModel):
    days: list[DailySteps]


class SleepStageSegment(BaseModel):
    type: str
    start_time_utc: datetime
    end_time_utc: datetime


class SleepSessionResponse(BaseModel):
    date: str
    sleep_index: int
    start_time_utc: datetime | None = None
    end_time_utc: datetime | None = None
    minutes_in_sleep_period: int
    minutes_awake: int
    minutes_asleep: int
    minutes_to_fall_asleep: int | None = None
    minutes_after_wake_up: int | None = None
    minutes_deep: int
    minutes_rem: int
    minutes_light: int
    stages: list[SleepStageSegment] = []
    skin_temperature_celsius: float | None = None
    baseline_temperature_celsius: float | None = None
    respiratory_rate_avg: float | None = None
    respiratory_rate_deep: float | None = None
    respiratory_rate_light: float | None = None
    respiratory_rate_rem: float | None = None
    avg_heart_rate: float | None = None


class SleepAveragesResponse(BaseModel):
    avg_minutes_asleep: float
    avg_sleep_index: float
    session_count: int


class DailyMetricsResponse(BaseModel):
    date: str
    resting_heart_rate: float | None = None
    hrv_rmssd: float | None = None
    hrv_entropy: float | None = None
    spo2_avg: float | None = None
    spo2_low: float | None = None
    steps: int | None = None


class EnergyDataPoint(BaseModel):
    hour: int
    energy: float


class EnergyInfluence(BaseModel):
    type: str
    hour: int
    magnitude: float
    end_magnitude: float | None = None
    start_h: float = 0.0
    end_h: float = 0.0
    description: str | None = None
    recommendation: str | None = None


class PeakWindow(BaseModel):
    start: int
    end: int


class ReadinessComponent(BaseModel):
    key: str
    label: str
    score: float | None = None
    weight: float  # base weight in % (all weights add up to 100)
    available: bool = False
    share: float | None = None  # weight actually used today in %, after leaving out missing signals
    detail: str | None = None
    personal: bool = False


class ReadinessBreakdown(BaseModel):
    components: list[ReadinessComponent]
    coverage_pct: float  # sum of the base weights of the available signals


class EnergyCurveResponse(BaseModel):
    date: str
    readiness_score: float | None
    readiness_breakdown: ReadinessBreakdown
    curve: list[EnergyDataPoint]
    baseline_curve: list[EnergyDataPoint]
    peak_windows: list[PeakWindow]
    influences: list[EnergyInfluence]
    wake_hour: int
    bed_hour: int
