import base64
import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..gemini_client import call_gemini, require_ai
from ..models import FoodEntry, FoodStreak, FoodTemplate, KnownFood, UserSettings
from ..schemas.food import (
    AveragesResponse,
    DaySummary,
    FoodEntryCreate,
    FoodEntryResponse,
    FoodEntryUpdate,
    FoodExportResponse,
    FoodStreakResponse,
    FoodTemplateCreate,
    FoodTemplateResponse,
    FoodTemplateUpdate,
    KnownFoodResponse,
    NutritionSuggestionRequest,
    NutritionSuggestionResponse,
    PhotoAnalysisResponse,
    RecentMeal,
    TemplateScaleRequest,
    WeeklyEntry,
)
from ..seed_foods import KNOWN_FOODS
from .settings import get_active_date

router = APIRouter(prefix="/api/food", tags=["food"])

MEAL_TYPE_EMOJIS = {
    "Breakfast": "🌅",
    "Lunch": "☀️",
    "Dinner": "🌙",
    "Snack": "🍿",
}

SAFE_EMOJIS = {item["emoji"] for item in KNOWN_FOODS} | set(MEAL_TYPE_EMOJIS.values()) | {"💧", "🍽️"}

MEAL_TYPE_TIMES = {
    "Breakfast": "07:30",
    "Lunch": "12:30",
    "Dinner": "18:30",
    "Snack": "15:00",
}


def _sum_known(values) -> float | None:
    """Sum only known values (NULL = unknown).

    Returns None if no value is known at all, so an unknown sum is not
    wrongly shown as 0.
    """
    known = [v for v in values if v is not None]
    if not known:
        return None
    return round(sum(known), 1)


def _known_count(values) -> int:
    return sum(1 for v in values if v is not None)


def _daily_average(entries, attr: str) -> float | None:
    """Daily average over only the days on which the value is known."""
    by_day: dict[str, float] = {}
    for e in entries:
        value = getattr(e, attr)
        if value is not None:
            by_day[e.date] = by_day.get(e.date, 0.0) + value
    if not by_day:
        return None
    return round(sum(by_day.values()) / len(by_day), 1)


def resolve_food_emoji(
    db: Session,
    name: str,
    submitted_emoji: str,
    is_drink: bool,
    meal_type: str,
) -> str:
    """Normalize the emoji of a food entry.

    Precedence: curated emoji from known_foods (exact or longest substring
    match) -> submitted emoji if it is in the safe whitelist -> fallback per
    meal type (or 💧 for drinks).
    """
    n = (name or "").strip().lower()
    if not n:
        return submitted_emoji

    known = db.query(KnownFood).filter(func.lower(KnownFood.name) == n).first()
    if known:
        return known.emoji

    best_len = 0
    best_emoji = None
    for kf in db.query(KnownFood).all():
        kn = kf.name.lower()
        if len(kn) >= 3 and len(kn) > best_len and kn in n:
            best_len = len(kn)
            best_emoji = kf.emoji
    if best_emoji:
        return best_emoji

    if submitted_emoji in SAFE_EMOJIS:
        return submitted_emoji

    if is_drink:
        return "💧"
    return MEAL_TYPE_EMOJIS.get(meal_type, "🍽️")


def get_or_create_food_streak(db: Session) -> FoodStreak:
    streak = db.query(FoodStreak).first()
    if not streak:
        streak = FoodStreak(count=0, last_processed_date=None)
        db.add(streak)
        db.commit()
        db.refresh(streak)
    return streak


def check_food_streak(db: Session) -> FoodStreak:
    streak = get_or_create_food_streak(db)

    def has_entries(day) -> bool:
        return db.query(FoodEntry).filter(FoodEntry.date == day.strftime("%Y-%m-%d")).count() > 0

    count = 0
    today = get_active_date(db)
    # Today is still open: without entries yet it neither counts nor breaks the streak.
    d = today if has_entries(today) else today - timedelta(days=1)
    while has_entries(d):
        count += 1
        d -= timedelta(days=1)
    streak.count = count
    streak.last_processed_date = today.strftime("%Y-%m-%d")
    db.commit()
    db.refresh(streak)
    return streak


