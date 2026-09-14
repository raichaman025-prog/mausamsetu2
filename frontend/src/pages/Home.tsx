import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Thermometer, CloudRain, Droplets, Wind, AlertTriangle, MapPin, Waves, Activity, Sun } from "lucide-react";
import { MapView } from "@/components/MapView";
import { StatCard } from "@/components/WeatherCard";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { RiskDot } from "@/components/StatusBadge";
import * as api from "@/lib/api";
import { HAZARD_RISK_PROFILES, riskLevelFromScore } from "@/lib/mockData";
import type { LocationT, HazardType } from "@/lib/types";
import { riskColor } from "@/lib/utils";

const LAYER_DEFS = [
  { key: "temperature", label: "Temperature" },
  { key: "rainfall", label: "Rainfall" },
  { key: "floodRisk", label: "Flood Risk" },
  { key: "riverLevel", label: "River Level" },
  { key: "alerts", label: "Weather Alerts" },
] as const;

const HAZARD_TABS: { value: HazardType; label: string; icon: any }[] = [
  { value: "flood", label: "Flood", icon: Waves },
  { value: "earthquake", label: "Earthquake", icon: Activity },
  { value: "heatwave", label: "Heatwave", icon: Sun },
];

export default function Home() {
  const [locations, setLocations] = useState<LocationT[]>([]);
  const [layers, setLayers] = useState({
    temperature: true, rainfall: true, floodRisk: true, riverLevel: false, alerts: false,
  });
  const [hazardType, setHazardType] = useState<HazardType>("flood");
  const [district, setDistrict] = useState<string>("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get("q") || "";

  useEffect(() => {
    api.fetchLocations().then(setLocations);
  }, []);

  const districts = useMemo(() => Array.from(new Set(locations.map((l) => l.district))).sort(), [locations]);

  const filtered = useMemo(() => {
    let result = locations;
    if (district) result = result.filter((l) => l.district === district);
    if (q) result = result.filter((l) => l.name.toLowerCase().includes(q.toLowerCase()));
    return result;
  }, [locations, q, district]);

  const riskProfile = HAZARD_RISK_PROFILES[hazardType];
  const avgTemp = 32.4, avgRain = 14.2, avgHumidity = 64, avgWind = 13.5;
  const highRiskCount = locations.filter((l) => (riskProfile[l.slug] ?? 0) >= 0.6).length;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Uttar Pradesh — Hyperlocal Disaster Intelligence</h1>
          <p className="text-sm text-slate-500">
            {locations.length}+ localities across {districts.length || 6} districts — cities, tehsils, blocks &amp; villages. Click any marker for its full dashboard.
            {q && <span className="ml-1 font-medium text-brand-700">Showing results for "{q}"</span>}
          </p>
        </div>
        <Tabs
          options={HAZARD_TABS.map((h) => ({ value: h.value, label: h.label }))}
          value={hazardType}
          onChange={(v) => setHazardType(v as HazardType)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        {/* Layer control sidebar */}
        <div className="order-2 lg:order-1">
          <Card className="p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">Map Layers</div>
            <div className="space-y-2.5">
              {LAYER_DEFS.map((l) => (
                <label key={l.key} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={layers[l.key]}
                    onChange={(e) => setLayers((prev) => ({ ...prev, [l.key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  {l.label}
                </label>
              ))}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">Localities</div>
                <span className="text-xs text-slate-400">{filtered.length} shown</span>
              </div>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="mb-2 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All districts</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="max-h-[380px] space-y-1 overflow-y-auto pr-1">
                {filtered.map((loc) => {
                  const bias = riskProfile[loc.slug] ?? 0.3;
                  const level = riskLevelFromScore(bias);
                  return (
                    <button
                      key={loc.id}
                      onClick={() => navigate(`/location/${loc.slug}`)}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-slate-700">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="min-w-0">
                          <span className="block truncate">{loc.name}</span>
                          <span className="block truncate text-[10px] uppercase tracking-wide text-slate-400">{loc.locality_type} · {loc.district}</span>
                        </span>
                      </span>
                      <span className="ml-2 flex shrink-0 items-center gap-1.5">
                        <RiskDot level={level} />
                        <span className="text-xs font-medium" style={{ color: riskColor(level) }}>{level}</span>
                      </span>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="py-4 text-center text-xs text-slate-400">No localities match your search.</div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Map */}
        <div className="order-1 lg:order-2">
          <MapView
            locations={filtered}
            activeLayers={{ flood: layers.floodRisk, alerts: layers.alerts }}
            heightClass="h-[520px]"
            hazardType={hazardType}
          />
        </div>
      </div>

      {/* Bottom summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Thermometer} label="Avg. Temperature" value={avgTemp} unit="°C" tint="bg-orange-50 text-orange-600" />
        <StatCard icon={CloudRain} label="Avg. Rainfall (24h)" value={avgRain} unit="mm" tint="bg-blue-50 text-blue-600" />
        <StatCard icon={Droplets} label="Avg. Humidity" value={avgHumidity} unit="%" tint="bg-cyan-50 text-cyan-600" />
        <StatCard icon={Wind} label="Avg. Wind Speed" value={avgWind} unit="km/h" tint="bg-slate-100 text-slate-600" />
        <StatCard icon={AlertTriangle} label={`High ${hazardType[0].toUpperCase()}${hazardType.slice(1)} Risk Areas`} value={highRiskCount} unit="localities" tint="bg-red-50 text-red-600" />
      </div>

      <Card className="mt-6">
        <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-800">Demo tip</div>
            <p className="text-sm text-slate-500">
              Start the guided demo by clicking <span className="font-medium text-slate-700">Gomti Nagar</span> on the map —
              it has the highest flood risk in this dataset (72%, HIGH).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
