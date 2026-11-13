import json
from collections import defaultdict
from datetime import date as date_type
from datetime import datetime, timedelta

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import settings
from ..database import SessionLocal
from ..gemini_client import AI_DISABLED_MESSAGE, ai_enabled, stream_chat_gemini
from ..models import (
    BodyMeasurement,
    BodyProfile,
    DailyMetric,
    EnergyAdjustment,
    FoodEntry,
    Goal,
    PushupEntry,
    Run,
    RunCardio,
    SleepSession,
    Supplement,
    SupplementLog,
    UserSettings,
    UserSupplement,
)
from ..routers.health_data import compute_energy_curve
from ..routers.settings import get_active_date, get_or_create_settings
from ..schemas.pushups import VARIANTS
from ..timeutils import local_now

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


def _range_params(default: int, maximum: int) -> dict:
    return {
        "type": "object",
        "properties": {
            "date": {
                "type": "string",
                "description": "End date of the period in YYYY-MM-DD format. Default: today.",
            },
            "days": {
                "type": "integer",
                "description": (
                    f"Number of days (1-{maximum}, default: {default}). The period covers the last "
                    "'days' days ending on the given date."
                ),
            },
        },
        "required": [],
    }


TOOLS = [
    {
        "name": "get_daily_summary",
        "description": (
            "Returns the daily summary for a date or a period. With the optional 'days' "
            "parameter, several consecutive days can be requested (e.g. days=7 returns the "
            "last 7 days with the given date as the end date). With days=1 or without it, "
            "only the single day is returned. Contains calories, protein, carbs, fat, salt, "
            "sugar and water from the food entries plus steps and resting heart rate from "
            "the health metrics. Food entries are grouped by meal (Breakfast/Lunch/Dinner/"
            "Snack with time and subtotals). For several days, daily averages are included."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "description": "Date in YYYY-MM-DD format. For days>1, this is the end date of the period.",
                },
                "days": {
                    "type": "integer",
                    "description": "Number of days (1-30, default: 1). For days>1, the date is the last day and the previous days are included.",
                },
            },
            "required": ["date"],
        },
    },
    {
        "name": "get_sleep_data",
        "description": (
            "Returns sleep data for a date or a period: sleep index (0-100), sleep duration "
            "in minutes, time awake, deep, REM and light sleep, time to fall asleep, average "
            "heart rate during sleep, skin temperature and breathing rate. The optional "
            "'days' parameter (default: 1, maximum: 30) counts back from 'date'; for days>1, "
            "averages over the period are included."
        ),
        "parameters": _range_params(default=1, maximum=30),
    },
    {
        "name": "get_body_measurements",
        "description": (
            "Returns body measurements for a period: weight in kg, BMI, body fat in percent "
            "and muscle mass in kg. The optional 'days' parameter counts back from 'date' "
            "(e.g. days=365 for the last year; default: 365, maximum: 3650). Without 'date', "
            "today is the end date. Measurements are logged irregularly (usually every 2 "
            "weeks to 2 months), so always request a period instead of a single day. The "
            "answer also contains the body profile (height, age, gender, occupation) if "
            "available, the change (Δ) of each measurement versus the previous one and the "
            "total change over the period."
        ),
        "parameters": _range_params(default=365, maximum=3650),
    },
    {
        "name": "get_run_data",
        "description": (
            "Returns running data for a period. The optional 'days' parameter counts back "
            "from 'date' (e.g. days=30 for the last 30 days; default: 30, maximum: 90). "
            "Without 'date', today is the end date. Per run: date and time, location, "
            "distance in km, duration in minutes, pace (min/km), temperature and perceived "
            "effort (1-10). Cardio data is included if available: average heart rate, active "
            "zone minutes, cardio load, calories, steps and heart rate zones. It starts with "
            "a summary of the number of runs, total distance, total duration and average pace."
        ),
        "parameters": _range_params(default=30, maximum=90),
    },
    {
        "name": "get_pushup_data",
        "description": (
            "Returns push-up entries for a period. The optional 'days' parameter counts back "
            "from 'date' (e.g. days=30 for the last 30 days; default: 30, maximum: 3650). "
            "Without 'date', today is the end date. Per entry: date, time, total reps, "
            "reps per variant and an optional note. Variants: standard, wide (chest focus), "
            "close-grip/diamond (triceps focus) and pike (shoulder focus). It starts with a "
            "summary of total reps, number of entries and the reps per variant."
        ),
        "parameters": _range_params(default=30, maximum=3650),
    },
    {
        "name": "get_supplement_data",
        "description": (
            "Returns supplement intake for a period. The optional 'days' parameter counts "
            "back from 'date' (e.g. days=7 for the last week; default: 1, maximum: 30). "
            "Without 'date', today is the end date. Shows per day which supplements were "
            "taken (name, emoji, dosage, unit, time window) and an overview of the configured "
            "stack (dosage, time window, interval in days, last intake)."
        ),
        "parameters": _range_params(default=1, maximum=30),
    },
    {
        "name": "get_energy_curve",
        "description": (
            "Returns the daily energy curve for a date (default: today): readiness score "
            "(0-100, weighted average of sleep index, HRV and resting heart rate), productivity "
            "windows (times with energy above 70%), the highs and lows of the day with "
            "times, wake-up time and bedtime, and relevant influences (e.g. caffeine, blood "
            "sugar crash, exercise) including tips."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "description": "Date in YYYY-MM-DD format. Default: today.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_user_settings",
        "description": (
            "Returns the configured user settings: wake-up time, bedtime, calorie goal and, "
            "if set, the reasons for working out and the sport goal. No parameters needed."
        ),
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_goals",
        "description": (
            "Returns the user's goals. 'kind' selects the time horizon: 'daily' = daily "
            "tasks (with due date), 'short' = short-term goals, 'long' = long-term goals, "
            "'all' = all horizons. With 'include_done' (default: true), completed goals are "
            "included. Per goal: text, horizon, due date, days left (negative = overdue) and "
            "status. Long-term goals may have no deadline (∞)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "kind": {
                    "type": "string",
                    "enum": ["daily", "short", "long", "all"],
                    "description": "Time horizon of the goals. Default: all.",
                },
                "include_done": {
                    "type": "boolean",
                    "description": "Include completed goals. Default: true.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "adjust_energy_curve",
        "description": (
            "Manually adjusts the daily energy curve of the peak tracker for a date when the "
            "user mentions conditions that affect their energy (e.g. vaccination, illness, a "
            "cold, poor sleep, strong fatigue, stress, or feeling especially good). The "
            "'magnitude' parameter is the strength in percentage points: negative lowers the "
            "curve (e.g. -15), positive raises it (e.g. +10). Allowed range: -30 to +30. "
            "Without 'start_h'/'end_h', the adjustment applies to the whole waking window of "
            "the day. 'reason' is a short explanation (e.g. 'vaccination') in the user's "
            "language. The adjustment is saved permanently and shown as an influence in the "
            "peak tracker."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "description": "Date in YYYY-MM-DD format. Default: today.",
                },
                "magnitude": {
                    "type": "number",
                    "description": "Strength of the adjustment in percentage points (-30 to +30). Negative lowers, positive raises the energy.",
                },
                "start_h": {
                    "type": "number",
                    "description": "Optional start hour as a decimal (e.g. 14.5 = 14:30). Without it, the whole day is used.",
                },
                "end_h": {
                    "type": "number",
                    "description": "Optional end hour as a decimal. Without it, the whole day is used.",
                },
                "reason": {
                    "type": "string",
                    "description": "Short explanation of the adjustment (e.g. 'vaccination').",
                },
            },
            "required": ["magnitude"],
        },
    },
]