@router.get("/streak", response_model=FoodStreakResponse)
def get_food_streak(db: Session = Depends(get_db)):
    streak = check_food_streak(db)
    return FoodStreakResponse(
        count=streak.count,
        last_processed_date=streak.last_processed_date,
    )


@router.get("/weekly", response_model=list[WeeklyEntry])
def get_weekly_calories(db: Session = Depends(get_db)):
    result = []
    today = get_active_date(db)
    for i in range(0, 7):
        d = today - timedelta(days=i)
        ds = d.strftime("%Y-%m-%d")
        entries = db.query(FoodEntry).filter(FoodEntry.date == ds).all()
        total_cal = sum(e.calories for e in entries)
        result.append(
            WeeklyEntry(
                date=ds,
                total_calories=total_cal,
                entry_count=len(entries),
            )
        )
    return result


@router.get("/averages", response_model=AveragesResponse)
def get_averages(db: Session = Depends(get_db)):
    last_date = get_active_date(db)
    first_date = last_date - timedelta(days=6)
    ds_first = first_date.strftime("%Y-%m-%d")
    ds_last = last_date.strftime("%Y-%m-%d")

    entries = (
        db.query(FoodEntry).filter(FoodEntry.date >= ds_first, FoodEntry.date <= ds_last).all()
    )

    dates_with_entries = set(e.date for e in entries)
    days_counted = len(dates_with_entries)

    if days_counted == 0:
        return AveragesResponse(avg_calories=0, avg_protein=0, days_counted=0)

    avg_cal = sum(e.calories for e in entries) / days_counted
    avg_prot = sum(e.protein for e in entries) / days_counted

    fiber_by_day: dict[str, float] = {}
    sat_fat_by_day: dict[str, float] = {}
    for e in entries:
        if e.fiber is not None:
            fiber_by_day[e.date] = fiber_by_day.get(e.date, 0.0) + e.fiber
        if e.saturated_fat is not None:
            sat_fat_by_day[e.date] = sat_fat_by_day.get(e.date, 0.0) + e.saturated_fat

    avg_fiber = round(sum(fiber_by_day.values()) / len(fiber_by_day), 1) if fiber_by_day else None
    avg_sat_fat = (
        round(sum(sat_fat_by_day.values()) / len(sat_fat_by_day), 1) if sat_fat_by_day else None
    )

    return AveragesResponse(
        avg_calories=round(avg_cal, 1),
        avg_protein=round(avg_prot, 1),
        avg_fiber=avg_fiber,
        avg_saturated_fat=avg_sat_fat,
        days_counted=days_counted,
    )


@router.get("/recent", response_model=list[RecentMeal])
def get_recent_meals(db: Session = Depends(get_db)):
    subquery = (
        db.query(FoodEntry.name, FoodEntry.is_drink, func.max(FoodEntry.id).label("max_id"))
        .group_by(FoodEntry.name, FoodEntry.is_drink)
        .order_by(func.max(FoodEntry.id).desc())
        .limit(10)
        .subquery()
    )

    rows = (
        db.query(FoodEntry)
        .join(subquery, FoodEntry.id == subquery.c.max_id)
        .order_by(FoodEntry.id.desc())
        .all()
    )

    return [
        RecentMeal(
            name=r.name,
            emoji=r.emoji,
            is_drink=r.is_drink,
            meal_type=r.meal_type,
            amount=r.amount,
            unit=r.unit,
            grams_total=r.grams_total,
            calories=r.calories,
            protein=r.protein,
            carbs=r.carbs,
            fat=r.fat,
            salt=r.salt,
            sugar=r.sugar,
            fiber=r.fiber,
            saturated_fat=r.saturated_fat,
        )
        for r in rows
    ]


@router.get("/defaults/time", response_model=dict)
def get_meal_defaults():
    return {
        "times": MEAL_TYPE_TIMES,
        "emojis": MEAL_TYPE_EMOJIS,
    }


@router.get("/foods-db", response_model=list[KnownFoodResponse])
def get_known_foods(db: Session = Depends(get_db)):
    return db.query(KnownFood).order_by(KnownFood.category, KnownFood.name).all()


