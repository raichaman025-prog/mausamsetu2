import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/earthquake", tags=["earthquake"])


@router.get("/history/{location_id}", response_model=schemas.EarthquakeHistorySummaryOut)
def get_earthquake_history(location_id: int, db: Session = Depends(get_db)):
    loc = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    events = (
        db.query(models.EarthquakeEvent)
        .filter(models.EarthquakeEvent.location_id == location_id)
        .order_by(models.EarthquakeEvent.date.asc())
        .all()
    )
    if not events:
        return schemas.EarthquakeHistorySummaryOut(
            events=[], strongest_recorded_magnitude=0, avg_depth_km=0, events_last_decade=0,
        )

    strongest = round(max(e.magnitude for e in events), 1)
    avg_depth = round(sum(e.depth_km for e in events) / len(events), 1)

    return schemas.EarthquakeHistorySummaryOut(
        events=events,
        strongest_recorded_magnitude=strongest,
        avg_depth_km=avg_depth,
        events_last_decade=len(events),
    )


@router.get("/risk/{location_id}", response_model=schemas.EarthquakeRiskOut)
def get_earthquake_risk(location_id: int, db: Session = Depends(get_db)):
    loc = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    pred = (
        db.query(models.RiskPrediction)
        .filter(models.RiskPrediction.location_id == location_id, models.RiskPrediction.hazard_type == "earthquake")
        .order_by(models.RiskPrediction.timestamp.desc())
        .first()
    )
    if not pred:
        raise HTTPException(status_code=404, detail="No earthquake risk prediction available")

    factors = json.loads(pred.factors_json)
    return schemas.EarthquakeRiskOut(
        location_id=location_id,
        risk_score=pred.risk_score,
        risk_level=pred.risk_level,
        confidence=pred.confidence,
        model_version=pred.model_version,
        factors=schemas.EarthquakeRiskFactors(**factors),
    )
