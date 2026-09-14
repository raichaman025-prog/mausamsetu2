from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from .citizen import _report_to_out

router = APIRouter(prefix="/api/admin", tags=["admin"])

# NOTE: For the prototype, admin endpoints are not gated behind role checks
# so the demo can be shown without a separate admin login step. In
# production, add `Depends(require_admin_role)` using the same JWT auth
# used for citizens, checking `user.role == "admin"`.


@router.get("/summary", response_model=schemas.AdminSummaryOut)
def admin_summary(db: Session = Depends(get_db)):
    total_reports = db.query(models.CitizenReport).count()
    active_alerts = db.query(models.Alert).filter(models.Alert.active == True).count()  # noqa: E712
    high_risk = (
        db.query(models.RiskPrediction.location_id)
        .filter(
            models.RiskPrediction.hazard_type == "flood",
            models.RiskPrediction.risk_level.in_(["HIGH", "SEVERE"]),
        )
        .distinct()
        .count()
    )
    online_sources = db.query(models.DataSource).filter(models.DataSource.status == "ONLINE").count()
    return schemas.AdminSummaryOut(
        total_reports=total_reports, active_alerts=active_alerts,
        high_risk_locations=high_risk, data_sources_online=online_sources,
    )


@router.get("/reports", response_model=List[schemas.CitizenReportOut])
def admin_list_reports(
    status: Optional[str] = None,
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.CitizenReport).options(joinedload(models.CitizenReport.location))
    if status:
        query = query.filter(models.CitizenReport.status == status)
    if location_id:
        query = query.filter(models.CitizenReport.location_id == location_id)
    rows = query.order_by(models.CitizenReport.timestamp.desc()).all()
    return [_report_to_out(r, r.location.name if r.location else None) for r in rows]


@router.get("/reports/{report_id}/verification", response_model=schemas.VerificationResultOut)
def get_report_verification(report_id: int, db: Session = Depends(get_db)):
    import json
    report = db.query(models.CitizenReport).filter(models.CitizenReport.id == report_id).first()
    if not report or not report.verification_factors_json:
        raise HTTPException(status_code=404, detail="No verification data available for this report")
    parsed = json.loads(report.verification_factors_json)
    return schemas.VerificationResultOut(
        factors=[schemas.VerificationFactorOut(**f) for f in parsed["factors"]],
        total_score=parsed["total_score"], max_score=parsed.get("max_score", 100), label=parsed["label"],
    )


@router.patch("/reports/{report_id}", response_model=schemas.CitizenReportOut)
def update_report_status(report_id: int, body: schemas.ReportStatusUpdate, db: Session = Depends(get_db)):
    valid_statuses = {"Pending", "Under Review", "Verified", "Resolved"}
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")

    report = db.query(models.CitizenReport).filter(models.CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = body.status
    db.commit()
    db.refresh(report)
    loc = db.query(models.Location).filter(models.Location.id == report.location_id).first()
    return _report_to_out(report, loc.name if loc else None)