def _build_system_prompt(day_start_hour: int) -> str:
    now = local_now()
    return (
        f"Current date: {now.strftime('%Y-%m-%d')} (the current year is {now.year}), "
        f"current time: {now.strftime('%H:%M')} ({settings.tz}).\n"
        f"The day boundary is at {day_start_hour}:00 in the morning. "
        f"If the user says 'today' and it is before {day_start_hour}:00, "
        "it refers to the previous calendar day.\n"
        "'Yesterday' is the calendar day before the current date, taking the "
        f"{day_start_hour}:00 boundary into account.\n"
        "Dates without a year (e.g. '24.07', '07/24' or 'the 24th') refer to the current year "
        f"({now.year}); a bare day number refers to the current month, unless the user says otherwise.\n"
        "Always pass dates to tools in YYYY-MM-DD format.\n"
        "You have read access to all data. The only exception is the tool "
        "'adjust_energy_curve', which lets you save manual energy adjustments. "
        "All other writes (creating, changing or deleting entries) are not possible.\n"
        "Always answer in the language the user writes in, and use that language's number "
        "and date formats.\n"
        "Answer format:\n"
        "- Stay focused: by default 2-5 short bullet points, at most 6.\n"
        "- Each bullet holds one thought in few words; avoid long paragraphs and tables.\n"
        "- Start directly with the most important insight instead of a general introduction.\n"
        "- Mark only key numbers, targets, units, periods and changes with **...**. "
        "Put the Markdown marker directly around the value, e.g. **85%**, **7.7 h** or **-2.4 kg**. "
        "These values are shown in bold in the frontend.\n"
        "- Never use em dashes or en dashes; use commas, colons or periods instead.\n"
        "- Do not invent values. Briefly name missing or uncertain data.\n"
        "- If an action makes sense, end with exactly one bullet in the form "
        "'- Next step: ...' (in the user's language).\n"
        "Rules for tool calls:\n"
        "- Call all tools needed to answer the question (at most 7).\n"
        "- Only call the tools relevant to the user's actual question.\n"
        "- For questions across areas (e.g. 'How was my week in all areas?'), "
        "call the matching tools in parallel.\n"
        "- If the user only asks about sleep, call ONLY get_sleep_data.\n"
        "- If the user only asks about nutrition, call ONLY get_daily_summary.\n"
        "- If the user only asks about body measurements, call ONLY get_body_measurements.\n"
        "- If the user only asks about sport or runs, call ONLY get_run_data.\n"
        "- If the user only asks about push-ups, call ONLY get_pushup_data.\n"
        "- If the user only asks about supplements or their intake, call ONLY get_supplement_data.\n"
        "- If the user only asks about energy, readiness or productivity windows, call ONLY get_energy_curve.\n"
        "- If the user asks about their settings, reasons for working out or sport goal, call ONLY get_user_settings.\n"
        "- If the user mentions conditions that affect their energy today "
        "(e.g. 'I got a vaccination today and feel weak', 'I am sick', "
        "'I feel especially fit today'), call adjust_energy_curve and choose a fitting "
        "magnitude. Slight impairment about -5 to -10, clear impairment (e.g. vaccination, "
        "a cold) about -10 to -20, strong impairment (e.g. illness) about -20 to -30. Positive "
        "states accordingly +5 to +15. Use 'reason' for a short explanation.\n"
        "- Ask for more details before calling unnecessary tools.\n"
        "Notes on get_body_measurements:\n"
        "- Body measurements are logged IRREGULARLY (typically every 2 weeks to 2 months, "
        "no fixed rhythm). A single day is therefore almost always empty, which does NOT "
        "mean there are no measurements.\n"
        "- So ALWAYS use the 'days' parameter instead of a single date. The default "
        "is days=365 (one year). Use days=3650 for the full history.\n"
        "- For questions like 'this year', use days=365.\n"
        "- The given 'date' is always the last (most recent) day of the period.\n"
        "Notes on get_sleep_data:\n"
        "- By default only the given day (days=1) is returned. For sleep trends over "
        "several days, use the 'days' parameter (e.g. days=7).\n"
        "- The given 'date' is always the last (most recent) day of the period.\n"
        "Notes on get_daily_summary:\n"
        "- Use the 'days' parameter to get data for several days "
        "(e.g. days=7 for the last week, days=30 for the last month).\n"
        "- For trends, developments or comparisons over several days, "
        "use a single call with days>1 instead of several single-day calls.\n"
        "- The given 'date' is always the last (most recent) day of the period.\n"
        "- Food entries are grouped by meal (category + time + subtotals); "
        "use this for statements about single meals or the distribution over the day.\n"
        "Notes on get_energy_curve:\n"
        "- The curve is per day; without 'date', today is used.\n"
        "- For 'today' or today's productivity window, fetch it right away.\n"
        "Notes on get_user_settings:\n"
        "- No parameters needed; returns wake-up time, bedtime, calorie goal and sport goals.\n"
        "Notes on get_goals:\n"
        "- Returns daily tasks (daily), short-term (short) and long-term (long) goals. "
        "Use 'kind' to narrow the horizon and include_done=false if only open goals matter.\n"
        "- If the user asks about their goals, plans or priorities, call ONLY get_goals.\n"
        "Notes on get_run_data:\n"
        "- The default period is the last 30 days (days=30). Adjust the 'days' parameter "
        "for shorter or longer periods (e.g. days=7 for the last week).\n"
        "- The given 'date' is always the last (most recent) day of the period.\n"
        "Notes on get_pushup_data:\n"
        "- The default period is the last 30 days (days=30). Adjust the 'days' parameter "
        "for longer periods (e.g. days=365 for one year).\n"
        "- The given 'date' is always the last (most recent) day of the period.\n"
        "- An empty period does not mean that tracking is missing.\n"
        "Notes on get_supplement_data:\n"
        "- By default only the given day (days=1) is returned. For intake history over "
        "several days, use the 'days' parameter.\n"
        "- The given 'date' is always the last (most recent) day of the period."
    )


