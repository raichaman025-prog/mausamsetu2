import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Thermometer, Droplets, CloudRain, Wind, Gauge, Eye, MapPin, ChevronLeft,
  Navigation, AlertCircle, Waves, Activity, Sun,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, AreaChart, Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/StatusBadge";
import { HazardRiskCard } from "@/components/HazardRiskCard";
import { FloodPropagationCalculator } from "@/components/FloodPropagationCalculator";
import { conditionIcon } from "@/components/WeatherCard";
import * as api from "@/lib/api";
import type {
  LocationT, WeatherCurrentT, ForecastPointT, WeatherHistoryPointT,
  FloodHistorySummaryT, RiskPredictResponseT, AlertT,
  EarthquakeHistorySummaryT, EarthquakeRiskT, HeatwaveHistorySummaryT, HeatwaveRiskT,
  HazardType,
} from "@/lib/types";
import { formatDate, formatTime, riskColor } from "@/lib/utils";

const HISTORY_RANGES = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "6m", label: "6 Months" },
  { value: "1y", label: "1 Year" },
  { value: "5y", label: "5 Years" },
];

const METRICS = [
  { value: "avg_temperature", label: "Temperature", unit: "°C", color: "#f97316" },
  { value: "rainfall_mm", label: "Rainfall", unit: "mm", color: "#3a99f2" },
  { value: "humidity", label: "Humidity", unit: "%", color: "#06b6d4" },
];

const HAZARD_TABS: { value: HazardType; label: string; icon: any }[] = [
  { value: "flood", label: "Flood", icon: Waves },
  { value: "earthquake", label: "Earthquake", icon: Activity },
  { value: "heatwave", label: "Heatwave", icon: Sun },
];