@router.post("/analyze-photo", response_model=PhotoAnalysisResponse)
async def analyze_photo(
    file: UploadFile = File(...),
    notes: str = Form(""),
    x_requested_with: str | None = Header(None),
):
    # Form uploads are "simple" requests that any website can send without a CORS preflight.
    # Requiring a custom header (set by the frontend) forces a preflight, which fails because the
    # API has no CORS, so other websites cannot use up the Gemini quota.
    if not x_requested_with:
        raise HTTPException(status_code=403, detail="Missing X-Requested-With header")
    require_ai()

    image_bytes = await file.read()
    mime_type = file.content_type or "image/jpeg"
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    prompt = (
        "Analyze the image of a meal or drink. "
        "Return the answer ONLY as a JSON object, without Markdown, code blocks "
        "or any additional text. The JSON must contain exactly these fields:\n"
        '{"name": "short name of the meal", "emoji": "matching emoji", '
        '"calories": estimated_kcal_as_integer, '
        '"protein": grams_protein_as_float, '
        '"carbs": grams_carbs_as_float, '
        '"fat": grams_fat_as_float, '
        '"salt": grams_salt_as_float, '
        '"sugar": grams_sugar_as_float, '
        '"fiber": grams_fiber_as_float_or_null_if_unknown, '
        '"saturated_fat": grams_saturated_fat_as_float_or_null_if_unknown, '
        '"water_ml": estimated_water_in_ml_as_integer_NEVER_0_or_null, '
        '"amount": consumed_amount_as_float_if_known_else_null, '
        '"unit": "unit_like_g_ml_pcs_tsp_tbsp_if_known_else_null"}\n'
        "Important: water_ml must always be a realistic estimate > 0, since every "
        "food contains water (e.g. yogurt ~80%, bread ~35%, cheese ~40%). "
        "If you cannot reliably estimate fiber or saturated_fat, set the value "
        "to null instead of 0. "
        "Write the name in the language of the notes; without notes, use English. "
        'If the notes mention a consumed amount (e.g. "250g" or "500ml"), '
        "use it as amount and the matching unit as unit. "
        "If the notes contain no amount, set amount and unit to null.\n"
    )
    if notes:
        prompt += f"Notes: {notes}\n"

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"inlineData": {"mimeType": mime_type, "data": image_b64}},
                ]
            }
        ]
    }
    data = await call_gemini(payload, timeout=30)

    candidates = data.get("candidates", [])
    if not candidates:
        raise HTTPException(status_code=500, detail="No response from Gemini")

    text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()

    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [line for line in lines if not line.startswith("```")]
        text = "\n".join(lines).strip()

    try:
        result = json.loads(text)
    except json.JSONDecodeError as err:
        raise HTTPException(
            status_code=500, detail=f"Invalid JSON response from Gemini: {text[:200]}"
        ) from err

    return PhotoAnalysisResponse(
        name=result.get("name", "Unknown meal"),
        emoji=result.get("emoji", "🍽️"),
        calories=result.get("calories") or 0,
        protein=result.get("protein") or 0,
        carbs=result.get("carbs") or 0,
        fat=result.get("fat") or 0,
        salt=result.get("salt") or 0,
        sugar=result.get("sugar") or 0,
        water_ml=result.get("water_ml") or 0,
        fiber=result.get("fiber"),
        saturated_fat=result.get("saturated_fat"),
        amount=result.get("amount"),
        unit=result.get("unit"),
    )


