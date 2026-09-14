from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=List[schemas.AlertOut])
def list_alerts(
    location_id: Optional[int] = None,
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
):
    query = db.query(models.Alert).options(joinedload(models.Alert.location))
    if location_id:
        query = query.filter(models.Alert.location_id == location_id)
    if active_only:
        query = query.filter(models.Alert.active == True)  # noqa: E712
    alerts = query.order_by(models.Alert.valid_from.desc()).all()

    out = []
    for a in alerts:
        out.append(schemas.AlertOut(
            id=a.id, location_id=a.location_id,
            location_name=a.location.name if a.location else None,
            severity=a.severity, title=a.title, description=a.description,
            recommended_action=a.recommended_action, valid_from=a.valid_from,
            valid_until=a.valid_until, active=a.active,
        ))
    return out
