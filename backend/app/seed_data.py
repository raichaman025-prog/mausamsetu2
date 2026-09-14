"""
Seeds the SQLite database with a hyperlocal geography (130+ localities
across 6 Uttar Pradesh districts — cities, tehsils, blocks, and villages)
and realistic mock weather / flood / earthquake / heatwave / citizen-report
data so the demo UI is never empty. Re-running this script wipes and
recreates all tables.
"""
import json
import math
import random
from datetime import datetime, timedelta

from .database import Base, engine, SessionLocal
from . import models
from .auth import hash_password
from .geography import generate_locations
from .hazard_bias import compute_flood_bias, compute_earthquake_bias, compute_heatwave_bias, risk_level_from_score
from .verification import compute_verification

random.seed(42)

CONDITIONS = ["Clear", "Partly Cloudy", "Cloudy", "Light Rain", "Heavy Rain", "Thunderstorm", "Hazy"]


def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    now = datetime.utcnow()

    # ---- Locations (hyperlocal hierarchy: city > tehsil > block > village) ----
    raw_locations = generate_locations()
    loc_objs = {}
    for raw in raw_locations:
        data = {k: v for k, v in raw.items() if not k.startswith("_")}
        obj = models.Location(**data)
        db.add(obj)
        db.flush()
        loc_objs[raw["slug"]] = obj
    db.commit()

    # Resolve parent_id now that every location has a primary key
    for raw in raw_locations:
        parent_slug = raw.get("_parent_slug")
        if parent_slug and parent_slug in loc_objs:
            loc_objs[raw["slug"]].parent_id = loc_objs[parent_slug].id
    db.commit()

    print(f"Seeded {len(loc_objs)} localities across {len({r['district'] for r in raw_locations})} districts.")

    # ---- Weather: current observation + hourly forecast + 5yr monthly history ----
    for loc in loc_objs.values():
        flood_bias = compute_flood_bias(loc)
        base_temp = 32 + random.uniform(-2, 2)

        db.add(models.WeatherObservation(
            location_id=loc.id, timestamp=now,
            temperature=round(base_temp, 1),
            feels_like=round(base_temp + random.uniform(1, 4), 1),
            humidity=round(55 + flood_bias * 30 + random.uniform(-5, 5), 1),
            rainfall=round(max(0, random.gauss(8, 6) + flood_bias * 10), 1),
            wind_speed=round(random.uniform(8, 20), 1),
            wind_direction=random.choice(["NW", "SW", "NE", "SE", "N", "S", "E", "W"]),
            pressure=round(random.uniform(1002, 1012), 1),
            visibility=round(random.uniform(3, 9), 1),
            condition=random.choice(CONDITIONS),
        ))

        for hour in [10, 13, 16, 19, 22]:
            ft = now.replace(hour=hour % 24, minute=0, second=0, microsecond=0)
            db.add(models.WeatherForecast(
                location_id=loc.id, forecast_time=ft,
                temperature=round(base_temp + math.sin(hour / 24 * math.pi * 2) * 4, 1),
                rain_probability=round(min(95, max(5, 30 + flood_bias * 60 + random.uniform(-10, 10))), 0),
                condition=random.choice(CONDITIONS),
            ))

        for years_back in range(5, -1, -1):
            year = now.year - years_back
            for month in range(1, 13):
                if year == now.year and month > now.month:
                    continue
                seasonal_rain = 220 if month in (7, 8) else (90 if month in (6, 9) else 15)
                seasonal_temp = 44 if month in (5, 6) else (18 if month in (12, 1) else 32)
                monsoon_noise = random.uniform(0.7, 1.4)
                sample_date = datetime(year, month, 15)
                db.add(models.WeatherObservation(
                    location_id=loc.id, timestamp=sample_date,
                    temperature=round(seasonal_temp + random.uniform(-3, 3), 1),
                    feels_like=round(seasonal_temp + random.uniform(0, 5), 1),
                    humidity=round(45 + (seasonal_rain / 220) * 40 + random.uniform(-5, 5), 1),
                    rainfall=round(max(0, seasonal_rain * monsoon_noise * (0.7 + flood_bias)), 1),
                    wind_speed=round(random.uniform(6, 22), 1),
                    wind_direction=random.choice(["NW", "SW", "NE", "SE"]),
                    pressure=round(random.uniform(1000, 1014), 1),
                    visibility=round(random.uniform(2, 10), 1),
                    condition=random.choice(CONDITIONS),
                ))
    db.commit()
    print("Seeded weather observations + forecasts.")

    # ---- Flood events + river levels ----
    flood_pattern = [
        (2019, "Moderate", 6), (2021, "Severe", 9), (2023, "Moderate", 5),
        (2024, "Severe", 11), (2025, "Low", 3),
    ]
    for loc in loc_objs.values():
        bias = compute_flood_bias(loc)
        for year, severity, base_duration in flood_pattern:
            if bias < 0.3 and severity == "Low" and random.random() < 0.5:
                continue
            start = datetime(year, random.choice([7, 8]), random.randint(3, 22))
            duration = max(1, int(base_duration * (0.6 + bias)))
            end = start + timedelta(days=duration)
            rainfall = round(120 + bias * 180 + random.uniform(-20, 40), 1)
            water_level = round(102 + bias * 4 + random.uniform(-0.5, 1.2), 2)
            flow_speed = round(12 + bias * 20 + (rainfall / 300) * 15 + random.uniform(-2, 3), 1)
            db.add(models.FloodEvent(
                location_id=loc.id, start_date=start, end_date=end, severity=severity,
                rainfall_mm=rainfall, water_level_m=water_level,
                water_flow_speed_kmph=max(3.0, flow_speed), duration_days=duration,
                affected_area_sqkm=round(1.2 + bias * 6 + random.uniform(0, 2), 1),
                affected_population=int(loc.population * (0.03 + bias * 0.15)),
                description=(
                    f"{severity} flooding in {loc.name} following intense monsoon rainfall; "
                    f"low-lying pockets and drainage-adjacent streets were worst affected."
                ),
            ))

        current_level = round((102.5 - 1.5) + bias * 3.2 + random.uniform(-0.3, 0.3), 2)
        db.add(models.RiverLevel(
            location_id=loc.id, river_name="Gomti" if loc.district == "Lucknow" else "Ghaghara/Local Tributary",
            timestamp=now, level_m=current_level, danger_level_m=104.0, warning_level_m=102.5,
        ))
    db.commit()
    print("Seeded flood events + river levels.")

    # ---- Earthquake events ----
    mmi_scale = ["II", "III", "IV", "V", "VI"]
    for loc in loc_objs.values():
        bias = compute_earthquake_bias(loc)
        for year in [2019, 2021, 2022, 2024, 2025]:
            if random.random() < 0.35:
                continue
            magnitude = round(2.8 + bias * 2.2 + random.uniform(-0.3, 0.5), 1)
            depth = round(random.uniform(8, 40), 1)
            db.add(models.EarthquakeEvent(
                location_id=loc.id,
                date=datetime(year, random.randint(1, 12), random.randint(1, 28)),
                magnitude=magnitude, depth_km=depth,
                epicenter_distance_km=round(random.uniform(15, 180), 1),
                intensity_mmi=mmi_scale[min(len(mmi_scale) - 1, max(0, int(magnitude - 2)))],
                affected_population=int(loc.population * bias * 0.02),
                description=f"Minor tremor felt in {loc.name}, magnitude {magnitude}; no major structural damage reported.",
            ))
    db.commit()
    print("Seeded earthquake events.")

    # ---- Heatwave events ----
    for loc in loc_objs.values():
        bias = compute_heatwave_bias(loc)
        for year in range(now.year - 5, now.year + 1):
            start = datetime(year, random.choice([5, 6]), random.randint(1, 20))
            duration = max(2, int(3 + bias * 9 + random.uniform(-1, 2)))
            end = start + timedelta(days=duration)
            max_temp = round(42 + bias * 6 + random.uniform(-1, 2), 1)
            db.add(models.HeatwaveEvent(
                location_id=loc.id, start_date=start, end_date=end, max_temperature=max_temp,
                heat_index=round(max_temp + bias * 5 + random.uniform(0, 3), 1), duration_days=duration,
                affected_population=int(loc.population * (0.05 + bias * 0.1)),
                description=(
                    f"Heatwave conditions in {loc.name} with peak temperature {max_temp}°C; "
                    f"IMD advisory issued for outdoor workers and vulnerable groups."
                ),
            ))
    db.commit()
    print("Seeded heatwave events.")

    # ---- Multi-hazard risk predictions ----
    for loc in loc_objs.values():
        for hazard_type, bias, weights, names in [
            ("flood", compute_flood_bias(loc),
             [0.28, 0.22, 0.18, 0.20, 0.12],
             ["forecast_rainfall", "river_water_level", "soil_moisture", "historical_flood_risk", "drainage_risk"]),
            ("earthquake", compute_earthquake_bias(loc),
             [0.28, 0.20, 0.22, 0.15, 0.15],
             ["seismic_zone_intensity", "soil_liquefaction_risk", "building_vulnerability", "fault_line_proximity", "historical_seismicity"]),
            ("heatwave", compute_heatwave_bias(loc),
             [0.30, 0.22, 0.18, 0.15, 0.15],
             ["forecast_max_temperature", "heat_index_load", "urban_heat_island", "green_cover_deficit", "vulnerable_population_exposure"]),
        ]:
            base_offsets = [40, 30, 35, 30, 25] if hazard_type != "flood" else [40, 35, 45, 50, 38]
            factor_values = [round(min(100, base_offsets[i] + bias * 55 + random.uniform(-5, 5)), 0) for i in range(5)]
            score = round(sum(w * v / 100 for w, v in zip(weights, factor_values)), 2)
            db.add(models.RiskPrediction(
                location_id=loc.id, hazard_type=hazard_type, timestamp=now,
                risk_score=score, risk_level=risk_level_from_score(score),
                confidence=round(random.uniform(0.75, 0.94), 2),
                model_version="mausamsetu-riskv1-mock",
                factors_json=json.dumps(dict(zip(names, factor_values))),
            ))
    db.commit()
    print("Seeded multi-hazard risk predictions.")

    # ---- Alerts (spread across a few districts/localities for variety) ----
    def slug_or_none(s):
        return loc_objs[s].id if s in loc_objs else None

    alert_defs = [
        dict(slug="gomti-nagar", severity="Red", title="Heavy rainfall expected",
             description="80–100 mm rainfall expected over the next 6 hours due to an active monsoon trough.",
             recommended_action="Avoid low-lying underpasses. Move vehicles to higher ground. Keep emergency contacts ready.",
             hours_valid=6),
        dict(slug="aliganj", severity="Yellow", title="Waterlogging probability increased",
             description="Localized waterlogging likely in low-lying colonies after sustained moderate rain.",
             recommended_action="Avoid non-essential travel through known waterlogging points during peak rain hours.",
             hours_valid=12),
        dict(slug="indira-nagar", severity="Orange", title="River level approaching warning mark",
             description="Gomti river level is rising and is within 0.6 m of the warning mark near this ward.",
             recommended_action="Residents in low-lying ghats and adjoining streets should stay alert and prepare to relocate valuables.",
             hours_valid=18),
        dict(slug="malihabad-lucknow-tehsil", severity="Yellow", title="Heavy rain advisory for agricultural areas",
             description="Sustained rainfall may affect standing crops and unpaved rural access roads.",
             recommended_action="Secure stored produce and avoid low-water crossings on rural roads.",
             hours_valid=24),
        dict(slug="hazratganj", severity="Orange", title="Heatwave warning — peak temperatures expected",
             description="Maximum temperatures likely to reach 45°C+ in dense market areas due to the urban heat-island effect.",
             recommended_action="Avoid outdoor activity between 12–4 PM, stay hydrated, and check on elderly neighbours.",
             hours_valid=48),
    ]
    for a in alert_defs:
        loc_id = slug_or_none(a["slug"])
        if not loc_id:
            continue
        db.add(models.Alert(
            location_id=loc_id, severity=a["severity"], title=a["title"], description=a["description"],
            recommended_action=a["recommended_action"], valid_from=now,
            valid_until=now + timedelta(hours=a["hours_valid"]), active=True,
        ))
    db.commit()
    print("Seeded alerts.")

    # ---- Data sources ----
    sources = [
        dict(name="IMD Weather API (mock adapter)", category="weather", records_ingested=12450),
        dict(name="Rainfall Gauge Network", category="rainfall", records_ingested=8760),
        dict(name="Central Water Commission — River Data", category="river", records_ingested=4320),
        dict(name="Citizen Reporting Feed", category="citizen", records_ingested=124),
        dict(name="Satellite Soil Moisture (mock adapter)", category="satellite", records_ingested=2190),
    ]
    for s in sources:
        db.add(models.DataSource(
            name=s["name"], category=s["category"], status="ONLINE",
            last_sync=now - timedelta(minutes=random.randint(1, 8)),
            records_ingested=s["records_ingested"], data_quality_pct=round(random.uniform(95, 99.5), 1),
        ))
    db.commit()

    # ---- Demo users ----
    demo_user = models.User(name="Demo Citizen", email="demo@citizen.in",
                             password_hash=hash_password("password123"), role="citizen")
    admin_user = models.User(name="District Admin", email="admin@mausamsetu.gov.in",
                              password_hash=hash_password("admin123"), role="admin")
    db.add_all([demo_user, admin_user])
    db.commit()

    db.add_all([
        models.SavedLocation(user_id=demo_user.id, location_id=loc_objs["gomti-nagar"].id, label="Home"),
        models.SavedLocation(user_id=demo_user.id, location_id=loc_objs.get(
            "malihabad-lucknow-tehsil", loc_objs["gomti-nagar"]).id, label="Farm"),
        models.SavedLocation(user_id=demo_user.id, location_id=loc_objs["hazratganj"].id, label="Work"),
    ])
    db.commit()

    # ---- Seeded citizen reports, run through the verification engine ----
    report_types = ["Flood", "Waterlogging", "Heavy Rain", "Road Damage", "Drainage Blockage", "Other"]
    statuses = ["Pending", "Under Review", "Verified", "Resolved"]
    all_locs = list(loc_objs.values())
    for i in range(45):
        loc = random.choice(all_locs)
        rtype = random.choice(report_types)
        ts = now - timedelta(hours=random.randint(1, 400))
        report = models.CitizenReport(
            report_code=f"MS-2026-{1000 + i:05d}",
            user_id=demo_user.id if i % 8 == 0 else None,
            location_id=loc.id, type=rtype,
            description=f"{rtype} reported near {loc.name} main road; residents flagged the issue during recent weather.",
            image_url=("https://picsum.photos/seed/report" + str(i) + "/400/300") if i % 3 == 0 else None,
            reporter_name="Demo Citizen" if i % 8 == 0 else f"Local Resident {i}",
            timestamp=ts, severity=random.choice(["Low", "Moderate", "High"]),
            status=random.choice(statuses),
        )
        db.add(report)
        db.flush()

        result = compute_verification(
            db, location=loc, report_type=rtype, description=report.description,
            image_url=report.image_url, reporter_user_id=report.user_id, report_timestamp=ts,
        )
        report.verification_score = result["total_score"]
        report.verification_label = result["label"]
        report.verification_factors_json = json.dumps(result)
    db.commit()
    print("Seeded 45 citizen reports with AI-assisted verification scores.")

    db.close()
    print("✅ MausamSetu database seeded successfully.")


if __name__ == "__main__":
    seed()