@router.post("/suggest-nutrition", response_model=NutritionSuggestionResponse)
async def suggest_nutrition(body: NutritionSuggestionRequest):
    require_ai()

    prompt = (
        f"Estimate the nutrition facts for this food or drink: {body.name}, "
        f"amount: {body.amount} {body.unit}. "
        "Return the answer ONLY as a JSON object, without Markdown, code blocks "
        "or any additional text. The JSON must contain exactly these fields:\n"
        '{"name": "name in the same language as the input", "emoji": "matching emoji", '
        '"calories": estimated_kcal_as_integer, '
        '"protein": grams_protein_as_float, '
        '"carbs": grams_carbs_as_float, '
        '"fat": grams_fat_as_float, '
        '"salt": grams_salt_as_float, '
        '"sugar": grams_sugar_as_float, '
        '"fiber": grams_fiber_as_float_or_null_if_unknown, '
        '"saturated_fat": grams_saturated_fat_as_float_or_null_if_unknown, '
        '"water_ml": estimated_water_in_ml_as_integer_NEVER_0_or_null}\n'
        "Important: water_ml must always be a realistic estimate > 0, since every "
        "food contains water (e.g. yogurt ~80%, bread ~35%, cheese ~40%). "
        "If you cannot reliably estimate fiber or saturated_fat, set the value "
        "to null instead of 0.\n"
    )

    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    data = await call_gemini(payload, timeout=15)

    candidates = data.get("candidates", [])
    if not candidates:
        raise HTTPException(status_code=500, detail="No response from Gemini")

    text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()

    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [line for line in lines if not line.startswith("```")]
        text = "\n".join(lines).strip()

    try:
        result = json.loads(text)
    except json.JSONDecodeError as err:
        raise HTTPException(
            status_code=500, detail=f"Invalid JSON response from Gemini: {text[:200]}"
        ) from err

    return NutritionSuggestionResponse(
        name=result.get("name", body.name),
        emoji=result.get("emoji", "🍽️"),
        calories=result.get("calories") or 0,
        protein=result.get("protein") or 0,
        carbs=result.get("carbs") or 0,
        fat=result.get("fat") or 0,
        salt=result.get("salt") or 0,
        sugar=result.get("sugar") or 0,
        water_ml=result.get("water_ml") or 0,
        fiber=result.get("fiber"),
        saturated_fat=result.get("saturated_fat"),
    )


@router.get("/templates", response_model=list[FoodTemplateResponse])
def get_templates(q: str = "", db: Session = Depends(get_db)):
    query = db.query(FoodTemplate).order_by(FoodTemplate.label)
    if q:
        query = query.filter(FoodTemplate.label.ilike(f"%{q}%") | FoodTemplate.name.ilike(f"%{q}%"))
    return query.all()


@router.post("/templates", response_model=FoodTemplateResponse, status_code=201)
def create_template(template: FoodTemplateCreate, db: Session = Depends(get_db)):
    tpl = FoodTemplate(**template.model_dump())
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