def _execute_tool(name: str, args: dict) -> str:
    db: Session = SessionLocal()
    try:
        return _execute_tool_impl(db, name, args)
    finally:
        db.close()


def _execute_tool_impl(db: Session, name: str, args: dict) -> str:
    date = args.get("date", "")

    if name == "get_daily_summary":
        us = db.query(UserSettings).first()
        days_param = args.get("days", 1)
        try:
            days_param = int(days_param) if days_param else 1
        except (ValueError, TypeError):
            days_param = 1
        days_param = max(1, min(days_param, 30))

        if days_param == 1:
            return _format_single_day_summary(db, date, us)

        return _format_multi_day_summary(db, date, days_param, us)

    elif name == "get_sleep_data":
        days_param = _parse_days_arg(args, default=1, maximum=30)
        return _format_sleep_data(db, date, days_param)

    elif name == "get_energy_curve":
        return _format_energy_curve(db, date)

    elif name == "get_user_settings":
        return _format_user_settings(db)

    elif name == "get_body_measurements":
        days_param = _parse_days_arg(args, default=365, maximum=3650)
        return _format_body_measurements(db, date, days_param)

    elif name == "get_run_data":
        days_param = _parse_days_arg(args, default=30, maximum=90)
        return _format_run_data(db, date, days_param)

    elif name == "get_pushup_data":
        days_param = _parse_days_arg(args, default=30, maximum=3650)
        return _format_pushup_data(db, date, days_param)

    elif name == "get_supplement_data":
        days_param = _parse_days_arg(args, default=1, maximum=30)
        return _format_supplement_data(db, date, days_param)

    elif name == "get_goals":
        return _format_goals(db, args)

    elif name == "adjust_energy_curve":
        return _apply_energy_adjustment(db, args)

    else:
        return f"Unknown tool: {name}"


def _parse_days_arg(args: dict, default: int, maximum: int) -> int:
    value = args.get("days", default)
    try:
        value = int(value) if value else default
    except (ValueError, TypeError):
        value = default
    return max(1, min(value, maximum))


def _resolve_date(db: Session, date: str) -> str:
    if date:
        return date
    return get_active_date(db).isoformat()


ENERGY_ADJUSTMENT_MAX = 30.0


def _apply_energy_adjustment(db: Session, args: dict) -> str:
    date = _resolve_date(db, args.get("date", ""))
    try:
        date_type.fromisoformat(date)
    except ValueError:
        return f"Invalid date: {date} (expected YYYY-MM-DD)"

    try:
        magnitude = float(args.get("magnitude"))
    except (ValueError, TypeError):
        return "Invalid 'magnitude' value: a number between -30 and +30 is expected."
    magnitude = max(-ENERGY_ADJUSTMENT_MAX, min(ENERGY_ADJUSTMENT_MAX, magnitude))

    start_h = args.get("start_h")
    end_h = args.get("end_h")
    try:
        start_h = float(start_h) if start_h is not None else None
        end_h = float(end_h) if end_h is not None else None
    except (ValueError, TypeError):
        return "Invalid time: 'start_h'/'end_h' must be decimal hours (e.g. 14.5)."

    if start_h is not None and end_h is not None and end_h <= start_h:
        return f"Invalid period: end_h ({end_h}) must be after start_h ({start_h})."

    reason = args.get("reason")
    if isinstance(reason, str):
        reason = reason.strip()[:500] or None

    adjustment = EnergyAdjustment(
        date=date,
        type="manual",
        magnitude=magnitude,
        start_h=start_h,
        end_h=end_h,
        reason=reason,
        source="chat",
    )
    db.add(adjustment)
    db.commit()

    scope = "whole day"
    if start_h is not None and end_h is not None:
        scope = f"{_fmt_hour(start_h)}-{_fmt_hour(end_h)}"
    elif start_h is not None:
        scope = f"from {_fmt_hour(start_h)}"

    sign = "lowered" if magnitude < 0 else "raised"
    reason_part = f" ({reason})" if reason else ""
    return (
        f"Energy curve for {date} {sign} by {abs(magnitude):g} percentage points "
        f"(range: {scope}){reason_part}. The adjustment is visible in the peak tracker."
    )


def _format_sleep_data(db: Session, date: str, days: int) -> str:
    end_date = _resolve_date(db, date)
    try:
        end = date_type.fromisoformat(end_date)
    except ValueError:
        return f"Invalid date: {end_date} (expected YYYY-MM-DD)"
    start = end - timedelta(days=days - 1)
    date_range = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]

    sessions = {
        s.date: s
        for s in db.query(SleepSession)
        .filter(SleepSession.date >= date_range[0], SleepSession.date <= date_range[-1])
        .all()
    }

    if not sessions:
        return f"No sleep data from {date_range[0]} to {date_range[-1]}."

    lines: list[str] = [
        f"Sleep data {date_range[0]} to {date_range[-1]} ({len(sessions)} nights with data):"
    ]

    for d in date_range:
        sleep = sessions.get(d)
        if sleep is None:
            continue
        lines.append(
            f"\n{d}: sleep index {sleep.sleep_index}/100, "
            f"{round(sleep.minutes_asleep / 60, 1)} h ({sleep.minutes_asleep} min), "
            f"of which {sleep.minutes_deep} min deep, {sleep.minutes_rem} min REM, "
            f"{sleep.minutes_light} min light, {sleep.minutes_awake} min awake"
        )
        if sleep.minutes_to_fall_asleep is not None:
            lines.append(f"   Time to fall asleep: {sleep.minutes_to_fall_asleep} min")
        if sleep.avg_heart_rate is not None:
            lines.append(f"   Avg heart rate during sleep: {int(sleep.avg_heart_rate)} bpm")
        if sleep.skin_temperature_celsius is not None:
            lines.append(f"   Skin temperature: {round(sleep.skin_temperature_celsius, 1)}°C")
        if sleep.respiratory_rate_avg is not None:
            lines.append(f"   Breathing rate: {round(sleep.respiratory_rate_avg, 1)} breaths/min")

    sleep_sessions = list(sessions.values())
    if len(sleep_sessions) >= 1:
        avg_minutes = sum(s.minutes_asleep for s in sleep_sessions) / len(sleep_sessions)
        avg_index = sum(s.sleep_index for s in sleep_sessions) / len(sleep_sessions)
        lines.append(
            f"\nAvg sleep duration: {round(avg_minutes / 60, 1)} h ({round(avg_minutes)} min) | "
            f"Avg sleep index: {round(avg_index, 1)}/100"
        )

    return "\n".join(lines)


