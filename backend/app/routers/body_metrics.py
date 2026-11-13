from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import BodyMeasurement, BodyProfile
from ..schemas.body import (
    BodyMeasurementCreate,
    BodyMeasurementResponse,
    BodyMeasurementUpdate,
    BodyProfileCreate,
    BodyProfileResponse,
    BodyProfileUpdate,
)

router = APIRouter(prefix="/api/body", tags=["body"])


GENDERS = ("male", "female", "other")


def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    height_m = height_cm / 100
    return round(weight_kg / (height_m * height_m), 1)


@router.get("/profile", response_model=BodyProfileResponse | None)
def get_profile(db: Session = Depends(get_db)):
    return db.query(BodyProfile).first()


@router.post("/profile", response_model=BodyProfileResponse)
def create_profile(data: BodyProfileCreate, db: Session = Depends(get_db)):
    existing = db.query(BodyProfile).first()
    if existing:
        raise HTTPException(status_code=409, detail="Profile already exists")
    if data.gender not in GENDERS:
        raise HTTPException(status_code=422, detail="Gender must be male, female or other")
    profile = BodyProfile(
        height_cm=data.height_cm,
        age=data.age,
        gender=data.gender,
        occupation=data.occupation,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.patch("/profile", response_model=BodyProfileResponse)
def update_profile(data: BodyProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(BodyProfile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="No profile found")

    if data.height_cm is not None:
        profile.height_cm = data.height_cm
    if data.age is not None:
        profile.age = data.age
    if data.gender is not None:
        if data.gender not in GENDERS:
            raise HTTPException(status_code=422, detail="Gender must be male, female or other")
        profile.gender = data.gender
    if data.occupation is not None:
        profile.occupation = data.occupation

    db.commit()

    if data.height_cm is not None:
        measurements = db.query(BodyMeasurement).all()
        for m in measurements:
            m.bmi = calculate_bmi(m.weight_kg, data.height_cm)
        db.commit()

    db.refresh(profile)
    return profile


@router.get("/measurements", response_model=list[BodyMeasurementResponse])
def get_measurements(db: Session = Depends(get_db)):
    return db.query(BodyMeasurement).order_by(BodyMeasurement.date.desc()).all()


@router.post("/measurements", response_model=BodyMeasurementResponse)
def create_measurement(data: BodyMeasurementCreate, db: Session = Depends(get_db)):
    profile = db.query(BodyProfile).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Create a body profile first")

    bmi = calculate_bmi(data.weight_kg, profile.height_cm)

    measurement = BodyMeasurement(
        date=data.date,
        weight_kg=data.weight_kg,
        body_fat_pct=data.body_fat_pct,
        muscle_mass_kg=data.muscle_mass_kg,
        bmi=bmi,
    )
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return measurement


@router.patch("/measurements/{measurement_id}", response_model=BodyMeasurementResponse)
def update_measurement(
    measurement_id: int, data: BodyMeasurementUpdate, db: Session = Depends(get_db)
):
    measurement = db.query(BodyMeasurement).filter(BodyMeasurement.id == measurement_id).first()
    if not measurement:
        raise HTTPException(status_code=404, detail="Measurement not found")

    profile = db.query(BodyProfile).first()

    if data.date is not None:
        measurement.date = data.date
    if data.weight_kg is not None:
        measurement.weight_kg = data.weight_kg
        if profile:
            measurement.bmi = calculate_bmi(data.weight_kg, profile.height_cm)
    if data.body_fat_pct is not None:
        measurement.body_fat_pct = data.body_fat_pct
    if data.muscle_mass_kg is not None:
        measurement.muscle_mass_kg = data.muscle_mass_kg

    db.commit()
    db.refresh(measurement)
    return measurement


@router.delete("/measurements/{measurement_id}", status_code=204)
def delete_measurement(measurement_id: int, db: Session = Depends(get_db)):
    measurement = db.query(BodyMeasurement).filter(BodyMeasurement.id == measurement_id).first()
    if not measurement:
        raise HTTPException(status_code=404, detail="Measurement not found")
    db.delete(measurement)
    db.commit()