@router.post("/templates/scale", response_model=FoodTemplateResponse)
def scale_template(body: TemplateScaleRequest, db: Session = Depends(get_db)):
    tpl = db.query(FoodTemplate).filter(FoodTemplate.id == body.template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    factor = body.target_amount / tpl.amount if tpl.amount else 1
    return FoodTemplateResponse(
        id=tpl.id,
        label=tpl.label,
        name=tpl.name,
        emoji=tpl.emoji,
        is_drink=tpl.is_drink,
        amount=body.target_amount,
        unit=tpl.unit,
        calories=round(tpl.calories * factor),
        protein=round(tpl.protein * factor, 1),
        carbs=round(tpl.carbs * factor, 1),
        fat=round(tpl.fat * factor, 1),
        salt=round(tpl.salt * factor, 2),
        sugar=round(tpl.sugar * factor, 1),
        water_ml=round(tpl.water_ml * factor),
        fiber=round(tpl.fiber * factor, 1) if tpl.fiber is not None else None,
        saturated_fat=round(tpl.saturated_fat * factor, 1)
        if tpl.saturated_fat is not None
        else None,
        created_at=tpl.created_at,
        updated_at=tpl.updated_at,
    )


@router.patch("/templates/{template_id}", response_model=FoodTemplateResponse)
def update_template(template_id: int, update: FoodTemplateUpdate, db: Session = Depends(get_db)):
    tpl = db.query(FoodTemplate).filter(FoodTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tpl, key, value)
    db.commit()
    db.refresh(tpl)
    return tpl


@router.delete("/templates/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    tpl = db.query(FoodTemplate).filter(FoodTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(tpl)
    db.commit()


WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _fmt_num(value) -> str:
    if value is None:
        return "-"
    if isinstance(value, float):
        return f"{value:.1f}".rstrip("0").rstrip(".")
    return str(value)


def _meal_amount(entry) -> str:
    if entry.amount is None:
        return ""
    if entry.unit == "pcs" and entry.grams_total is not None:
        suffix = "ml" if entry.is_drink else "g"
        return f"{_fmt_num(entry.amount)} pcs ({_fmt_num(entry.grams_total)} {suffix})"
    return f"{_fmt_num(entry.amount)} {entry.unit or 'g'}"


def _format_date(date_str: str) -> str:
    # Locale-independent "Oct 31, 2026" (strftime names depend on the system locale).
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return f"{MONTHS[d.month - 1]} {d.day}, {d.year}"


def _format_day_heading(date_str: str) -> str:
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return f"{WEEKDAYS[d.weekday()]}, {_format_date(date_str)}"


def _nutrient_summary(
    kcal,
    protein,
    carbs,
    fat,
    salt,
    sugar,
    water,
    fiber=None,
    saturated_fat=None,
) -> str:
    return (
        f"{_fmt_num(kcal)} kcal · Protein {_fmt_num(protein)} g · "
        f"Carbs {_fmt_num(carbs)} g · Fat {_fmt_num(fat)} g · "
        f"Saturated fat {_fmt_num(saturated_fat)} g · "
        f"Fiber {_fmt_num(fiber)} g · "
        f"Salt {_fmt_num(salt)} g · Sugar {_fmt_num(sugar)} g · "
        f"Water {_fmt_num(water)} ml"
    )


@router.get("/export", response_model=FoodExportResponse)
def export_food(start: str, end: str, db: Session = Depends(get_db)):
    entries = (
        db.query(FoodEntry)
        .filter(FoodEntry.date >= start, FoodEntry.date <= end)
        .order_by(FoodEntry.date.asc(), FoodEntry.time.asc(), FoodEntry.id.asc())
        .all()
    )

    if not entries:
        return FoodExportResponse(
            content="# Nutrition export\n\nNo entries in the selected period.\n",
            filename=f"nutrition_{start}_to_{end}.md",
        )

    days = {}
    for e in entries:
        meals = days.setdefault(e.date, [])
        meal = next(
            (m for m in meals if m["meal_type"] == e.meal_type and m["time"] == e.time),
            None,
        )
        if meal is None:
            meal = {"meal_type": e.meal_type, "time": e.time, "entries": []}
            meals.append(meal)
        meal["entries"].append(e)

    total_calories = sum(e.calories for e in entries)
    total_protein = sum(e.protein for e in entries)
    total_carbs = sum(e.carbs for e in entries)
    total_fat = sum(e.fat for e in entries)
    total_salt = sum(e.salt for e in entries)
    total_sugar = sum(e.sugar for e in entries)
    total_water = sum(e.water_ml for e in entries)
    days_counted = len(days)

    lines = [
        "# Nutrition export",
        "",
        f"**Period:** {_format_date(start)} - {_format_date(end)}",
        f"**Days with entries:** {days_counted}",
        "",
        "**Average per day:** "
        + _nutrient_summary(
            total_calories / days_counted,
            total_protein / days_counted,
            total_carbs / days_counted,
            total_fat / days_counted,
            total_salt / days_counted,
            total_sugar / days_counted,
            total_water / days_counted,
            fiber=_daily_average(entries, "fiber"),
            saturated_fat=_daily_average(entries, "saturated_fat"),
        ),
        "",
    ]

    for day_date, meals in days.items():
        meals.sort(key=lambda m: m["time"])
        day_entries = [e for m in meals for e in m["entries"]]

        lines.append(f"## {_format_day_heading(day_date)}")
        lines.append("")
        lines.append(
            "**Day total:** "
            + _nutrient_summary(
                sum(e.calories for e in day_entries),
                sum(e.protein for e in day_entries),
                sum(e.carbs for e in day_entries),
                sum(e.fat for e in day_entries),
                sum(e.salt for e in day_entries),
                sum(e.sugar for e in day_entries),
                sum(e.water_ml for e in day_entries),
                fiber=_sum_known(e.fiber for e in day_entries),
                saturated_fat=_sum_known(e.saturated_fat for e in day_entries),
            )
        )
        lines.append("")

        for meal in meals:
            m_entries = meal["entries"]
            lines.append(f"### {meal['meal_type']} ({meal['time']})")
            lines.append("")
            lines.append(
                "| Time | Food | Amount | kcal | Protein | Carbs | Fat | Sat. fat | Fiber | Salt | Sugar | Water | Notes |"
            )
            lines.append("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
            for e in m_entries:
                amount = _meal_amount(e) or "-"
                notes = (e.notes or "").replace("|", "\\|").replace("\n", " ")
                notes = notes if notes else "-"
                lines.append(
                    f"| {e.time} | {e.emoji} {e.name} | {amount} | {_fmt_num(e.calories)} | "
                    f"{_fmt_num(e.protein)} | {_fmt_num(e.carbs)} | {_fmt_num(e.fat)} | "
                    f"{_fmt_num(e.saturated_fat)} | {_fmt_num(e.fiber)} | "
                    f"{_fmt_num(e.salt)} | {_fmt_num(e.sugar)} | {_fmt_num(e.water_ml)} | {notes} |"
                )
            lines.append("")
            lines.append(
                "**Meal total:** "
                + _nutrient_summary(
                    sum(e.calories for e in m_entries),
                    sum(e.protein for e in m_entries),
                    sum(e.carbs for e in m_entries),
                    sum(e.fat for e in m_entries),
                    sum(e.salt for e in m_entries),
                    sum(e.sugar for e in m_entries),
                    sum(e.water_ml for e in m_entries),
                    fiber=_sum_known(e.fiber for e in m_entries),
                    saturated_fat=_sum_known(e.saturated_fat for e in m_entries),
                )
            )
            lines.append("")

    return FoodExportResponse(
        content="\n".join(lines),
        filename=f"nutrition_{start}_to_{end}.md",
    )


@router.get("/{date}", response_model=list[FoodEntryResponse])
def get_food_entries(date: str, db: Session = Depends(get_db)):
    if date == get_active_date(db).isoformat():
        check_food_streak(db)
    return db.query(FoodEntry).filter(FoodEntry.date == date).order_by(FoodEntry.time.desc()).all()


@router.post("/", response_model=FoodEntryResponse, status_code=201)
def create_food_entry(entry: FoodEntryCreate, db: Session = Depends(get_db)):
    data = entry.model_dump()
    data["emoji"] = resolve_food_emoji(
        db, data["name"], data["emoji"], data["is_drink"], data["meal_type"]
    )
    food = FoodEntry(**data)
    db.add(food)
    db.commit()
    db.refresh(food)
    return food


@router.get("/{date}/summary", response_model=DaySummary)
def get_day_summary(date: str, db: Session = Depends(get_db)):
    entries = db.query(FoodEntry).filter(FoodEntry.date == date).all()
    us = db.query(UserSettings).first()
    calorie_goal = us.calorie_goal if us else 2000

    return DaySummary(
        date=date,
        total_calories=sum(e.calories for e in entries),
        total_protein=sum(e.protein for e in entries),
        total_carbs=sum(e.carbs for e in entries),
        total_fat=sum(e.fat for e in entries),
        total_salt=sum(e.salt for e in entries),
        total_sugar=sum(e.sugar for e in entries),
        total_water_ml=sum(e.water_ml for e in entries),
        total_fiber=_sum_known(e.fiber for e in entries),
        total_saturated_fat=_sum_known(e.saturated_fat for e in entries),
        fiber_known_entries=_known_count(e.fiber for e in entries),
        saturated_fat_known_entries=_known_count(e.saturated_fat for e in entries),
        entry_count=len(entries),
        calorie_goal=calorie_goal,
    )


@router.patch("/{entry_id}", response_model=FoodEntryResponse)
def update_food_entry(entry_id: int, update: FoodEntryUpdate, db: Session = Depends(get_db)):
    food = db.query(FoodEntry).filter(FoodEntry.id == entry_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Entry not found")
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(food, key, value)
    food.emoji = resolve_food_emoji(db, food.name, food.emoji, food.is_drink, food.meal_type)
    db.commit()
    db.refresh(food)
    return food


@router.delete("/{entry_id}", status_code=204)
def delete_food_entry(entry_id: int, db: Session = Depends(get_db)):
    food = db.query(FoodEntry).filter(FoodEntry.id == entry_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(food)
    db.commit()