ENERGY_INFLUENCE_LABELS = {
    "caffeine": "Caffeine",
    "sugar_spike": "Sugar spike",
    "sugar_crash": "Blood sugar crash",
    "meal_dip": "Dip after a large meal",
    "hard_exercise_drop": "Hard exercise (energy drop)",
    "hard_exercise_base_drain": "Hard exercise (base drain)",
    "light_exercise_boost": "Light exercise (boost)",
    "manual": "Manual adjustment",
}


def _format_energy_curve(db: Session, date: str) -> str:
    end_date = _resolve_date(db, date)
    try:
        date_type.fromisoformat(end_date)
    except ValueError:
        return f"Invalid date: {end_date} (expected YYYY-MM-DD)"

    curve = compute_energy_curve(db, end_date)

    breakdown = curve.readiness_breakdown
    component_parts: list[str] = []
    for component in breakdown.components:
        if component.available and component.score is not None:
            component_parts.append(
                f"{component.label} {component.score:g}/100 (weight {component.share:g}%)"
            )
        else:
            component_parts.append(f"{component.label} no data")
    components_text = ", ".join(component_parts)

    if curve.readiness_score is None:
        readiness_line = (
            f"Readiness: no data (data coverage {breakdown.coverage_pct:g}% · {components_text})"
        )
    else:
        readiness_line = (
            f"Readiness: {curve.readiness_score}/100 "
            f"(data coverage {breakdown.coverage_pct:g}% · {components_text})"
        )

    lines: list[str] = [
        f"Energy curve for {end_date}:",
        readiness_line,
        f"Wake-up: {_fmt_hour(curve.wake_hour)} · Bedtime: {_fmt_hour(curve.bed_hour)}",
    ]

    if curve.peak_windows:
        windows = " · ".join(f"{_fmt_hour(w.start)}-{_fmt_hour(w.end)}" for w in curve.peak_windows)
        lines.append(f"Productivity windows (>70%): {windows}")
    else:
        lines.append("Productivity windows (>70%): none")

    awake_points = [p for p in curve.curve if p.energy > 0]
    if awake_points:
        peak = max(awake_points, key=lambda p: p.energy)
        dip = min(awake_points, key=lambda p: p.energy)
        lines.append(
            f"Energy over the day: maximum {peak.energy}% at {_fmt_hour(peak.hour)}, "
            f"minimum {dip.energy}% at {_fmt_hour(dip.hour)}"
        )

    if curve.influences:
        inf_lines: list[str] = []
        for inf in curve.influences:
            label = ENERGY_INFLUENCE_LABELS.get(inf.type, inf.type)
            part = f"- {label} ({_fmt_hour(inf.start_h)}-{_fmt_hour(inf.end_h)}, {_fmt_delta_sign(inf.magnitude)}%)"
            if inf.recommendation:
                part += f". {inf.recommendation}"
            inf_lines.append(part)
        lines.append("\nInfluences:")
        lines.extend(inf_lines)

    return "\n".join(lines)


def _fmt_hour(h: float) -> str:
    h = h % 24
    hh = int(h)
    mm = int((h - hh) * 60)
    return f"{hh:02d}:{mm:02d}"


def _fmt_delta_sign(value: float) -> str:
    sign = "+" if value > 0 else ""
    return f"{sign}{round(value, 1)}"


def _format_user_settings(db: Session) -> str:
    us = db.query(UserSettings).first()
    if not us:
        return (
            "No user settings saved. "
            "Defaults: wake-up time 8:00, bedtime 24:00, calorie goal 2000 kcal."
        )

    lines: list[str] = [
        "User settings:",
        f"- Wake-up time: {_fmt_hour(us.wake_hour)}",
        f"- Bedtime: {_fmt_hour(us.sleep_hour)}",
        f"- Calorie goal: {us.calorie_goal} kcal",
    ]
    if us.sport_reasons:
        lines.append(f"- Reasons for working out: {us.sport_reasons}")
    if us.sport_goal:
        lines.append(f"- Sport goal: {us.sport_goal}")
    return "\n".join(lines)


def _format_goals(db: Session, args: dict) -> str:
    kind = args.get("kind", "all")
    if kind not in ("daily", "short", "long", "all"):
        kind = "all"
    include_done = args.get("include_done", True)
    if isinstance(include_done, str):
        include_done = include_done.lower() not in ("false", "0", "no")

    query = db.query(Goal)
    if kind != "all":
        query = query.filter(Goal.kind == kind)
    if not include_done:
        query = query.filter(Goal.done.is_(False))

    goals = query.order_by(
        Goal.kind.asc(),
        Goal.done.asc(),
        Goal.due_date.is_(None),
        Goal.due_date.asc(),
        Goal.position.asc(),
    ).all()

    if not goals:
        return "No goals (for the selected filters)."

    kind_labels = {"daily": "Daily", "short": "Short-term", "long": "Long-term"}
    active = date_type.fromisoformat(_resolve_date(db, ""))

    lines: list[str] = []
    current_kind = None
    for g in goals:
        if g.kind != current_kind:
            current_kind = g.kind
            lines.append(f"\n{kind_labels.get(g.kind, g.kind)} goals:")

        if g.done:
            status = "done"
        elif g.due_date:
            days_left = (date_type.fromisoformat(g.due_date) - active).days
            if days_left < 0:
                status = f"overdue by {abs(days_left)} days"
            elif days_left == 0:
                status = "due today"
            else:
                status = f"{days_left} days left"
        else:
            status = "no deadline"

        line = f"- {g.text}"
        if g.due_date:
            line += f" (due: {g.due_date}, {status})"
        else:
            line += f" ({status})"
        if g.description:
            line += f": {g.description}"
        lines.append(line)

    return "User goals:" + "\n".join(lines)


