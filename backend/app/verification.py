"""
Citizen report verification engine.

Produces an advisory 0-100 trust score for a freshly submitted citizen
report, broken into 11 weighted factors. This is deliberately framed as
DECISION SUPPORT for a human moderator, not an automated accept/reject
gate — a report is never auto-verified or auto-rejected; `status` always
starts at "Pending" and a human sets it from the admin dashboard, using
this score (and its factor breakdown) as one input among others.

Weighting (sums to 100):
  1. Report Corroboration              5 pts  — other similar reports nearby/recently
  2. Reporter Credibility & History   10 pts  — track record of this reporter's past reports
  3. Historical Hazard Match          15 pts  — does this locality have a history of this hazard?
  4. Live Weather / Rainfall Signal   15 pts  — does current weather data support the claim?
  5. Satellite / Remote-Sensing Signal 15 pts — mock NDWI-style water/heat/ground signal
  6. River Gauge / Water-Level Signal 10 pts  — current river-level factor for the locality
  7. Active Alert Correlation          5 pts  — is there a live advisory for this hazard here?
  8. Image Evidence Quality            5 pts  — was photo evidence attached?
  9. Location Plausibility             5 pts  — geofence / duplicate-spam sanity check
  10. Report Timing Plausibility        5 pts — consistent with the hazard's seasonal/diurnal pattern
  11. Population & Density Consistency  5 pts — is this incident type plausible for this locality?

To integrate a real pipeline: swap factor 5 for an actual Sentinel-1/2 or
MODIS flood/heat extent API call, factor 2 for a real reporter reputation
table, and factor 1 for a genuine geospatial "nearby reports" query
(PostGIS ST_DWithin) instead of the same-locality count used here.
"""
import json
from datetime import datetime, timedelta

from . import models
from .hazard_bias import compute_flood_bias, compute_earthquake_bias, compute_heatwave_bias, _hash_unit

FLOOD_RELATED_TYPES = {"Flood", "Waterlogging", "Heavy Rain", "Drainage Blockage"}


def _hazard_bias_for_type(location, report_type: str) -> float:
    if report_type in FLOOD_RELATED_TYPES:
        return compute_flood_bias(location)
    if report_type == "Road Damage":
        return (compute_flood_bias(location) + compute_earthquake_bias(location)) / 2
    # "Other" or anything unmapped — blend all three hazards
    return (compute_flood_bias(location) + compute_earthquake_bias(location) + compute_heatwave_bias(location)) / 3


