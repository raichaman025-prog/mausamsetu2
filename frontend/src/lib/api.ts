/**
 * API client.
 *
 * Every function first tries the real FastAPI backend (via the `/api`
 * proxy configured in vite.config.ts). If the backend is unreachable
 * (e.g. you're only running the frontend for a quick UI demo), it
 * transparently falls back to the deterministic mock data in
 * `mockData.ts` so the app is never empty and never breaks a demo.
 *
 * When you wire up real weather/flood/river APIs on the backend, no
 * frontend changes are needed — this file's function signatures and
 * return shapes stay identical.
 */
import type {
  LocationT, WeatherCurrentT, ForecastPointT, WeatherHistoryPointT,
  FloodHistorySummaryT, RiskPredictResponseT, AlertT, UserT,
  SavedLocationT, CitizenReportT, DataSourceT, AdminSummaryT,
  EarthquakeHistorySummaryT, EarthquakeRiskT, HeatwaveHistorySummaryT, HeatwaveRiskT,
  FloodPropagationResultT, FloodPropagationRowT,
} from "./types";
import * as mock from "./mockData";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;
let backendAvailable: boolean | null = null;

async function tryFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("mausamsetu_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  backendAvailable = true;
  return res.json();
}

export function isUsingLiveBackend() {
  return backendAvailable === true;
}

