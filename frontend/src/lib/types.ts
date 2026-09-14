export interface LocationT {
  id: number;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  district: string;
  state: string;
  tehsil?: string | null;
  block?: string | null;
  locality_type: string;
  population: number;
  elevation_m: number;
}

export interface WeatherCurrentT {
  location_id: number;
  timestamp: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  rainfall: number;
  wind_speed: number;
  wind_direction: string;
  pressure: number;
  visibility: number;
  condition: string;
}

export interface ForecastPointT {
  forecast_time: string;
  temperature: number;
  rain_probability: number;
  condition: string;
}

export interface WeatherHistoryPointT {
  period: string;
  avg_temperature: number;
  rainfall_mm: number;
  humidity: number;
  extreme_events: number;
}

export interface FloodEventT {
  id: number;
  start_date: string;
  end_date: string | null;
  severity: "Low" | "Moderate" | "High" | "Severe" | string;
  rainfall_mm: number;
  water_level_m: number;
  water_flow_speed_kmph: number;
  duration_days: number;
  affected_area_sqkm: number;
  affected_population: number;
  description: string;
}

export interface FloodPropagationResultT {
  source_name: string;
  target_name: string;
  distance_km: number;
  water_speed_kmph: number;
  eta_hours: number;
  estimated_arrival_time: string;
  disclaimer: string;
}

export interface FloodPropagationRowT {
  target_location_id: number;
  target_name: string;
  distance_km: number;
  eta_hours: number;
  estimated_arrival_time: string;
}

export interface EarthquakeEventT {
  id: number;
  date: string;
  magnitude: number;
  depth_km: number;
  epicenter_distance_km: number;
  intensity_mmi: string;
  affected_population: number;
  description: string;
}

export interface EarthquakeHistorySummaryT {
  events: EarthquakeEventT[];
  strongest_recorded_magnitude: number;
  avg_depth_km: number;
  events_last_decade: number;
}

export interface EarthquakeRiskFactorsT {
  seismic_zone_intensity: number;
  soil_liquefaction_risk: number;
  building_vulnerability: number;
  fault_line_proximity: number;
  historical_seismicity: number;
}

export interface EarthquakeRiskT {
  location_id: number;
  hazard_type: "earthquake";
  risk_score: number;
  risk_level: string;
  confidence: number;
  model_version: string;
  factors: EarthquakeRiskFactorsT;
  disclaimer: string;
}

export interface HeatwaveEventT {
  id: number;
  start_date: string;
  end_date: string | null;
  max_temperature: number;
  heat_index: number;
  duration_days: number;
  affected_population: number;
  description: string;
}

export interface HeatwaveHistorySummaryT {
  events: HeatwaveEventT[];
  hottest_recorded_temperature: number;
  avg_duration_days: number;
  events_last_decade: number;
}

export interface HeatwaveRiskFactorsT {
  forecast_max_temperature: number;
  heat_index_load: number;
  urban_heat_island: number;
  green_cover_deficit: number;
  vulnerable_population_exposure: number;
}

export interface HeatwaveRiskT {
  location_id: number;
  hazard_type: "heatwave";
  risk_score: number;
  risk_level: string;
  confidence: number;
  model_version: string;
  factors: HeatwaveRiskFactorsT;
  disclaimer: string;
}

export type HazardType = "flood" | "earthquake" | "heatwave";

export interface FloodHistorySummaryT {
  events: FloodEventT[];
  flood_frequency_per_decade: number;
  avg_rainfall_before_flood: number;
  highest_recorded_risk: number;
}

export interface RiskFactorsT {
  forecast_rainfall: number;
  river_water_level: number;
  soil_moisture: number;
  historical_flood_risk: number;
  drainage_risk: number;
}

export interface RiskPredictResponseT {
  location_id: number;
  risk_score: number;
  risk_level: "LOW" | "MODERATE" | "HIGH" | "SEVERE" | string;
  confidence: number;
  model_version: string;
  factors: RiskFactorsT;
  disclaimer: string;
}

export interface AlertT {
  id: number;
  location_id: number;
  location_name?: string;
  severity: "Yellow" | "Orange" | "Red" | string;
  title: string;
  description: string;
  recommended_action: string;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
}

export interface UserT {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface SavedLocationT {
  id: number;
  label: string;
  location: LocationT;
  notify_weather: boolean;
  notify_flood: boolean;
  notify_heavy_rain: boolean;
}

export interface VerificationFactorT {
  name: string;
  points: number;
  max_points: number;
  description: string;
}

export interface VerificationResultT {
  factors: VerificationFactorT[];
  total_score: number;
  max_score: number;
  label: "Likely True" | "Needs Review" | "Likely False" | string;
  disclaimer: string;
}

export interface CitizenReportT {
  id: number;
  report_code: string;
  location_id: number;
  location_name?: string;
  type: string;
  description: string;
  image_url: string | null;
  reporter_name: string;
  timestamp: string;
  severity: string;
  status: "Pending" | "Under Review" | "Verified" | "Resolved" | string;
  verification_score: number;
  verification_label: string;
  verification?: VerificationResultT;
}

export interface DataSourceT {
  id: number;
  name: string;
  category: string;
  status: string;
  last_sync: string;
  records_ingested: number;
  data_quality_pct: number;
}

export interface AdminSummaryT {
  total_reports: number;
  active_alerts: number;
  high_risk_locations: number;
  data_sources_online: number;
}
