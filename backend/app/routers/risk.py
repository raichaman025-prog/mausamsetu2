"""
Risk Engine.

`predict` implements a deterministic, explainable mock model so the
prototype never needs a trained ML artifact to demo convincingly. It takes
weighted inputs (rainfall forecast, river level, soil moisture, historical
flood frequency, drainage capacity) and produces a 0–1 score plus a
human-readable risk level and factor breakdown.

To replace with a real model: swap `compute_mock_risk()` for a call to a
trained model (scikit-learn/XGBoost pickle, or a hosted inference
endpoint), keeping the same RiskPredictResponse shape so the frontend is
unaffected. See README: "Swapping the mock flood-risk model for real ML".
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/risk", tags=["risk"])


def risk_level_from_score(score: float) -> str:
    if score >= 0.85:
        return "SEVERE"
    if score >= 0.7:
        return "HIGH"
    if score >= 0.4:
        return "MODERATE"
    return "LOW"


def compute_mock_risk(
    rainfall_mm: float, river_level_pct: float, soil_moisture_pct: float,
    historical_flood_count: int, drainage_risk_pct: float,
) -> dict:
    forecast_rainfall = min(100.0, rainfall_mm / 1.5)
    river_water_level = min(100.0, river_level_pct)
    soil_moisture = min(100.0, soil_moisture_pct)
    historical_flood_risk = min(100.0, 20 + historical_flood_count * 12)
    drainage_risk = min(100.0, drainage_risk_pct)

    score = round(
        0.28 * forecast_rainfall / 100
        + 0.22 * river_water_level / 100
        + 0.18 * soil_moisture / 100
        + 0.20 * historical_flood_risk / 100
        + 0.12 * drainage_risk / 100,
        2,
    )
    return dict(
        score=score,
        level=risk_level_from_score(score),
        factors=dict(
            forecast_rainfall=forecast_rainfall,
            river_water_level=river_water_level,
            soil_moisture=soil_moisture,
            historical_flood_risk=historical_flood_risk,
            drainage_risk=drainage_risk,
        ),
    )


@router.post("/predict", response_model=schemas.RiskPredictResponse)
def predict_risk(req: schemas.RiskPredictRequest, db: Session = Depends(get_db)):
    loc = db.query(models.Location).filter(models.Location.id == req.location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    latest_obs = (
        db.query(models.WeatherObservation)
        .filter(models.WeatherObservation.location_id == req.location_id)
        .order_by(models.WeatherObservation.timestamp.desc())
        .first()
    )
    flood_count = (
        db.query(models.FloodEvent)
        .filter(models.FloodEvent.location_id == req.location_id)
        .count()
    )

    rainfall = req.rainfall if req.rainfall is not None else (latest_obs.rainfall if latest_obs else 20)
    river_level_pct = req.river_level if req.river_level is not None else 55
    soil_moisture = req.soil_moisture if req.soil_moisture is not None else 60
    hist_count = req.historical_flood_count if req.historical_flood_count is not None else flood_count
    drainage_risk_pct = 55

    result = compute_mock_risk(rainfall, river_level_pct, soil_moisture, hist_count, drainage_risk_pct)

    return schemas.RiskPredictResponse(
        location_id=req.location_id,
        risk_score=result["score"],
        risk_level=result["level"],
        confidence=0.86,
        model_version="mausamsetu-riskv1-mock",
        factors=schemas.RiskFactors(**result["factors"]),
    )