export default function LocationDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [location, setLocation] = useState<LocationT | null>(null);
  const [allLocations, setAllLocations] = useState<LocationT[]>([]);
  const [current, setCurrent] = useState<WeatherCurrentT | null>(null);
  const [forecast, setForecast] = useState<ForecastPointT[]>([]);
  const [history, setHistory] = useState<WeatherHistoryPointT[]>([]);
  const [floodHistory, setFloodHistory] = useState<FloodHistorySummaryT | null>(null);
  const [floodRisk, setFloodRisk] = useState<RiskPredictResponseT | null>(null);
  const [earthquakeHistory, setEarthquakeHistory] = useState<EarthquakeHistorySummaryT | null>(null);
  const [earthquakeRisk, setEarthquakeRisk] = useState<EarthquakeRiskT | null>(null);
  const [heatwaveHistory, setHeatwaveHistory] = useState<HeatwaveHistorySummaryT | null>(null);
  const [heatwaveRisk, setHeatwaveRisk] = useState<HeatwaveRiskT | null>(null);
  const [alerts, setAlerts] = useState<AlertT[]>([]);
  const [range, setRange] = useState("5y");
  const [metric, setMetric] = useState("avg_temperature");
  const [hazardTab, setHazardTab] = useState<HazardType>("flood");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const loc = await api.fetchLocationBySlug(slug);
      if (!loc || cancelled) return;
      setLocation(loc);
      const [cur, fc, hist, fh, fr, eqh, eqr, hwh, hwr, al, locs] = await Promise.all([
        api.fetchCurrentWeather(loc.id),
        api.fetchForecast(loc.id),
        api.fetchWeatherHistory(loc.id, range),
        api.fetchFloodHistory(loc.id),
        api.fetchFloodRisk(loc.id),
        api.fetchEarthquakeHistory(loc.id),
        api.fetchEarthquakeRisk(loc.id),
        api.fetchHeatwaveHistory(loc.id),
        api.fetchHeatwaveRisk(loc.id),
        api.fetchAlerts(loc.id),
        api.fetchLocations(),
      ]);
      if (cancelled) return;
      setCurrent(cur); setForecast(fc); setHistory(hist);
      setFloodHistory(fh); setFloodRisk(fr);
      setEarthquakeHistory(eqh); setEarthquakeRisk(eqr);
      setHeatwaveHistory(hwh); setHeatwaveRisk(hwr);
      setAlerts(al); setAllLocations(locs);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!location) return;
    api.fetchWeatherHistory(location.id, range).then(setHistory);
  }, [range, location]);

  if (loading || !location || !current || !floodRisk || !floodHistory || !earthquakeHistory || !earthquakeRisk || !heatwaveHistory || !heatwaveRisk) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-16 text-center text-slate-400">
        Loading location intelligence…
      </div>
    );
  }

  const ConditionIcon = conditionIcon(current.condition);
  const metricDef = METRICS.find((m) => m.value === metric)!;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ChevronLeft className="h-4 w-4" /> Back to map
      </Link>

      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <MapPin className="h-4 w-4" /> {location.district}, {location.state}
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{location.name}</h1>
          <div className="mt-1 text-xs text-slate-400">
            {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E · Elevation {location.elevation_m}m ·
            Population {location.population.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/alerts"><Button variant="outline" size="sm"><AlertCircle className="h-4 w-4" />Alerts ({alerts.length})</Button></Link>
          <Link to="/risk-map"><Button variant="outline" size="sm"><Navigation className="h-4 w-4" />Risk Map</Button></Link>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.slice(0, 2).map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <SeverityBadge severity={a.severity} />
              <div className="text-sm font-medium text-red-800">{a.title}</div>
              <div className="ml-auto text-xs text-red-500">Valid until {a.valid_until ? formatTime(a.valid_until) : "further notice"}</div>
            </div>
          ))}
        </div>
      )}

      {/* Current weather */}
      <Card className="mb-6 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <ConditionIcon className="h-11 w-11" />
              </div>
              <div>
                <div className="text-5xl font-extrabold text-slate-900">{current.temperature}°C</div>
                <div className="mt-1 text-sm font-medium text-slate-500">
                  Feels like {current.feels_like}°C · {current.condition}
                </div>
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:w-auto md:grid-cols-3">
              <MiniStat icon={Droplets} label="Humidity" value={`${current.humidity}%`} />
              <MiniStat icon={CloudRain} label="Rainfall" value={`${current.rainfall} mm`} />
              <MiniStat icon={Wind} label="Wind" value={`${current.wind_speed} km/h ${current.wind_direction}`} />
              <MiniStat icon={Gauge} label="Pressure" value={`${current.pressure} hPa`} />
              <MiniStat icon={Eye} label="Visibility" value={`${current.visibility} km`} />
              <MiniStat icon={Thermometer} label="Feels Like" value={`${current.feels_like}°C`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hourly forecast */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Hourly Forecast</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {forecast.map((f) => {
              const Icon = conditionIcon(f.condition);
              return (
                <div key={f.forecast_time} className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50 px-3 py-4">
                  <div className="text-xs font-medium text-slate-500">{formatTime(f.forecast_time)}</div>
                  <Icon className="my-2 h-7 w-7 text-brand-600" />
                  <div className="text-lg font-bold text-slate-900">{f.temperature}°C</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-blue-500">
                    <Droplets className="h-3 w-3" /> {f.rain_probability}%
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Weather history */}
      <Card className="mb-6">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Weather History</CardTitle>
            <CardDescription>Historical temperature, rainfall &amp; humidity trends</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs options={METRICS.map((m) => ({ value: m.value, label: m.label }))} value={metric} onChange={setMetric} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Tabs options={HISTORY_RANGES} value={range} onChange={setRange} />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {metric === "rainfall_mm" ? (
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" minTickGap={20} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" unit={metricDef.unit} />
                  <RTooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="rainfall_mm" name="Rainfall" fill={metricDef.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={metricDef.color} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={metricDef.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" minTickGap={20} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" unit={metricDef.unit} />
                  <RTooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }} />
                  <Area type="monotone" dataKey={metric} name={metricDef.label} stroke={metricDef.color} fill="url(#metricFill)" strokeWidth={2} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <span>Extreme events in range: <strong className="text-slate-800">{history.reduce((s, h) => s + h.extreme_events, 0)}</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Disaster Intelligence — multi-hazard tabs */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-slate-900">Disaster Intelligence</h2>
        <Tabs
          options={HAZARD_TABS.map((h) => ({ value: h.value, label: h.label }))}
          value={hazardTab}
          onChange={(v) => setHazardTab(v as HazardType)}
        />
      </div>

      {hazardTab === "flood" && (
        <>
          <Card className="mb-6 border-slate-200">
            <HazardRiskCard
              title="Flood Intelligence"
              description="AI-based estimated risk score"
              score={floodRisk.risk_score}
              level={floodRisk.risk_level}
              factors={[
                { label: "Forecast Rainfall", value: floodRisk.factors.forecast_rainfall },
                { label: "River Water Level", value: floodRisk.factors.river_water_level },
                { label: "Soil Moisture", value: floodRisk.factors.soil_moisture },
                { label: "Historical Flood Risk", value: floodRisk.factors.historical_flood_risk },
                { label: "Drainage Risk", value: floodRisk.factors.drainage_risk },
              ]}
              disclaimer={floodRisk.disclaimer}
            />
          </Card>

          <Card className="mb-6">
            <FloodPropagationCalculator sourceLocation={location} allLocations={allLocations} />
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Flood History</CardTitle>
              <CardDescription>Recorded flood events for {location.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryTile label="Flood Frequency" value={`${floodHistory.flood_frequency_per_decade}`} unit="events / decade" />
                <SummaryTile label="Avg. Rainfall Before Flood" value={`${floodHistory.avg_rainfall_before_flood}`} unit="mm" />
                <SummaryTile label="Highest Recorded Risk" value={`${floodHistory.highest_recorded_risk}%`} unit="" />
              </div>

              <div className="space-y-4">
                {floodHistory.events.map((ev, idx) => (
                  <div key={ev.id} className="relative flex gap-4 pl-2">
                    <div className="flex flex-col items-center">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: riskColor(ev.severity === "Severe" ? "SEVERE" : ev.severity === "High" ? "HIGH" : ev.severity === "Moderate" ? "MODERATE" : "LOW") }} />
                      {idx < floodHistory.events.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{formatDate(ev.start_date)}</span>
                        <SeverityBadge severity={ev.severity} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{ev.description}</p>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        <span>Rainfall: <strong className="text-slate-700">{ev.rainfall_mm} mm</strong></span>
                        <span>River level: <strong className="text-slate-700">{ev.water_level_m} m</strong></span>
                        <span>Water speed: <strong className="text-slate-700">{ev.water_flow_speed_kmph} km/h</strong></span>
                        <span>Duration: <strong className="text-slate-700">{ev.duration_days} days</strong></span>
                        <span>Affected area: <strong className="text-slate-700">{ev.affected_area_sqkm} km²</strong></span>
                        <span>Affected population: <strong className="text-slate-700">{ev.affected_population.toLocaleString("en-IN")}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {hazardTab === "earthquake" && (
        <>
          <Card className="mb-6 border-slate-200">
            <HazardRiskCard
              title="Earthquake Intelligence"
              description="AI-based estimated seismic risk score"
              score={earthquakeRisk.risk_score}
              level={earthquakeRisk.risk_level}
              factors={[
                { label: "Seismic Zone Intensity", value: earthquakeRisk.factors.seismic_zone_intensity },
                { label: "Soil Liquefaction Risk", value: earthquakeRisk.factors.soil_liquefaction_risk },
                { label: "Building Vulnerability", value: earthquakeRisk.factors.building_vulnerability },
                { label: "Fault Line Proximity", value: earthquakeRisk.factors.fault_line_proximity },
                { label: "Historical Seismicity", value: earthquakeRisk.factors.historical_seismicity },
              ]}
              disclaimer={earthquakeRisk.disclaimer}
            />
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Earthquake History</CardTitle>
              <CardDescription>Recorded seismic events for {location.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryTile label="Strongest Recorded Magnitude" value={`${earthquakeHistory.strongest_recorded_magnitude}`} unit="M" />
                <SummaryTile label="Avg. Depth" value={`${earthquakeHistory.avg_depth_km}`} unit="km" />
                <SummaryTile label="Events (last decade)" value={`${earthquakeHistory.events_last_decade}`} unit="" />
              </div>

              {earthquakeHistory.events.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">No felt seismic events recorded for this locality.</div>
              ) : (
                <div className="space-y-4">
                  {earthquakeHistory.events.map((ev, idx) => (
                    <div key={ev.id} className="relative flex gap-4 pl-2">
                      <div className="flex flex-col items-center">
                        <span className="h-3 w-3 rounded-full bg-amber-500" />
                        {idx < earthquakeHistory.events.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{formatDate(ev.date)}</span>
                          <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            M {ev.magnitude} · MMI {ev.intensity_mmi}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{ev.description}</p>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                          <span>Depth: <strong className="text-slate-700">{ev.depth_km} km</strong></span>
                          <span>Epicenter distance: <strong className="text-slate-700">{ev.epicenter_distance_km} km</strong></span>
                          <span>Affected population: <strong className="text-slate-700">{ev.affected_population.toLocaleString("en-IN")}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {hazardTab === "heatwave" && (
        <>
          <Card className="mb-6 border-slate-200">
            <HazardRiskCard
              title="Heatwave Intelligence"
              description="AI-based estimated heatwave risk score"
              score={heatwaveRisk.risk_score}
              level={heatwaveRisk.risk_level}
              factors={[
                { label: "Forecast Max Temperature", value: heatwaveRisk.factors.forecast_max_temperature },
                { label: "Heat Index Load", value: heatwaveRisk.factors.heat_index_load },
                { label: "Urban Heat Island", value: heatwaveRisk.factors.urban_heat_island },
                { label: "Green Cover Deficit", value: heatwaveRisk.factors.green_cover_deficit },
                { label: "Vulnerable Population Exposure", value: heatwaveRisk.factors.vulnerable_population_exposure },
              ]}
              disclaimer={heatwaveRisk.disclaimer}
            />
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Heatwave History</CardTitle>
              <CardDescription>Recorded heatwave events for {location.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryTile label="Hottest Recorded Temperature" value={`${heatwaveHistory.hottest_recorded_temperature}`} unit="°C" />
                <SummaryTile label="Avg. Duration" value={`${heatwaveHistory.avg_duration_days}`} unit="days" />
                <SummaryTile label="Events (last decade)" value={`${heatwaveHistory.events_last_decade}`} unit="" />
              </div>

              <div className="space-y-4">
                {heatwaveHistory.events.map((ev, idx) => (
                  <div key={ev.id} className="relative flex gap-4 pl-2">
                    <div className="flex flex-col items-center">
                      <span className="h-3 w-3 rounded-full bg-red-500" />
                      {idx < heatwaveHistory.events.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{formatDate(ev.start_date)}</span>
                        <span className="rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          Peak {ev.max_temperature}°C
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{ev.description}</p>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        <span>Heat index: <strong className="text-slate-700">{ev.heat_index}°C</strong></span>
                        <span>Duration: <strong className="text-slate-700">{ev.duration_days} days</strong></span>
                        <span>Affected population: <strong className="text-slate-700">{ev.affected_population.toLocaleString("en-IN")}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
        <div className="text-sm font-semibold text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900">
        {value} <span className="text-sm font-medium text-slate-400">{unit}</span>
      </div>
    </div>
  );
}
