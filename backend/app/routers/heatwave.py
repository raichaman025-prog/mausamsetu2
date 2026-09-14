import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/heatwave", tags=["heatwave"])


@router.get("/history/{location_id}", response_model=schemas.HeatwaveHistorySummaryOut)
def get_heatwave_history(location_id: int, db: Session = Depends(get_db)):
    loc = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    events = (
        db.query(models.HeatwaveEvent)
        .filter(models.HeatwaveEvent.location_id == location_id)
        .order_by(models.HeatwaveEvent.start_date.asc())
        .all()
    )
    if not events:
        return schemas.HeatwaveHistorySummaryOut(
            events=[], hottest_recorded_temperature=0, avg_duration_days=0, events_last_decade=0,
        )

    hottest = round(max(e.max_temperature for e in events), 1)
    avg_duration = round(sum(e.duration_days for e in events) / len(events), 1)

    return schemas.HeatwaveHistorySummaryOut(
        events=events,
        hottest_recorded_temperature=hottest,
        avg_duration_days=avg_duration,
        events_last_decade=len(events),
    )


@router.get("/risk/{location_id}", response_model=schemas.HeatwaveRiskOut)
def get_heatwave_risk(location_id: int, db: Session = Depends(get_db)):
    loc = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    pred = (
        db.query(models.RiskPrediction)
        .filter(models.RiskPrediction.location_id == location_id, models.RiskPrediction.hazard_type == "heatwave")
        .order_by(models.RiskPrediction.timestamp.desc())
        .first()
    )
    if not pred:
        raise HTTPException(status_code=404, detail="No heatwave risk prediction available")

    factors = json.loads(pred.factors_json)
    return schemas.HeatwaveRiskOut(
        location_id=location_id,
        risk_score=pred.risk_score,
        risk_level=pred.risk_level,
        confidence=pred.confidence,
        model_version=pred.model_version,
        factors=schemas.HeatwaveRiskFactors(**factors),
    )