def compute_verification(
    db, *, location: models.Location, report_type: str, description: str,
    image_url, reporter_user_id, report_timestamp: datetime,
) -> dict:
    factors = []

    # 1. Report Corroboration (5 pts) — similar reports at this locality recently
    window_start = report_timestamp - timedelta(hours=72)
    similar_count = (
        db.query(models.CitizenReport)
        .filter(
            models.CitizenReport.location_id == location.id,
            models.CitizenReport.type == report_type,
            models.CitizenReport.timestamp >= window_start,
        )
        .count()
    )
    corroboration_pts = min(5, 1 + similar_count * 1.5)
    factors.append(_factor(
        "Report Corroboration", corroboration_pts, 5,
        f"{similar_count} other {report_type.lower()} report(s) logged near this locality in the last 72 hours."
    ))

    # 2. Reporter Credibility & History (10 pts)
    if reporter_user_id is None:
        credibility_pts = 5.0
        credibility_note = "Anonymous submission — no reporter history available."
    else:
        past_reports = (
            db.query(models.CitizenReport)
            .filter(models.CitizenReport.user_id == reporter_user_id)
            .all()
        )
        if not past_reports:
            credibility_pts = 6.0
            credibility_note = "First report from this citizen account."
        else:
            verified_ratio = sum(1 for r in past_reports if r.status in ("Verified", "Resolved")) / len(past_reports)
            credibility_pts = round(4 + verified_ratio * 6, 1)
            credibility_note = f"{len(past_reports)} prior report(s), {round(verified_ratio * 100)}% previously verified/resolved."
    factors.append(_factor("Reporter Credibility & History", credibility_pts, 10, credibility_note))

    # 3. Historical Hazard Match (15 pts)
    bias = _hazard_bias_for_type(location, report_type)
    hazard_pts = round(bias * 15, 1)
    factors.append(_factor(
        "Historical Hazard Match", hazard_pts, 15,
        f"{location.name} has a {'high' if bias >= 0.6 else 'moderate' if bias >= 0.35 else 'low'} historical exposure profile for this hazard type."
    ))

    # 4. Live Weather / Rainfall Signal (15 pts)
    latest_obs = (
        db.query(models.WeatherObservation)
        .filter(models.WeatherObservation.location_id == location.id)
        .order_by(models.WeatherObservation.timestamp.desc())
        .first()
    )
    rainfall = latest_obs.rainfall if latest_obs else 0
    if report_type in FLOOD_RELATED_TYPES:
        weather_pts = round(min(15, (rainfall / 60) * 15), 1)
        weather_note = f"Current observed rainfall at this locality is {rainfall} mm."
    else:
        weather_pts = 9.0
        weather_note = "Weather correlation is only strongly diagnostic for flood-related report types."
    factors.append(_factor("Live Weather / Rainfall Signal", weather_pts, 15, weather_note))

    # 5. Satellite / Remote-Sensing Signal (15 pts) — mock NDWI-style signal
    sat_seed = f"sat:{location.slug}:{report_timestamp.date().isoformat()}"
    sat_signal = 0.5 * bias + 0.5 * _hash_unit(sat_seed)
    satellite_pts = round(sat_signal * 15, 1)
    factors.append(_factor(
        "Satellite / Remote-Sensing Signal", satellite_pts, 15,
        "Simulated water/ground-surface change signal for this locality and date (for demonstration — "
        "production would call a Sentinel-1/2 or MODIS flood-extent API)."
    ))

    # 6. River Gauge / Water-Level Signal (10 pts)
    river = (
        db.query(models.RiverLevel)
        .filter(models.RiverLevel.location_id == location.id)
        .order_by(models.RiverLevel.timestamp.desc())
        .first()
    )
    if river and report_type in FLOOD_RELATED_TYPES:
        proximity_to_danger = max(0.0, min(1.0, (river.level_m - (river.warning_level_m - 2)) / (river.danger_level_m - (river.warning_level_m - 2))))
        river_pts = round(proximity_to_danger * 10, 1)
        river_note = f"River level {river.level_m} m vs warning mark {river.warning_level_m} m / danger mark {river.danger_level_m} m."
    else:
        river_pts = 5.0
        river_note = "No directly applicable river-gauge reading for this report type."
    factors.append(_factor("River Gauge / Water-Level Signal", river_pts, 10, river_note))

    # 7. Active Alert Correlation (5 pts)
    active_alert = (
        db.query(models.Alert)
        .filter(models.Alert.location_id == location.id, models.Alert.active == True)  # noqa: E712
        .first()
    )
    alert_pts = 5.0 if active_alert else 1.5
    alert_note = f"Active advisory found: \"{active_alert.title}\"." if active_alert else "No active advisory currently issued for this locality."
    factors.append(_factor("Active Alert Correlation", alert_pts, 5, alert_note))

    # 8. Image Evidence Quality (5 pts)
    image_pts = 5.0 if image_url else 1.5
    image_note = "Photo evidence attached." if image_url else "No photo evidence attached — harder to independently confirm."
    factors.append(_factor("Image Evidence Quality", image_pts, 5, image_note))

    # 9. Location Plausibility (5 pts) — mock geofence / duplicate-spam sanity check
    geofence_signal = 0.7 + 0.3 * _hash_unit(f"geo:{location.slug}:{report_timestamp.isoformat()}")
    location_pts = round(geofence_signal * 5, 1)
    factors.append(_factor(
        "Location Plausibility", location_pts, 5,
        "Reported coordinates are consistent with the selected locality's boundary (simulated geofence check)."
    ))

    # 10. Report Timing Plausibility (5 pts)
    month = report_timestamp.month
    if report_type in FLOOD_RELATED_TYPES:
        seasonal_fit = 1.0 if month in (7, 8, 9) else (0.6 if month in (6, 10) else 0.3)
    elif report_type == "Heavy Rain":
        seasonal_fit = 1.0 if month in (6, 7, 8, 9) else 0.4
    else:
        seasonal_fit = 0.8
    timing_pts = round(seasonal_fit * 5, 1)
    factors.append(_factor(
        "Report Timing Plausibility", timing_pts, 5,
        f"Report timestamp falls {'within' if seasonal_fit >= 0.8 else 'outside'} the typical seasonal window for this hazard type."
    ))

    # 11. Population & Density Consistency (5 pts)
    density_ok = 1.0
    if report_type == "Waterlogging" and location.locality_type == "village" and location.population < 1500:
        density_ok = 0.7  # still plausible, just slightly less common signal at very low density
    density_pts = round(density_ok * 5, 1)
    factors.append(_factor(
        "Population & Density Consistency", density_pts, 5,
        f"Incident type is consistent with a {location.locality_type} of ~{location.population:,} population."
    ))

    total = round(sum(f["points"] for f in factors), 1)
    label = "Likely True" if total >= 70 else ("Needs Review" if total >= 40 else "Likely False")

    return {"factors": factors, "total_score": total, "max_score": 100, "label": label}


def _factor(name: str, points: float, max_points: float, description: str) -> dict:
    return {
        "name": name,
        "points": round(max(0.0, min(max_points, points)), 1),
        "max_points": max_points,
        "description": description,
    }