// ---------- Locations ----------
export async function fetchLocations(q?: string): Promise<LocationT[]> {
  try {
    return await tryFetch<LocationT[]>(`/locations${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  } catch {
    backendAvailable = false;
    return q
      ? mock.LOCATIONS.filter((l) => l.name.toLowerCase().includes(q.toLowerCase()))
      : mock.LOCATIONS;
  }
}

export async function fetchLocationBySlug(slug: string): Promise<LocationT | undefined> {
  try {
    return await tryFetch<LocationT>(`/locations/by-slug/${slug}`);
  } catch {
    backendAvailable = false;
    return mock.getLocationBySlug(slug);
  }
}

// ---------- Weather ----------
export async function fetchCurrentWeather(locationId: number): Promise<WeatherCurrentT> {
  try {
    return await tryFetch<WeatherCurrentT>(`/weather/current/${locationId}`);
  } catch {
    backendAvailable = false;
    return mock.getCurrentWeather(locationId);
  }
}

export async function fetchForecast(locationId: number): Promise<ForecastPointT[]> {
  try {
    return await tryFetch<ForecastPointT[]>(`/weather/forecast/${locationId}`);
  } catch {
    backendAvailable = false;
    return mock.getForecast(locationId);
  }
}

export async function fetchWeatherHistory(locationId: number, range: string): Promise<WeatherHistoryPointT[]> {
  try {
    return await tryFetch<WeatherHistoryPointT[]>(`/weather/history/${locationId}?range=${range}`);
  } catch {
    backendAvailable = false;
    return mock.getWeatherHistory(locationId, range);
  }
}

// ---------- Flood ----------
export async function fetchFloodHistory(locationId: number): Promise<FloodHistorySummaryT> {
  try {
    return await tryFetch<FloodHistorySummaryT>(`/flood/history/${locationId}`);
  } catch {
    backendAvailable = false;
    return mock.getFloodHistory(locationId);
  }
}

export async function fetchFloodRisk(locationId: number): Promise<RiskPredictResponseT> {
  try {
    return await tryFetch<RiskPredictResponseT>(`/flood/risk/${locationId}`);
  } catch {
    backendAvailable = false;
    return mock.getFloodRisk(locationId);
  }
}

// ---------- Flood propagation (water-speed ETA calculator) ----------
export async function fetchFloodPropagation(
  sourceLocationId: number, targetLocationId: number, waterSpeedKmph: number
): Promise<FloodPropagationResultT> {
  try {
    return await tryFetch<FloodPropagationResultT>(`/flood/propagation`, {
      method: "POST",
      body: JSON.stringify({
        source_location_id: sourceLocationId,
        target_location_id: targetLocationId,
        water_speed_kmph: waterSpeedKmph,
      }),
    });
  } catch {
    backendAvailable = false;
    return mock.getFloodPropagation(sourceLocationId, targetLocationId, waterSpeedKmph);
  }
}

export async function fetchFloodPropagationTable(
  sourceLocationId: number, waterSpeedKmph: number
): Promise<FloodPropagationRowT[]> {
  try {
    return await tryFetch<FloodPropagationRowT[]>(
      `/flood/propagation/${sourceLocationId}?speed=${waterSpeedKmph}`
    );
  } catch {
    backendAvailable = false;
    return mock.getFloodPropagationTable(sourceLocationId, waterSpeedKmph);
  }
}

// ---------- Earthquake ----------
export async function fetchEarthquakeHistory(locationId: number): Promise<EarthquakeHistorySummaryT> {
  try {
    return await tryFetch<EarthquakeHistorySummaryT>(`/earthquake/history/${locationId}`);
  } catch {
    backendAvailable = false;
    return mock.getEarthquakeHistory(locationId);
  }
}

export async function fetchEarthquakeRisk(locationId: number): Promise<EarthquakeRiskT> {
  try {
    return await tryFetch<EarthquakeRiskT>(`/earthquake/risk/${locationId}`);
  } catch {
    backendAvailable = false;
    return mock.getEarthquakeRisk(locationId);
  }
}

// ---------- Heatwave ----------
export async function fetchHeatwaveHistory(locationId: number): Promise<HeatwaveHistorySummaryT> {
  try {
    return await tryFetch<HeatwaveHistorySummaryT>(`/heatwave/history/${locationId}`);
  } catch {
    backendAvailable = false;
    return mock.getHeatwaveHistory(locationId);
  }
}

export async function fetchHeatwaveRisk(locationId: number): Promise<HeatwaveRiskT> {
  try {
    return await tryFetch<HeatwaveRiskT>(`/heatwave/risk/${locationId}`);
  } catch {
    backendAvailable = false;
    return mock.getHeatwaveRisk(locationId);
  }
}

// ---------- Alerts ----------
export async function fetchAlerts(locationId?: number): Promise<AlertT[]> {
  try {
    return await tryFetch<AlertT[]>(`/alerts${locationId ? `?location_id=${locationId}` : ""}`);
  } catch {
    backendAvailable = false;
    return locationId ? mock.ALERTS.filter((a) => a.location_id === locationId) : mock.ALERTS;
  }
}

// ---------- Auth ----------
export async function login(email: string, password: string): Promise<{ access_token: string; user: UserT }> {
  try {
    const result = await tryFetch<{ access_token: string; user: UserT }>(`/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return result;
  } catch (e) {
    backendAvailable = false;
    if (email === "demo@citizen.in" && password === "password123") {
      return { access_token: "mock-demo-token", user: mock.DEMO_USER };
    }
    throw e instanceof Error ? e : new Error("Invalid email or password");
  }
}

// ---------- Citizen ----------
export async function fetchSavedLocations(): Promise<SavedLocationT[]> {
  try {
    return await tryFetch<SavedLocationT[]>(`/citizen/saved-locations`);
  } catch {
    backendAvailable = false;
    return [
      { id: 1, label: "Home", location: mock.getLocationBySlug("gomti-nagar")!, notify_weather: true, notify_flood: true, notify_heavy_rain: true },
      { id: 2, label: "Farm", location: mock.getLocationBySlug("malihabad-lucknow-tehsil")!, notify_weather: true, notify_flood: true, notify_heavy_rain: false },
      { id: 3, label: "Work", location: mock.getLocationBySlug("hazratganj")!, notify_weather: false, notify_flood: true, notify_heavy_rain: true },
    ];
  }
}

export async function submitCitizenReport(payload: {
  location_id: number; type: string; description: string; image_url?: string | null;
  reporter_name?: string; severity?: string;
}): Promise<CitizenReportT> {
  try {
    return await tryFetch<CitizenReportT>(`/citizen/report`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    backendAvailable = false;
    const loc = mock.getLocationById(payload.location_id);
    return mock.addMockReport({
      location_id: payload.location_id,
      location_name: loc?.name,
      type: payload.type,
      description: payload.description,
      image_url: payload.image_url ?? null,
      reporter_name: payload.reporter_name || "Anonymous Citizen",
      severity: payload.severity || "Moderate",
    });
  }
}

// ---------- Admin ----------
export async function fetchAdminSummary(): Promise<AdminSummaryT> {
  try {
    return await tryFetch<AdminSummaryT>(`/admin/summary`);
  } catch {
    backendAvailable = false;
    return mock.getAdminSummary();
  }
}

export async function fetchAdminReports(status?: string): Promise<CitizenReportT[]> {
  try {
    return await tryFetch<CitizenReportT[]>(`/admin/reports${status ? `?status=${status}` : ""}`);
  } catch {
    backendAvailable = false;
    return status ? mock.MOCK_REPORTS.filter((r) => r.status === status) : mock.MOCK_REPORTS;
  }
}

export async function updateReportStatus(reportId: number, status: string): Promise<CitizenReportT> {
  try {
    return await tryFetch<CitizenReportT>(`/admin/reports/${reportId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  } catch {
    backendAvailable = false;
    mock.updateMockReportStatus(reportId, status);
    return mock.MOCK_REPORTS.find((r) => r.id === reportId)!;
  }
}

// ---------- Data ingestion ----------
export async function fetchDataSources(): Promise<DataSourceT[]> {
  try {
    return await tryFetch<DataSourceT[]>(`/data/status`);
  } catch {
    backendAvailable = false;
    return mock.MOCK_DATA_SOURCES;
  }
}

export async function runDataSync(): Promise<DataSourceT[]> {
  try {
    return await tryFetch<DataSourceT[]>(`/data/sync`, { method: "POST" });
  } catch {
    backendAvailable = false;
    return mock.runMockDataSync();
  }
}

// ---------- Risk predict (interactive "what-if" demo) ----------
export async function predictRisk(payload: {
  location_id: number; rainfall?: number; river_level?: number;
  soil_moisture?: number; temperature?: number; historical_flood_count?: number;
}): Promise<RiskPredictResponseT> {
  try {
    return await tryFetch<RiskPredictResponseT>(`/risk/predict`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    backendAvailable = false;
    return mock.getFloodRisk(payload.location_id);
  }
}
