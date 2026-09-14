from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class LocationOut(BaseModel):
    id: int
    name: str
    slug: str
    latitude: float
    longitude: float
    district: str
    state: str
    tehsil: Optional[str] = None
    block: Optional[str] = None
    locality_type: str
    population: int
    elevation_m: float

    class Config:
        from_attributes = True


class WeatherCurrentOut(BaseModel):
    location_id: int
    timestamp: datetime
    temperature: float
    feels_like: float
    humidity: float
    rainfall: float
    wind_speed: float
    wind_direction: str
    pressure: float
    visibility: float
    condition: str

    class Config:
        from_attributes = True


class ForecastPointOut(BaseModel):
    forecast_time: datetime
    temperature: float
    rain_probability: float
    condition: str

    class Config:
        from_attributes = True


class WeatherHistoryPointOut(BaseModel):
    period: str
    avg_temperature: float
    rainfall_mm: float
    humidity: float
    extreme_events: int


class FloodEventOut(BaseModel):
    id: int
    start_date: datetime
    end_date: Optional[datetime]
    severity: str
    rainfall_mm: float
    water_level_m: float
    water_flow_speed_kmph: float
    duration_days: int
    affected_area_sqkm: float
    affected_population: int
    description: str

    class Config:
        from_attributes = True


class FloodHistorySummaryOut(BaseModel):
    events: List[FloodEventOut]
    flood_frequency_per_decade: float
    avg_rainfall_before_flood: float
    highest_recorded_risk: float


class RiskFactors(BaseModel):
    forecast_rainfall: float
    river_water_level: float
    soil_moisture: float
    historical_flood_risk: float
    drainage_risk: float


class EarthquakeRiskFactors(BaseModel):
    seismic_zone_intensity: float
    soil_liquefaction_risk: float
    building_vulnerability: float
    fault_line_proximity: float
    historical_seismicity: float


class HeatwaveRiskFactors(BaseModel):
    forecast_max_temperature: float
    heat_index_load: float
    urban_heat_island: float
    green_cover_deficit: float
    vulnerable_population_exposure: float


class EarthquakeEventOut(BaseModel):
    id: int
    date: datetime
    magnitude: float
    depth_km: float
    epicenter_distance_km: float
    intensity_mmi: str
    affected_population: int
    description: str

    class Config:
        from_attributes = True


class EarthquakeRiskOut(BaseModel):
    location_id: int
    hazard_type: str = "earthquake"
    risk_score: float
    risk_level: str
    confidence: float
    model_version: str
    factors: EarthquakeRiskFactors
    disclaimer: str = (
        "Seismic risk score is an analytical estimate for demonstration and "
        "should not replace official government warnings or a certified "
        "structural seismic assessment."
    )


class EarthquakeHistorySummaryOut(BaseModel):
    events: List[EarthquakeEventOut]
    strongest_recorded_magnitude: float
    avg_depth_km: float
    events_last_decade: int


class HeatwaveEventOut(BaseModel):
    id: int
    start_date: datetime
    end_date: Optional[datetime]
    max_temperature: float
    heat_index: float
    duration_days: int
    affected_population: int
    description: str

    class Config:
        from_attributes = True


class HeatwaveRiskOut(BaseModel):
    location_id: int
    hazard_type: str = "heatwave"
    risk_score: float
    risk_level: str
    confidence: float
    model_version: str
    factors: HeatwaveRiskFactors
    disclaimer: str = (
        "Heatwave risk score is an analytical estimate for demonstration and "
        "should not replace official IMD heat advisories."
    )


class HeatwaveHistorySummaryOut(BaseModel):
    events: List[HeatwaveEventOut]
    hottest_recorded_temperature: float
    avg_duration_days: float
    events_last_decade: int


class FloodPropagationRequest(BaseModel):
    source_location_id: int
    target_location_id: int
    water_speed_kmph: float = 25.0


class FloodPropagationResult(BaseModel):
    source_name: str
    target_name: str
    distance_km: float
    water_speed_kmph: float
    eta_hours: float
    estimated_arrival_time: datetime
    disclaimer: str = (
        "Estimated using straight-line distance between localities and the "
        "given flow speed — a simplified demonstration model. Real flood "
        "wave routing depends on river channel geometry, terrain, and "
        "drainage infrastructure."
    )


class FloodPropagationTableRow(BaseModel):
    target_location_id: int
    target_name: str
    distance_km: float
    eta_hours: float
    estimated_arrival_time: datetime


class RiskPredictRequest(BaseModel):
    location_id: int
    rainfall: Optional[float] = None
    river_level: Optional[float] = None
    soil_moisture: Optional[float] = None
    temperature: Optional[float] = None
    historical_flood_count: Optional[int] = None


class RiskPredictResponse(BaseModel):
    location_id: int
    risk_score: float
    risk_level: str
    confidence: float
    model_version: str
    factors: RiskFactors
    disclaimer: str = (
        "Risk score is an analytical estimate for demonstration and should "
        "not replace official government warnings."
    )


class AlertOut(BaseModel):
    id: int
    location_id: int
    location_name: Optional[str] = None
    severity: str
    title: str
    description: str
    recommended_action: str
    valid_from: datetime
    valid_until: Optional[datetime]
    active: bool

    class Config:
        from_attributes = True


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True


TokenResponse.model_rebuild()


class SavedLocationOut(BaseModel):
    id: int
    label: str
    location: LocationOut
    notify_weather: bool
    notify_flood: bool
    notify_heavy_rain: bool

    class Config:
        from_attributes = True


class SavedLocationCreate(BaseModel):
    location_id: int
    label: str = "Home"


class VerificationFactorOut(BaseModel):
    name: str
    points: float
    max_points: float
    description: str


class VerificationResultOut(BaseModel):
    factors: List[VerificationFactorOut]
    total_score: float
    max_score: float = 100
    label: str
    disclaimer: str = (
        "This is an AI-assisted trust score for human moderators — it never "
        "auto-verifies or auto-rejects a report. A district official always "
        "makes the final call from the Admin Dashboard."
    )


class CitizenReportCreate(BaseModel):
    location_id: int
    type: str
    description: str
    image_url: Optional[str] = None
    reporter_name: Optional[str] = "Anonymous Citizen"
    severity: Optional[str] = "Moderate"


class CitizenReportOut(BaseModel):
    id: int
    report_code: str
    location_id: int
    location_name: Optional[str] = None
    type: str
    description: str
    image_url: Optional[str]
    reporter_name: str
    timestamp: datetime
    severity: str
    status: str
    verification_score: float = 0
    verification_label: str = "Needs Review"
    verification: Optional[VerificationResultOut] = None

    class Config:
        from_attributes = True


class ReportStatusUpdate(BaseModel):
    status: str


class DataSourceOut(BaseModel):
    id: int
    name: str
    category: str
    status: str
    last_sync: datetime
    records_ingested: int
    data_quality_pct: float

    class Config:
        from_attributes = True


class AdminSummaryOut(BaseModel):
    total_reports: int
    active_alerts: int
    high_risk_locations: int
    data_sources_online: int
