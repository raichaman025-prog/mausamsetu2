import json
import random
import string
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas, auth
from ..database import get_db
from ..verification import compute_verification

router = APIRouter(prefix="/api/citizen", tags=["citizen"])


def _gen_report_code(db: Session) -> str:
    year = datetime.utcnow().year
    while True:
        suffix = "".join(random.choices(string.digits, k=5))
        code = f"MS-{year}-{suffix}"
        exists = db.query(models.CitizenReport).filter(models.CitizenReport.report_code == code).first()
        if not exists:
            return code


def _report_to_out(r: models.CitizenReport, location_name: Optional[str]) -> schemas.CitizenReportOut:
    verification = None
    if r.verification_factors_json:
        parsed = json.loads(r.verification_factors_json)
        verification = schemas.VerificationResultOut(
            factors=[schemas.VerificationFactorOut(**f) for f in parsed["factors"]],
            total_score=parsed["total_score"], max_score=parsed.get("max_score", 100),
            label=parsed["label"],
        )
    return schemas.CitizenReportOut(
        id=r.id, report_code=r.report_code, location_id=r.location_id,
        location_name=location_name, type=r.type, description=r.description,
        image_url=r.image_url, reporter_name=r.reporter_name, timestamp=r.timestamp,
        severity=r.severity, status=r.status, verification_score=r.verification_score,
        verification_label=r.verification_label, verification=verification,
    )


@router.get("/saved-locations", response_model=List[schemas.SavedLocationOut])
def get_saved_locations(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.SavedLocation)
        .options(joinedload(models.SavedLocation.location))
        .filter(models.SavedLocation.user_id == current_user.id)
        .all()
    )
    return rows


@router.post("/saved-locations", response_model=schemas.SavedLocationOut)
def add_saved_location(
    body: schemas.SavedLocationCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    loc = db.query(models.Location).filter(models.Location.id == body.location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    saved = models.SavedLocation(user_id=current_user.id, location_id=loc.id, label=body.label)
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved


@router.delete("/saved-locations/{saved_id}")
def delete_saved_location(
    saved_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(models.SavedLocation)
        .filter(models.SavedLocation.id == saved_id, models.SavedLocation.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Saved location not found")
    db.delete(row)
    db.commit()
    return {"deleted": True}


@router.post("/report", response_model=schemas.CitizenReportOut)
def submit_report(
    body: schemas.CitizenReportCreate,
    db: Session = Depends(get_db),
):
    loc = db.query(models.Location).filter(models.Location.id == body.location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    report = models.CitizenReport(
        report_code=_gen_report_code(db),
        user_id=None,
        location_id=body.location_id,
        type=body.type,
        description=body.description,
        image_url=body.image_url,
        reporter_name=body.reporter_name or "Anonymous Citizen",
        severity=body.severity or "Moderate",
        status="Pending",
    )
    db.add(report)
    db.flush()  # get report.id / timestamp default before running verification

    # AI-assisted trust score — advisory only, never changes `status` itself
    result = compute_verification(
        db, location=loc, report_type=report.type, description=report.description,
        image_url=report.image_url, reporter_user_id=report.user_id,
        report_timestamp=report.timestamp or datetime.utcnow(),
    )
    report.verification_score = result["total_score"]
    report.verification_label = result["label"]
    report.verification_factors_json = json.dumps(result)

    db.commit()
    db.refresh(report)

    return _report_to_out(report, loc.name)


@router.get("/reports", response_model=List[schemas.CitizenReportOut])
def list_my_reports(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.CitizenReport)
        .options(joinedload(models.CitizenReport.location))
        .filter(models.CitizenReport.user_id == current_user.id)
        .order_by(models.CitizenReport.timestamp.desc())
        .all()
    )
    return [_report_to_out(r, r.location.name if r.location else None) for r in rows]