def _format_body_measurements(db: Session, date: str, days: int) -> str:
    end_date = _resolve_date(db, date)
    try:
        end = date_type.fromisoformat(end_date)
    except ValueError:
        return f"Invalid date: {end_date} (expected YYYY-MM-DD)"
    start = end - timedelta(days=days - 1)
    range_start = start.strftime("%Y-%m-%d")
    range_end = end.strftime("%Y-%m-%d")

    measurements = (
        db.query(BodyMeasurement)
        .filter(BodyMeasurement.date >= range_start, BodyMeasurement.date <= range_end)
        .order_by(BodyMeasurement.date)
        .all()
    )

    profile = db.query(BodyProfile).first()

    lines: list[str] = []

    if profile:
        lines.append(
            "Body profile:\n"
            f"- Height: {profile.height_cm} cm\n"
            f"- Age: {profile.age}\n"
            f"- Gender: {profile.gender}\n"
            f"- Occupation: {profile.occupation or 'not specified'}"
        )
    else:
        lines.append("No body profile saved.")

    if not measurements:
        lines.append(
            f"\nNo body measurements from {range_start} to {range_end}. "
            "Measurements are logged irregularly (typically every 2 weeks to 2 months), "
            "so request a longer period (e.g. days=365 or days=3650)."
        )
        return "\n".join(lines)

    lines.append(
        f"\nBody measurements {range_start} to {range_end} ({len(measurements)} measurements):"
    )

    prev = None
    for m in measurements:
        line = f"- {m.date}: {m.weight_kg} kg, BMI {round(m.bmi, 1)}"
        if m.body_fat_pct is not None:
            line += f", {m.body_fat_pct}% body fat"
        if m.muscle_mass_kg is not None:
            line += f", {m.muscle_mass_kg} kg muscle mass"
        if prev is not None:
            deltas: list[str] = [f"weight {_format_delta(m.weight_kg - prev.weight_kg)} kg"]
            deltas.append(f"BMI {_format_delta(m.bmi - prev.bmi)}")
            if m.body_fat_pct is not None and prev.body_fat_pct is not None:
                deltas.append(f"body fat {_format_delta(m.body_fat_pct - prev.body_fat_pct)} %")
            if m.muscle_mass_kg is not None and prev.muscle_mass_kg is not None:
                deltas.append(
                    f"muscle mass {_format_delta(m.muscle_mass_kg - prev.muscle_mass_kg)} kg"
                )
            line += " | Δ: " + ", ".join(deltas)
        lines.append(line)
        prev = m

    if len(measurements) >= 2:
        first = measurements[0]
        last = measurements[-1]
        summary = (
            f"\nTotal change {first.date} → {last.date}:\n"
            f"Weight: {_format_delta(last.weight_kg - first.weight_kg)} kg\n"
            f"BMI: {_format_delta(last.bmi - first.bmi)}"
        )
        if last.body_fat_pct is not None and first.body_fat_pct is not None:
            summary += f"\nBody fat: {_format_delta(last.body_fat_pct - first.body_fat_pct)} %"
        if last.muscle_mass_kg is not None and first.muscle_mass_kg is not None:
            summary += (
                f"\nMuscle mass: {_format_delta(last.muscle_mass_kg - first.muscle_mass_kg)} kg"
            )
        lines.append(summary)

    return "\n".join(lines)


def _format_delta(value: float) -> str:
    sign = "+" if value > 0 else ""
    return f"{sign}{round(value, 2)}"


def _format_run_data(db: Session, date: str, days: int) -> str:
    end_date = _resolve_date(db, date)
    try:
        end = date_type.fromisoformat(end_date)
    except ValueError:
        return f"Invalid date: {end_date} (expected YYYY-MM-DD)"
    start = end - timedelta(days=days - 1)

    start_dt = datetime.combine(start, datetime.min.time())
    end_dt = datetime.combine(end + timedelta(days=1), datetime.min.time())

    rows = (
        db.query(Run, RunCardio)
        .outerjoin(RunCardio, RunCardio.run_id == Run.id)
        .filter(Run.start_time >= start_dt, Run.start_time < end_dt)
        .order_by(Run.start_time)
        .all()
    )

    if not rows:
        return f"No run data from {start} to {end}."

    lines: list[str] = []
    total_km = sum(r.distance_km for r, _ in rows)
    total_min = sum(r.duration_minutes for r, _ in rows)
    avg_pace = (total_min / total_km) if total_km > 0 else None
    avg_effort = round(
        sum(r.perceived_effort for r, _ in rows if r.perceived_effort is not None) / len(rows)
    )

    header = (
        f"Run data {start} to {end} ({len(rows)} runs):\n"
        f"Total distance: {round(total_km, 2)} km\n"
        f"Total duration: {round(total_min, 1)} min"
    )
    if avg_pace is not None:
        header += f"\nAvg pace: {_format_pace(avg_pace)} min/km"
    header += f"\nAvg effort: {avg_effort}/10"
    lines.append(header)

    for run, cardio in rows:
        run_line = (
            f"\n- {run.start_time.strftime('%Y-%m-%d %H:%M')} · {run.location}: "
            f"{run.distance_km} km in {round(run.duration_minutes, 1)} min"
        )
        if run.distance_km > 0:
            run_line += f" (Pace {_format_pace(run.duration_minutes / run.distance_km)} min/km)"
        if run.temperature is not None:
            run_line += f", {round(run.temperature, 1)}°C"
        if run.perceived_effort is not None:
            run_line += f", effort {run.perceived_effort}/10"

        lines.append(run_line)

        if cardio is None:
            continue
        cardio_parts: list[str] = []
        if cardio.avg_heart_rate is not None:
            cardio_parts.append(f"avg HR {int(cardio.avg_heart_rate)} bpm")
        if cardio.cardio_load is not None:
            cardio_parts.append(f"cardio load {round(cardio.cardio_load, 1)}")
        if cardio.active_zone_minutes is not None:
            cardio_parts.append(f"{int(cardio.active_zone_minutes)} AZM")
        if cardio.calories_kcal is not None:
            cardio_parts.append(f"{int(cardio.calories_kcal)} kcal")
        if cardio.steps is not None:
            cardio_parts.append(f"{cardio.steps} steps")
        if cardio_parts:
            lines.append(f"   Cardio: {' | '.join(cardio_parts)}")
        zones = _parse_hr_zones(cardio.heart_rate_zones)
        if zones:
            lines.append(f"   HR zones: {zones}")

    return "\n".join(lines)


