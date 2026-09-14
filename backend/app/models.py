"""
SQLAlchemy ORM models.

Geospatial note: `latitude`/`longitude` are plain floats for the SQLite
prototype. In PostgreSQL/PostGIS, replace with a single
`geom Geometry('POINT', 4326)` column (via GeoAlchemy2) and index it with
a GIST index for real spatial queries (nearest-locality, bounding-box,
polygon containment, etc).
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
)
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="citizen")  # citizen | admin
    created_at = Column(DateTime, default=datetime.utcnow)

    saved_locations = relationship("SavedLocation", back_populates="user")
    reports = relationship("CitizenReport", back_populates="user")


class Location(Base):
    """
    Hierarchical geography: State -> District -> Tehsil -> Block -> Village
    (with `city`/`ward` used for urban headquarters and city wards).
    `parent_id` links a locality to its immediate administrative parent so
    the hierarchy can be walked in either direction; `tehsil`/`block` are
    also denormalized directly onto every row for fast flat filtering.
    """
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    district = Column(String, default="Lucknow")
    state = Column(String, default="Uttar Pradesh")
    tehsil = Column(String, nullable=True)
    block = Column(String, nullable=True)
    locality_type = Column(String, default="village")  # city | tehsil | block | village | ward | town
    parent_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    population = Column(Integer, default=0)
    elevation_m = Column(Float, default=0)

    weather_observations = relationship("WeatherObservation", back_populates="location")
    forecasts = relationship("WeatherForecast", back_populates="location")
    flood_events = relationship("FloodEvent", back_populates="location")
    earthquake_events = relationship("EarthquakeEvent", back_populates="location")
    heatwave_events = relationship("HeatwaveEvent", back_populates="location")
    river_levels = relationship("RiverLevel", back_populates="location")
    risk_predictions = relationship("RiskPrediction", back_populates="location")
    alerts = relationship("Alert", back_populates="location")
    reports = relationship("CitizenReport", back_populates="location")


class WeatherObservation(Base):
    __tablename__ = "weather_observations"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    temperature = Column(Float)
    feels_like = Column(Float)
    humidity = Column(Float)
    rainfall = Column(Float)
    wind_speed = Column(Float)
    wind_direction = Column(String)
    pressure = Column(Float)
    visibility = Column(Float)
    condition = Column(String)

    location = relationship("Location", back_populates="weather_observations")


class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    forecast_time = Column(DateTime)
    temperature = Column(Float)
    rain_probability = Column(Float)
    condition = Column(String)

    location = relationship("Location", back_populates="forecasts")


class FloodEvent(Base):
    __tablename__ = "flood_events"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    severity = Column(String)  # Low | Moderate | High | Severe
    rainfall_mm = Column(Float)
    water_level_m = Column(Float)
    water_flow_speed_kmph = Column(Float, default=0)  # avg flood-wave propagation speed
    duration_days = Column(Integer)
    affected_area_sqkm = Column(Float)
    affected_population = Column(Integer)
    description = Column(Text)

    location = relationship("Location", back_populates="flood_events")


class EarthquakeEvent(Base):
    __tablename__ = "earthquake_events"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    date = Column(DateTime)
    magnitude = Column(Float)
    depth_km = Column(Float)
    epicenter_distance_km = Column(Float)
    intensity_mmi = Column(String)  # Modified Mercalli Intensity, e.g. "IV"
    affected_population = Column(Integer)
    description = Column(Text)

    location = relationship("Location", back_populates="earthquake_events")


class HeatwaveEvent(Base):
    __tablename__ = "heatwave_events"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    max_temperature = Column(Float)
    heat_index = Column(Float)
    duration_days = Column(Integer)
    affected_population = Column(Integer)
    description = Column(Text)

    location = relationship("Location", back_populates="heatwave_events")


class RiverLevel(Base):
    __tablename__ = "river_levels"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    river_name = Column(String, default="Gomti")
    timestamp = Column(DateTime, default=datetime.utcnow)
    level_m = Column(Float)
    danger_level_m = Column(Float)
    warning_level_m = Column(Float)

    location = relationship("Location", back_populates="river_levels")


class RiskPrediction(Base):
    """
    Multi-hazard risk predictions. `hazard_type` distinguishes flood /
    earthquake / heatwave rows so the same table + API shape serves all
    three hazards — `factors_json` holds a hazard-specific factor
    breakdown (5 named 0-100 sub-scores in each case).
    """
    __tablename__ = "risk_predictions"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    hazard_type = Column(String, default="flood")  # flood | earthquake | heatwave
    timestamp = Column(DateTime, default=datetime.utcnow)
    risk_score = Column(Float)
    risk_level = Column(String)
    confidence = Column(Float)
    model_version = Column(String, default="mausamsetu-riskv1-mock")
    factors_json = Column(Text)  # JSON-encoded factor breakdown

    location = relationship("Location", back_populates="risk_predictions")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    severity = Column(String)  # Yellow | Orange | Red
    title = Column(String)
    description = Column(Text)
    recommended_action = Column(Text)
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)
    active = Column(Boolean, default=True)

    location = relationship("Location", back_populates="alerts")


class CitizenReport(Base):
    __tablename__ = "citizen_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_code = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    type = Column(String)
    description = Column(Text)
    image_url = Column(String, nullable=True)
    reporter_name = Column(String, default="Anonymous Citizen")
    timestamp = Column(DateTime, default=datetime.utcnow)
    severity = Column(String, default="Moderate")
    status = Column(String, default="Pending")  # Pending|Under Review|Verified|Resolved

    # AI-assisted verification (computed once at submission time; advisory
    # only — see verification.py for the full disclaimer/rationale)
    verification_score = Column(Float, default=0)       # 0-100
    verification_label = Column(String, default="Needs Review")  # Likely True | Needs Review | Likely False
    verification_factors_json = Column(Text, nullable=True)      # JSON list of factor breakdowns

    user = relationship("User", back_populates="reports")
    location = relationship("Location", back_populates="reports")


class SavedLocation(Base):
    __tablename__ = "saved_locations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))
    label = Column(String, default="Home")  # Home | Work | Farm | Custom
    notify_weather = Column(Boolean, default=True)
    notify_flood = Column(Boolean, default=True)
    notify_heavy_rain = Column(Boolean, default=True)

    user = relationship("User", back_populates="saved_locations")
    location = relationship("Location")


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    category = Column(String)  # weather | rainfall | river | citizen | satellite
    status = Column(String, default="ONLINE")
    last_sync = Column(DateTime, default=datetime.utcnow)
    records_ingested = Column(Integer, default=0)
    data_quality_pct = Column(Float, default=98.0)
