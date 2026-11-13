export type GoalKind = "daily" | "short" | "long";

export interface Goal {
  id: number;
  text: string;
  done: boolean;
  done_at: string | null;
  queued: boolean;
  due_date: string | null;
  kind: GoalKind;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface GoalsForDate {
  goals: Goal[];
  total: number;
  done_count: number;
}

export interface GoalCreate {
  text: string;
  due_date?: string | null;
  queued?: boolean;
  kind?: GoalKind;
  description?: string | null;
}

export interface GoalUpdate {
  text?: string;
  done?: boolean;
  queued?: boolean;
  position?: number;
  due_date?: string | null;
  kind?: GoalKind;
  description?: string | null;
}

export interface StreakData {
  count: number;
  last_processed_date: string | null;
}

export interface PolishResponse {
  polished: string;
}

export interface UserSettings {
  wake_hour: number;
  sleep_hour: number;
  calorie_goal: number;
  day_start_hour: number;
  sport_reasons: string[] | null;
  sport_goal: string | null;
}

export interface FoodEntry {
  id: number;
  date: string;
  time: string;
  meal_type: string;
  name: string;
  emoji: string;
  is_drink: boolean;
  amount: number | null;
  unit: string | null;
  grams_total: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  salt: number;
  sugar: number;
  water_ml: number;
  fiber: number | null;
  saturated_fat: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodEntryCreate {
  date: string;
  time: string;
  meal_type: string;
  name: string;
  emoji: string;
  is_drink: boolean;
  amount: number | null;
  unit: string | null;
  grams_total: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  salt: number;
  sugar: number;
  water_ml: number;
  fiber: number | null;
  saturated_fat: number | null;
  notes: string | null;
}

export interface FoodEntryUpdate {
  time?: string;
  meal_type?: string;
  name?: string;
  emoji?: string;
  is_drink?: boolean;
  amount?: number | null;
  unit?: string | null;
  grams_total?: number | null;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  salt?: number;
  sugar?: number;
  water_ml?: number;
  fiber?: number | null;
  saturated_fat?: number | null;
  notes?: string | null;
}

export interface DaySummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_salt: number;
  total_sugar: number;
  total_water_ml: number;
  total_fiber: number | null;
  total_saturated_fat: number | null;
  fiber_known_entries: number;
  saturated_fat_known_entries: number;
  entry_count: number;
  calorie_goal: number | null;
}

export interface FoodExport {
  content: string;
  filename: string;
}

export interface FoodStreakData {
  count: number;
  last_processed_date: string | null;
}

export interface WeeklyEntry {
  date: string;
  total_calories: number;
  entry_count: number;
}

export interface AveragesData {
  avg_calories: number;
  avg_protein: number;
  avg_fiber: number | null;
  avg_saturated_fat: number | null;
  days_counted: number;
}

export interface RecentMeal {
  name: string;
  emoji: string;
  is_drink: boolean;
  meal_type: string;
  amount: number | null;
  unit: string | null;
  grams_total: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  salt: number;
  sugar: number;
  fiber: number | null;
  saturated_fat: number | null;
}

export interface KnownFood {
  id: number;
  name: string;
  emoji: string;
  category: string;
}

export interface PhotoAnalysisResult {
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  salt: number;
  sugar: number;
  water_ml: number;
  fiber: number | null;
  saturated_fat: number | null;
  amount: number | null;
  unit: string | null;
}

export interface NutritionSuggestionRequest {
  name: string;
  amount: number;
  unit: string;
}

export interface MealDefaults {
  times: Record<string, string>;
  emojis: Record<string, string>;
}

export interface FoodTemplate {
  id: number;
  label: string;
  name: string;
  emoji: string;
  is_drink: boolean;
  amount: number;
  unit: string;
  grams_per_piece: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  salt: number;
  sugar: number;
  water_ml: number;
  fiber: number | null;
  saturated_fat: number | null;
  created_at: string;
  updated_at: string;
}

export interface FoodTemplateCreate {
  label: string;
  name: string;
  emoji: string;
  is_drink: boolean;
  amount: number;
  unit: string;
  grams_per_piece: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  salt: number;
  sugar: number;
  water_ml: number;
  fiber: number | null;
  saturated_fat: number | null;
}

export interface FoodTemplateUpdate {
  label?: string;
  name?: string;
  emoji?: string;
  is_drink?: boolean;
  amount?: number;
  unit?: string;
  grams_per_piece?: number | null;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  salt?: number;
  sugar?: number;
  water_ml?: number;
  fiber?: number | null;
  saturated_fat?: number | null;
}

export interface Run {
  id: number;
  start_time: string;
  distance_km: number;
  duration_minutes: number;
  location: string;
  temperature: number | null;
  perceived_effort: number | null;
  created_at: string;
  updated_at: string;
}

export interface RunCreate {
  start_time: string;
  distance_km: number;
  duration_minutes: number;
  location: string;
  temperature: number | null;
  perceived_effort: number | null;
}

export interface RunUpdate {
  start_time?: string;
  distance_km?: number;
  duration_minutes?: number;
  location?: string;
  temperature?: number | null;
  perceived_effort?: number | null;
}

export interface RunStats {
  total_runs: number;
  total_km: number;
  total_minutes: number;
  avg_pace_min_per_km: number | null;
  avg_speed_kmh: number | null;
  best_pace_min_per_km: number | null;
}

export interface HeartRateZones {
  light: number | null;
  moderate: number | null;
  vigorous: number | null;
  peak: number | null;
}

export interface RunCardio {
  id: number;
  run_id: number;
  avg_heart_rate: number | null;
  active_zone_minutes: number | null;
  calories_kcal: number | null;
  cardio_load: number | null;
  heart_rate_zones: HeartRateZones | null;
  steps: number | null;
  fetched_at: string;
}

export type PushupVariant = "standard" | "wide" | "close" | "pike";

export type VariantReps = Partial<Record<PushupVariant, number>>;

export interface PushupEntry {
  id: number;
  date: string;
  time: string | null;
  variant_reps: VariantReps;
  total_reps: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PushupEntryCreate {
  date: string;
  time?: string | null;
  variant_reps: VariantReps;
  notes?: string | null;
}

export interface PushupEntryUpdate {
  date?: string;
  time?: string | null;
  variant_reps?: VariantReps;
  notes?: string | null;
}

export interface VariantBreakdown {
  variant: string;
  reps: number;
  entries: number;
}

export interface PushupStats {
  total_reps: number;
  total_entries: number;
  reps_this_week: number;
  reps_this_month: number;
  breakdown_today: VariantBreakdown[];
  breakdown_week: VariantBreakdown[];
  breakdown_month: VariantBreakdown[];
}

export type PushupGranularity = "day" | "week" | "month";

export interface PushupBucket {
  label: string;
  start_date: string;
  reps: number;
  entries: number;
  variants: Record<string, number>;
}

export interface PushupSeries {
  granularity: PushupGranularity;
  buckets: PushupBucket[];
  breakdown: VariantBreakdown[];
}

export interface Supplement {
  id: number;
  name: string;
  emoji: string;
  category: string;
  default_dosage: string;
  default_unit: string;
  tags: string | null;
}

export interface UserSupplement {
  id: number;
  supplement_id: number;
  dosage: string;
  unit: string;
  time_window: string;
  interval_days: number;
  custom_tags: string | null;
  created_at: string;
  updated_at: string;
}

export interface StackItemWithStatus {
  id: number;
  supplement_id: number;
  name: string;
  emoji: string;
  tags: string | null;
  custom_tags: string | null;
  dosage: string;
  unit: string;
  time_window: string;
  interval_days: number;
  is_due_today: boolean;
  taken_today: boolean;
  last_taken_date: string | null;
}

export interface UserSupplementCreate {
  supplement_id: number;
  dosage: string;
  unit: string;
  time_window: string;
  interval_days: number;
  custom_tags?: string;
}

export interface UserSupplementUpdate {
  dosage?: string;
  unit?: string;
  time_window?: string;
  interval_days?: number;
  custom_tags?: string;
}

export interface ToggleRequest {
  user_supplement_id: number;
  date: string;
}

export interface AiStatus {
  /** False without GEMINI_API_KEY: AI buttons are greyed out, the AI tab shows setup steps. */
  enabled: boolean;
  model: string;
}

export interface HealthStatus {
  /** Active backend provider (HEALTH_PROVIDER): "google", "demo", "none" or a custom one. */
  provider: string;
  connected: boolean;
  health_user_id: string | null;
  error: string | null;
}

export interface DailySteps {
  date: string;
  steps: number;
}

export interface HealthStepsData {
  days: DailySteps[];
}

export interface BodyProfile {
  id: number;
  height_cm: number;
  age: number;
  gender: string;
  occupation: string | null;
  updated_at: string;
}

export interface BodyProfileCreate {
  height_cm: number;
  age: number;
  gender: string;
  occupation?: string | null;
}

export interface BodyProfileUpdate {
  height_cm?: number;
  age?: number;
  gender?: string;
  occupation?: string | null;
}

export interface BodyMeasurement {
  id: number;
  date: string;
  weight_kg: number;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  bmi: number;
  created_at: string;
  updated_at: string;
}

export interface BodyMeasurementCreate {
  date: string;
  weight_kg: number;
  body_fat_pct?: number | null;
  muscle_mass_kg?: number | null;
}

export interface BodyMeasurementUpdate {
  date?: string;
  weight_kg?: number;
  body_fat_pct?: number | null;
  muscle_mass_kg?: number | null;
}

export interface SleepStageSegment {
  type: string;
  start_time_utc: string;
  end_time_utc: string;
}

export interface SleepSessionData {
  date: string;
  sleep_index: number;
  start_time_utc: string | null;
  end_time_utc: string | null;
  minutes_in_sleep_period: number;
  minutes_awake: number;
  minutes_asleep: number;
  minutes_to_fall_asleep: number | null;
  minutes_after_wake_up: number | null;
  minutes_deep: number;
  minutes_rem: number;
  minutes_light: number;
  stages: SleepStageSegment[];
  skin_temperature_celsius: number | null;
  baseline_temperature_celsius: number | null;
  respiratory_rate_avg: number | null;
  respiratory_rate_deep: number | null;
  respiratory_rate_light: number | null;
  respiratory_rate_rem: number | null;
  avg_heart_rate: number | null;
}

export interface SleepAveragesData {
  avg_minutes_asleep: number;
  avg_sleep_index: number;
  session_count: number;
}

export interface DailyMetricsData {
  date: string;
  resting_heart_rate: number | null;
  hrv_rmssd: number | null;
  hrv_entropy: number | null;
  spo2_avg: number | null;
  spo2_low: number | null;
  steps: number | null;
}

export interface EnergyDataPoint {
  hour: number;
  energy: number;
}

export interface EnergyInfluence {
  type: string;
  hour: number;
  magnitude: number;
  end_magnitude?: number | null;
  start_h: number;
  end_h: number;
  description?: string;
  recommendation?: string;
}

export interface PeakWindow {
  start: number;
  end: number;
}

export interface ReadinessComponent {
  key: string;
  label: string;
  score: number | null;
  weight: number;
  available: boolean;
  share: number | null;
  detail: string | null;
  personal?: boolean;
}

export interface ReadinessBreakdown {
  components: ReadinessComponent[];
  coverage_pct: number;
}

export interface EnergyCurveData {
  date: string;
  readiness_score: number | null;
  readiness_breakdown: ReadinessBreakdown;
  curve: EnergyDataPoint[];
  baseline_curve: EnergyDataPoint[];
  peak_windows: PeakWindow[];
  influences: EnergyInfluence[];
  wake_hour: number;
  bed_hour: number;
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}
