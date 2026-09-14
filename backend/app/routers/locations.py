from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("", response_model=List[schemas.LocationOut])
def list_locations(
    q: Optional[str] = None,
    district: Optional[str] = None,
    tehsil: Optional[str] = None,
    block: Optional[str] = None,
    locality_type: Optional[str] = None,
    limit: int = 500,
    db: Session = Depends(get_db),
):
    query = db.query(models.Location)
    if q:
        query = query.filter(models.Location.name.ilike(f"%{q}%"))
    if district:
        query = query.filter(models.Location.district == district)
    if tehsil:
        query = query.filter(models.Location.tehsil == tehsil)
    if block:
        query = query.filter(models.Location.block == block)
    if locality_type:
        query = query.filter(models.Location.locality_type == locality_type)
    return query.order_by(models.Location.name).limit(limit).all()


@router.get("/districts", response_model=List[str])
def list_districts(db: Session = Depends(get_db)):
    rows = db.query(models.Location.district).distinct().order_by(models.Location.district).all()
    return [r[0] for r in rows]


@router.get("/{location_id}", response_model=schemas.LocationOut)
def get_location(location_id: int, db: Session = Depends(get_db)):
    loc = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return loc


@router.get("/by-slug/{slug}", response_model=schemas.LocationOut)
def get_location_by_slug(slug: str, db: Session = Depends(get_db)):
    loc = db.query(models.Location).filter(models.Location.slug == slug).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return loc