def _format_pushup_data(db: Session, date: str, days: int) -> str:
    end_date = _resolve_date(db, date)
    try:
        end = date_type.fromisoformat(end_date)
    except ValueError:
        return f"Invalid date: {end_date} (expected YYYY-MM-DD)"
    start = end - timedelta(days=days - 1)

    rows = (
        db.query(PushupEntry)
        .filter(PushupEntry.date >= start.isoformat(), PushupEntry.date <= end.isoformat())
        .order_by(PushupEntry.date, PushupEntry.time)
        .all()
    )

    if not rows:
        return f"No push-up data from {start} to {end}."

    def entry_variants(entry: PushupEntry) -> dict[str, int]:
        try:
            data = json.loads(entry.variant_reps)
        except (json.JSONDecodeError, TypeError):
            return {}
        if not isinstance(data, dict):
            return {}
        return {k: v for k, v in data.items() if isinstance(v, (int, float))}

    total_reps = 0
    variant_reps: dict[str, int] = {}
    for entry in rows:
        entry_reps = entry_variants(entry)
        total_reps += sum(entry_reps.values())
        for variant, reps in entry_reps.items():
            variant_reps[variant] = variant_reps.get(variant, 0) + reps

    lines: list[str] = [
        f"Push-up data {start} to {end} ({len(rows)} entries):",
        f"Total reps: {total_reps}",
    ]
    if variant_reps:
        breakdown = ", ".join(
            f"{VARIANTS.get(v, v)} {reps}"
            for v, reps in sorted(variant_reps.items(), key=lambda item: -item[1])
        )
        lines.append(f"Reps per variant: {breakdown}")

    for entry in rows:
        entry_reps = entry_variants(entry)
        variants = ", ".join(
            f"{VARIANTS.get(v, v)} {reps}"
            for v, reps in sorted(entry_reps.items(), key=lambda item: -item[1])
        )
        line = f"\n- {entry.date}"
        if entry.time:
            line += f" {entry.time}"
        line += f": {sum(entry_reps.values())} reps · {variants}"
        if entry.notes:
            line += f" · note: {entry.notes}"
        lines.append(line)

    return "\n".join(lines)


def _format_pace(minutes_per_km: float) -> str:
    total_seconds = int(round(minutes_per_km * 60))
    m = total_seconds // 60
    s = total_seconds % 60
    return f"{m}:{s:02d}"


def _parse_hr_zones(zones_json: str | None) -> str | None:
    if not zones_json:
        return None
    try:
        data = json.loads(zones_json)
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(data, dict):
        return None

    parts: list[str] = []
    # Stored as minutes per zone, see health_providers/base.py (RunCardioData).
    for key, label in (
        ("light", "Light"),
        ("moderate", "Moderate"),
        ("vigorous", "Vigorous"),
        ("peak", "Peak"),
    ):
        minutes = data.get(key)
        if isinstance(minutes, (int, float)):
            parts.append(f"{label} {round(minutes)} min")
    return ", ".join(parts) if parts else None


TIME_WINDOW_LABELS = {
    "morning": "Morning",
    "midday": "Midday",
    "evening": "Evening",
    "bedtime": "Before bed",
    "anytime": "Anytime",
}


def _format_supplement_data(db: Session, date: str, days: int) -> str:
    end_date = _resolve_date(db, date)
    try:
        end = date_type.fromisoformat(end_date)
    except ValueError:
        return f"Invalid date: {end_date} (expected YYYY-MM-DD)"
    start = end - timedelta(days=days - 1)
    date_range = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]

    user_supps = (
        db.query(UserSupplement).order_by(UserSupplement.time_window, UserSupplement.id).all()
    )
    supp_by_id: dict[int, Supplement] = {}
    for us in user_supps:
        if us.supplement_id not in supp_by_id:
            supp = db.query(Supplement).filter(Supplement.id == us.supplement_id).first()
            if supp:
                supp_by_id[us.supplement_id] = supp

    logs = (
        db.query(SupplementLog)
        .filter(SupplementLog.date >= date_range[0], SupplementLog.date <= date_range[-1])
        .order_by(SupplementLog.date, SupplementLog.taken_at)
        .all()
    )

    taken_by_day: dict[str, list[SupplementLog]] = defaultdict(list)
    for log in logs:
        taken_by_day[log.date].append(log)

    lines: list[str] = [f"Supplement intake {date_range[0]} to {date_range[-1]} ({days} days):"]

    total_taken = 0
    for d in date_range:
        day_logs = taken_by_day.get(d, [])
        total_taken += len(day_logs)
        lines.append(f"\n{d}:")
        if not day_logs:
            lines.append("   Nothing taken")
            continue
        for log in day_logs:
            us = next((u for u in user_supps if u.id == log.user_supplement_id), None)
            if us is None:
                continue
            supp = supp_by_id.get(us.supplement_id)
            name = supp.name if supp else f"Supplement #{us.supplement_id}"
            emoji = supp.emoji if supp else ""
            window = TIME_WINDOW_LABELS.get(us.time_window, us.time_window)
            intake_line = f"   ✓ {emoji} {name}: {us.dosage} {us.unit} ({window})"
            if us.custom_tags:
                intake_line += f" · note: {us.custom_tags.strip()}"
            lines.append(intake_line)

    if total_taken == 0:
        lines.append("\nNo supplements were taken in this period.")

    if user_supps:
        lines.append("\nCurrent stack (configured):")
        for us in user_supps:
            supp = supp_by_id.get(us.supplement_id)
            name = supp.name if supp else f"Supplement #{us.supplement_id}"
            emoji = supp.emoji if supp else ""
            window = TIME_WINDOW_LABELS.get(us.time_window, us.time_window)
            interval = f"every {us.interval_days} days" if us.interval_days > 1 else "daily"
            line = f"   - {emoji} {name}: {us.dosage} {us.unit} ({window}, {interval})"
            last_log = (
                db.query(SupplementLog)
                .filter(SupplementLog.user_supplement_id == us.id)
                .order_by(SupplementLog.date.desc())
                .first()
            )
            if last_log:
                line += f", last taken on {last_log.date}"
            else:
                line += ", never taken"
            if supp and supp.tags:
                line += f" · Tags: {supp.tags.strip()}"
            if us.custom_tags:
                line += f" · note: {us.custom_tags.strip()}"
            lines.append(line)

    return "\n".join(lines)


