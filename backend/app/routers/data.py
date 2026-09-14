import random
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/data", tags=["data"])


@router.get("/status", response_model=List[schemas.DataSourceOut])
def data_status(db: Session = Depends(get_db)):
    return db.query(models.DataSource).all()


@router.post("/sync", response_model=List[schemas.DataSourceOut])
def run_sync(db: Session = Depends(get_db)):
    """
    Simulates an ingestion cycle across all connected data sources.
    In production this endpoint would enqueue a background job (Celery/RQ)
    that calls each provider adapter, validates, cleans, and writes fresh
    rows — this mock version simply bumps counters and timestamps so the
    "Run Data Sync" button in the UI has a real, visible effect.
    """
    sources = db.query(models.DataSource).all()
    for s in sources:
        s.records_ingested += random.randint(15, 120)
        s.last_sync = datetime.utcnow()
        s.data_quality_pct = round(min(99.9, s.data_quality_pct + random.uniform(-0.3, 0.4)), 1)
        s.status = "ONLINE"
    db.commit()
    return sources
