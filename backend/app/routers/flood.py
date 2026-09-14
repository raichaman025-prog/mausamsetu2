import json
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..geo_utils import haversine_km

router = APIRouter(prefix="/api/flood", tags=["flood"])


@router.get("/history/{location_id}", response_model=schemas.FloodHistorySummaryOut)
def get_flood_history(location_id: int, db: Session = Depends(get_db)):
    loc = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    events = (
        db.query(models.FloodEvent)
        .filter(models.FloodEvent.location_id == location_id)
        .order_by(models.FloodEvent.start_date.asc())
        .all()
    )
    if not events:
        return schemas.FloodHistorySummaryOut(
            events=[], flood_frequency_per_decade=0, avg_rainfall_before_flood=0,
            highest_recorded_risk=0,
        )

    years_span = max(1, (events[-1].start_date.year - events[0].start_date.year) or 1)
    frequency = round(len(events) / years_span * 10, 1)
    avg_rainfall = round(sum(e.rainfall_mm for e in events) / len(events), 1)

    latest_risk = (
        db.query(models.RiskPrediction)
        .filter(models.RiskPrediction.location_id == location_id, models.RiskPrediction.hazard_type == "flood")
        .order_by(models.RiskPrediction.timestamp.desc())
        .first()
    )
    highest_risk = round((latest_risk.risk_score * 100) if latest_risk else 0, 0)

    return schemas.FloodHistorySummaryOut(
        events=events,
        flood_frequency_per_decade=frequency,
        avg_rainfall_before_flood=avg_rainfall,
        highest_recorded_risk=highest_risk,
    )


@router.get("/risk/{location_id}", response_model=schemas.RiskPredictResponse)
def get_flood_risk(location_id: int, db: Session = Depends(get_db)):
    loc = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    pred = (
        db.query(models.RiskPrediction)
        .filter(models.RiskPrediction.location_id == location_id, models.RiskPrediction.hazard_type == "flood")
        .order_by(models.RiskPrediction.timestamp.desc())
        .first()
    )
    if not pred:
        raise HTTPException(status_code=404, detail="No risk prediction available")

    factors = json.loads(pred.factors_json)
    return schemas.RiskPredictResponse(
        location_id=location_id,
        risk_score=pred.risk_score,
        risk_level=pred.risk_level,
        confidence=pred.confidence,
        model_version=pred.model_version,
        factors=schemas.RiskFactors(**factors),
    )


@router.post("/propagation", response_model=schemas.FloodPropagationResult)
def flood_propagation(req: schemas.FloodPropagationRequest, db: Session = Depends(get_db)):
    """
    Estimates how long a flood wave originating at `source_location_id` would
    take to reach `target_location_id`, given a flow speed in km/h.

    ETA = great-circle distance / speed. This is a deliberately simple
    demonstration model — see the disclaimer in the response. A production
    version would route along the actual river channel (PostGIS `ST_Line`
    geometry) rather than a straight line, and would source `water_speed_kmph`
    from real-time river gauge / discharge data instead of a user input.
    """
    if req.water_speed_kmph <= 0:
        raise HTTPException(status_code=400, detail="water_speed_kmph must be greater than 0")

    source = db.query(models.Location).filter(models.Location.id == req.source_location_id).first()
    target = db.query(models.Location).filter(models.Location.id == req.target_location_id).first()
    if not source or not target:
        raise HTTPException(status_code=404, detail="Source or target location not found")

    distance = haversine_km(source.latitude, source.longitude, target.latitude, target.longitude)
    eta_hours = round(distance / req.water_speed_kmph, 2)

    return schemas.FloodPropagationResult(
        source_name=source.name,
        target_name=target.name,
        distance_km=round(distance, 1),
        water_speed_kmph=req.water_speed_kmph,
        eta_hours=eta_hours,
        estimated_arrival_time=datetime.utcnow() + timedelta(hours=eta_hours),
    )


@router.get("/propagation/{source_location_id}", response_model=List[schemas.FloodPropagationTableRow])
def flood_propagation_table(source_location_id: int, speed: float = 25.0, db: Session = Depends(get_db)):
    """
    Same calculation as `/propagation`, but returns ETA to every other
    locality at once — powers the "Downstream Impact Timeline" table in the
    UI so you can see which localities are reached first at a given flow
    speed.
    """
    if speed <= 0:
        raise HTTPException(status_code=400, detail="speed must be greater than 0")

    source = db.query(models.Location).filter(models.Location.id == source_location_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source location not found")

    others = db.query(models.Location).filter(models.Location.id != source_location_id).all()
    rows: List[schemas.FloodPropagationTableRow] = []
    now = datetime.utcnow()
    for target in others:
        distance = haversine_km(source.latitude, source.longitude, target.latitude, target.longitude)
        eta_hours = round(distance / speed, 2)
        rows.append(schemas.FloodPropagationTableRow(
            target_location_id=target.id,
            target_name=target.name,
            distance_km=round(distance, 1),
            eta_hours=eta_hours,
            estimated_arrival_time=now + timedelta(hours=eta_hours),
        ))
    rows.sort(key=lambda r: r.distance_km)
    return rows