def _group_food_meals(entries):
    meals = []
    for e in entries:
        meal = next(
            (m for m in meals if m["meal_type"] == e.meal_type and m["time"] == e.time),
            None,
        )
        if meal is None:
            meal = {"meal_type": e.meal_type, "time": e.time, "entries": []}
            meals.append(meal)
        meal["entries"].append(e)
    return meals


def _sum_known(values) -> float | None:
    """Sum only known values (NULL = unknown); None if nothing is known."""
    known = [v for v in values if v is not None]
    if not known:
        return None
    return round(sum(known), 1)


def _fmt_known(value: float | None, unit: str = "g") -> str:
    if value is None:
        return "unknown"
    return f"{value}{unit}"


def _fmt_meal_totals(entries) -> str:
    cal = sum(e.calories for e in entries)
    protein = round(sum(e.protein for e in entries), 1)
    carbs = round(sum(e.carbs for e in entries), 1)
    fat = round(sum(e.fat for e in entries), 1)
    sat_fat = _sum_known(e.saturated_fat for e in entries)
    fiber = _sum_known(e.fiber for e in entries)
    salt = round(sum(e.salt for e in entries), 2)
    sugar = round(sum(e.sugar for e in entries), 1)
    water = sum(e.water_ml for e in entries)
    fat_text = f"{fat}g fat"
    if sat_fat is not None:
        fat_text += f" (of which {sat_fat}g saturated)"
    fiber_text = f", fiber {_fmt_known(fiber)}" if fiber is not None else ", fiber unknown"
    return (
        f"{cal} kcal, {protein}g protein, {carbs}g carbs, {fat_text}, "
        f"{salt}g salt, {sugar}g sugar, {water} ml water{fiber_text}"
    )


def _format_food_meals_lines(entries, indent: str = "") -> list[str]:
    lines: list[str] = []
    for meal in _group_food_meals(entries):
        lines.append(
            f"{indent}- {meal['meal_type']} ({meal['time']}): {_fmt_meal_totals(meal['entries'])}"
        )
        for e in meal["entries"]:
            line = f"{indent}  · {e.emoji} {e.name}"
            if e.amount and e.unit:
                line += f" ({e.amount}{e.unit})"
            line += f": {e.calories} kcal, {e.protein}g protein, {e.carbs}g carbs, {e.fat}g fat"
            if e.saturated_fat is not None:
                line += f" (of which {e.saturated_fat}g saturated)"
            if e.fiber is not None:
                line += f", {e.fiber}g fiber"
            lines.append(line)
    return lines


def _format_single_day_summary(db: Session, date: str, us: UserSettings | None) -> str:
    entries = db.query(FoodEntry).filter(FoodEntry.date == date).order_by(FoodEntry.time).all()
    metric = db.query(DailyMetric).filter(DailyMetric.date == date).first()

    total_cal = sum(e.calories for e in entries)
    total_protein = sum(e.protein for e in entries)
    total_carbs = sum(e.carbs for e in entries)
    total_fat = sum(e.fat for e in entries)
    total_salt = sum(e.salt for e in entries)
    total_sugar = sum(e.sugar for e in entries)
    total_water = sum(e.water_ml for e in entries)
    total_sat_fat = _sum_known(e.saturated_fat for e in entries)
    total_fiber = _sum_known(e.fiber for e in entries)

    result = f"Daily summary for {date}:\nCalories: {total_cal} kcal"
    if us:
        result += f" (goal: {us.calorie_goal} kcal)"
    result += (
        f"\nProtein: {round(total_protein, 1)}g\n"
        f"Carbs: {round(total_carbs, 1)}g\n"
        f"Fat: {round(total_fat, 1)}g\n"
        f"Saturated fat: {_fmt_known(total_sat_fat)}\n"
        f"Fiber: {_fmt_known(total_fiber)}\n"
        f"Salt: {round(total_salt, 2)}g\n"
        f"Sugar: {round(total_sugar, 1)}g\n"
        f"Water: {total_water} ml\n"
        f"Number of entries: {len(entries)}"
    )

    if entries:
        result += "\n\nFood entries:\n" + "\n".join(_format_food_meals_lines(entries))

    if metric:
        result += "\n\nHealth metrics:"
        if metric.steps is not None:
            result += f"\nSteps: {metric.steps}"
        if metric.resting_heart_rate is not None:
            result += f"\nResting heart rate: {int(metric.resting_heart_rate)} bpm"
        if metric.hrv_rmssd is not None:
            result += f"\nHRV (RMSSD): {round(metric.hrv_rmssd, 1)} ms"
    else:
        result += "\n\nNo health metrics for this date."

    return result


