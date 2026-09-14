"""
Weather endpoints.

`current` and `history` read from the seeded WeatherObservation table.
To integrate a real provider (e.g. IMD's API, OpenWeather, or a private
rain-gauge network), replace the query bodies below with an HTTP call to
that provider inside a small adapter module (see README: "Swapping mock
weather data for a real API") and keep the response shape identical so the
frontend needs no changes.
"""
from collections import defaultdict
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/weather", tags=["weather"])


def _get_location_or_404(db: Session, location_id: int) -> models.Location:
    loc = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return loc


@router.get("/current/{location_id}", response_model=schemas.WeatherCurrentOut)
def get_current_weather(location_id: int, db: Session = Depends(get_db)):
    _get_location_or_404(db, location_id)
    obs = (
        db.query(models.WeatherObservation)
        .filter(models.WeatherObservation.location_id == location_id)
        .order_by(models.WeatherObservation.timestamp.desc())
        .first()
    )
    if not obs:
        raise HTTPException(status_code=404, detail="No weather data available")
    return obs


@router.get("/forecast/{location_id}", response_model=List[schemas.ForecastPointOut])
def get_forecast(location_id: int, db: Session = Depends(get_db)):
    _get_location_or_404(db, location_id)
    points = (
        db.query(models.WeatherForecast)
        .filter(models.WeatherForecast.location_id == location_id)
        .order_by(models.WeatherForecast.forecast_time.asc())
        .all()
    )
    return points


@router.get("/history/{location_id}", response_model=List[schemas.WeatherHistoryPointOut])
def get_history(
    location_id: int,
    range: str = Query("30d", description="7d | 30d | 6m | 1y | 5y"),
    db: Session = Depends(get_db),
):
    _get_location_or_404(db, location_id)
    obs: List[models.WeatherObservation] = (
        db.query(models.WeatherObservation)
        .filter(models.WeatherObservation.location_id == location_id)
        .order_by(models.WeatherObservation.timestamp.asc())
        .all()
    )
    if not obs:
        return []

    now = datetime.utcnow()
    cutoahead = {
        "7d": 7, "30d": 30, "6m": 182, "1y": 365, "5y": 365 * 5,
    }.get(range, 365 * 5)
    obs = [o for o in obs if (now - o.timestamp).days <= cutoahead]

    # Bucket by month (YYYY-MM) for readable multi-year charts, or by day for short ranges
    buckets = defaultdict(list)
    use_daily = range in ("7d", "30d")
    for o in obs:
        key = o.timestamp.strftime("%Y-%m-%d") if use_daily else o.timestamp.strftime("%Y-%m")
        buckets[key].append(o)

    result = []
    for key in sorted(buckets.keys()):
        items = buckets[key]
        avg_temp = sum(i.temperature for i in items) / len(items)
        avg_rain = sum(i.rainfall for i in items) / len(items)
        avg_hum = sum(i.humidity for i in items) / len(items)
        extreme = sum(1 for i in items if i.temperature >= 42 or i.rainfall >= 100)
        result.append(schemas.WeatherHistoryPointOut(
            period=key,
            avg_temperature=round(avg_temp, 1),
            rainfall_mm=round(avg_rain, 1),
            humidity=round(avg_hum, 1),
            extreme_events=extreme,
        ))
    return result