def _format_multi_day_summary(
    db: Session, end_date: str, days: int, us: UserSettings | None
) -> str:
    end = date_type.fromisoformat(end_date)
    start = end - timedelta(days=days - 1)
    date_range = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]

    entries = (
        db.query(FoodEntry)
        .filter(FoodEntry.date >= date_range[0], FoodEntry.date <= date_range[-1])
        .order_by(FoodEntry.date, FoodEntry.time)
        .all()
    )
    metrics = {
        m.date: m
        for m in db.query(DailyMetric)
        .filter(DailyMetric.date >= date_range[0], DailyMetric.date <= date_range[-1])
        .all()
    }

    entries_by_date: dict[str, list[FoodEntry]] = defaultdict(list)
    for e in entries:
        entries_by_date[e.date].append(e)

    aim = us.calorie_goal if us else None

    lines: list[str] = [f"Nutrition overview {date_range[0]} to {date_range[-1]} ({days} days):"]

    daily_calories: list[int] = []
    daily_protein: list[float] = []
    daily_carbs: list[float] = []
    daily_fat: list[float] = []
    daily_salt: list[float] = []
    daily_sugar: list[float] = []
    daily_water: list[int] = []
    daily_sat_fat: list[float | None] = []
    daily_fiber: list[float | None] = []

    for d in date_range:
        day_entries = entries_by_date.get(d, [])
        cal = sum(e.calories for e in day_entries)
        prot = round(sum(e.protein for e in day_entries), 1)
        carbs = round(sum(e.carbs for e in day_entries), 1)
        fat = round(sum(e.fat for e in day_entries), 1)
        salt = round(sum(e.salt for e in day_entries), 2)
        sugar = round(sum(e.sugar for e in day_entries), 1)
        water = sum(e.water_ml for e in day_entries)
        sat_fat = _sum_known(e.saturated_fat for e in day_entries)
        fiber = _sum_known(e.fiber for e in day_entries)

        daily_calories.append(cal)
        daily_protein.append(prot)
        daily_carbs.append(carbs)
        daily_fat.append(fat)
        daily_salt.append(salt)
        daily_sugar.append(sugar)
        daily_water.append(water)
        daily_sat_fat.append(sat_fat)
        daily_fiber.append(fiber)

        header = f"\n{d}: {cal} kcal"
        if aim:
            pct = round(cal / aim * 100)
            header += f" ({pct}% of goal {aim})"
        header += (
            f" | {prot}g protein | {carbs}g carbs | {fat}g fat | "
            f"{_fmt_known(sat_fat)} saturated | {_fmt_known(fiber)} fiber | "
            f"{salt}g salt | {sugar}g sugar | {water} ml water"
        )
        if not day_entries:
            header += " | No entries"
        lines.append(header)

        for line in _format_food_meals_lines(day_entries, indent="  "):
            lines.append(line)

    days_with_data = sum(1 for c in daily_calories if c > 0) or 1
    avg_cal = round(sum(daily_calories) / days_with_data)
    avg_prot = round(sum(daily_protein) / days_with_data, 1)
    avg_carbs = round(sum(daily_carbs) / days_with_data, 1)
    avg_fat = round(sum(daily_fat) / days_with_data, 1)
    avg_salt = round(sum(daily_salt) / days_with_data, 2)
    avg_sugar = round(sum(daily_sugar) / days_with_data, 1)
    avg_water = round(sum(daily_water) / days_with_data)

    known_sat_fat = [v for v in daily_sat_fat if v is not None]
    known_fiber = [v for v in daily_fiber if v is not None]
    avg_sat_fat = round(sum(known_sat_fat) / len(known_sat_fat), 1) if known_sat_fat else None
    avg_fiber = round(sum(known_fiber) / len(known_fiber), 1) if known_fiber else None

    lines.append(
        f"\n📊 Average over {days_with_data} days with entries: "
        f"{avg_cal} kcal, {avg_prot}g protein, {avg_carbs}g carbs, {avg_fat}g fat, "
        f"{_fmt_known(avg_sat_fat)} saturated, {_fmt_known(avg_fiber)} fiber, "
        f"{avg_salt}g salt, {avg_sugar}g sugar, {avg_water} ml water"
    )
    if aim:
        lines.append(f"(Average calorie goal: {aim} kcal)")

    metrics_parts: list[str] = []
    for d in date_range:
        m = metrics.get(d)
        if m is None:
            continue
        mp: list[str] = []
        if m.steps is not None:
            mp.append(f"Steps: {m.steps}")
        if m.resting_heart_rate is not None:
            mp.append(f"Resting heart rate: {int(m.resting_heart_rate)} bpm")
        if m.hrv_rmssd is not None:
            mp.append(f"HRV: {round(m.hrv_rmssd, 1)} ms")
        if mp:
            metrics_parts.append(f"{d}: {' | '.join(mp)}")

    if metrics_parts:
        lines.append("\nHealth metrics:")
        lines.extend(metrics_parts)

    return "\n".join(lines)


async def _process_chat_stream(contents: list[dict]):
    if not ai_enabled():
        yield f"data: {json.dumps({'error': AI_DISABLED_MESSAGE})}\n\n"
        yield 'data: {"done": true}\n\n'
        return
    try:
        async for event in _process_chat_impl(contents):
            yield event
    except Exception as e:
        error_msg = str(getattr(e, "detail", str(e)))[:500]
        yield f"data: {json.dumps({'error': error_msg})}\n\n"
        yield 'data: {"done": true}\n\n'


MAX_TOOL_ROUNDS = 7


async def _process_chat_impl(contents: list[dict]):
    db = SessionLocal()
    try:
        day_start_hour = get_or_create_settings(db).day_start_hour
    finally:
        db.close()
    system_prompt = _build_system_prompt(day_start_hour)

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}],
        },
        "contents": contents,
        "tools": [{"functionDeclarations": TOOLS}],
    }

    current_contents = list(contents)
    any_text_yielded = False
    tool_rounds = 0

    while True:
        payload["contents"] = current_contents

        function_calls: list[dict] = []
        async for chunk in stream_chat_gemini(payload, timeout=60):
            if chunk.error is not None:
                yield f"data: {json.dumps({'error': chunk.error})}\n\n"
                continue

            if chunk.text is not None:
                any_text_yielded = True
                yield f"data: {json.dumps({'text': chunk.text})}\n\n"

            elif chunk.function_call is not None:
                function_calls.append(chunk.function_call)

        if not function_calls:
            break

        tool_rounds += 1
        if tool_rounds > MAX_TOOL_ROUNDS:
            break

        model_parts: list[dict] = []
        user_parts: list[dict] = []
        for fc in function_calls:
            fc_name = fc.get("name", "")
            fc_args = fc.get("args", {})

            tool_result = _execute_tool(fc_name, fc_args)

            part: dict = {"functionCall": {"name": fc_name, "args": fc_args}}
            for k, v in fc.items():
                if k.startswith("thought"):
                    part[k] = v
            model_parts.append(part)

            user_parts.append(
                {
                    "functionResponse": {
                        "name": fc_name,
                        "response": {"result": tool_result},
                    }
                }
            )

        current_contents.append({"role": "model", "parts": model_parts})
        current_contents.append({"role": "user", "parts": user_parts})

    if not any_text_yielded:
        if len(current_contents) <= len(contents):
            error_msg = (
                "The AI did not generate an answer. Please try again or rephrase the question."
            )
        else:
            error_msg = "The AI could not finish answering the question (too many tool calls). Please simplify the question."
        yield f"data: {json.dumps({'error': error_msg})}\n\n"

    yield 'data: {"done": true}\n\n'


def _convert_messages(messages: list[ChatMessage]) -> list[dict]:
    contents: list[dict] = []
    for msg in messages:
        role = "user" if msg.role == "user" else "model"
        contents.append(
            {
                "role": role,
                "parts": [{"text": msg.content}],
            }
        )
    return contents


@router.post("/")
async def chat(body: ChatRequest):
    contents = _convert_messages(body.messages)

    return StreamingResponse(
        _process_chat_stream(contents),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
