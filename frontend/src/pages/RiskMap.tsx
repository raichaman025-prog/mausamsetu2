import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Waves, Activity, Sun } from "lucide-react";
import { MapView } from "@/components/MapView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { RiskDot } from "@/components/StatusBadge";
import * as api from "@/lib/api";
import { HAZARD_RISK_PROFILES, riskLevelFromScore } from "@/lib/mockData";
import type { LocationT, HazardType } from "@/lib/types";
import { riskColor } from "@/lib/utils";

const HAZARD_TABS: { value: HazardType; label: string; icon: any }[] = [
  { value: "flood", label: "Flood", icon: Waves },
  { value: "earthquake", label: "Earthquake", icon: Activity },
  { value: "heatwave", label: "Heatwave", icon: Sun },
];

export default function RiskMap() {
  const [locations, setLocations] = useState<LocationT[]>([]);
  const [selected, setSelected] = useState<LocationT | null>(null);
  const [hazardType, setHazardType] = useState<HazardType>("flood");
  const [district, setDistrict] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    api.fetchLocations().then(setLocations);
  }, []);

  const districts = useMemo(() => Array.from(new Set(locations.map((l) => l.district))).sort(), [locations]);
  const filtered = useMemo(
    () => (district ? locations.filter((l) => l.district === district) : locations),
    [locations, district]
  );

  const riskProfile = HAZARD_RISK_PROFILES[hazardType];
  const levelCounts = { LOW: 0, MODERATE: 0, HIGH: 0, SEVERE: 0 } as Record<string, number>;
  filtered.forEach((l) => {
    const level = riskLevelFromScore(riskProfile[l.slug] ?? 0.3);
    levelCounts[level] += 1;
  });

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Multi-Hazard Risk Map</h1>
          <p className="text-sm text-slate-500">Heatmap of hyperlocal risk across {filtered.length} localities — cities, tehsils, blocks &amp; villages.</p>
        </div>
        <Tabs
          options={HAZARD_TABS.map((h) => ({ value: h.value, label: h.label }))}
          value={hazardType}
          onChange={(v) => setHazardType(v as HazardType)}
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All districts</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <MapView
          locations={filtered}
          activeLayers={{ flood: true, alerts: false }}
          focusLocationId={selected?.id}
          onSelectLocation={setSelected}
          heightClass="h-[560px]"
          hazardType={hazardType}
        />

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Risk Distribution</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(["SEVERE", "HIGH", "MODERATE", "LOW"] as const).map((lvl) => (
                <div key={lvl} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600"><RiskDot level={lvl} /> {lvl}</span>
                  <span className="font-semibold text-slate-900">{levelCounts[lvl]} localities</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {selected ? (
            <Card>
              <CardHeader>
                <CardTitle>{selected.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex items-center gap-2">
                  <RiskDot level={riskLevelFromScore(riskProfile[selected.slug] ?? 0.3)} />
                  <span className="text-sm font-medium" style={{ color: riskColor(riskLevelFromScore(riskProfile[selected.slug] ?? 0.3)) }}>
                    {riskLevelFromScore(riskProfile[selected.slug] ?? 0.3)} {hazardType} risk
                  </span>
                </div>
                <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">
                  {selected.locality_type} · {selected.tehsil ? `${selected.tehsil} tehsil · ` : ""}{selected.district} district
                </p>
                <p className="mb-4 text-sm text-slate-500">
                  Population {selected.population.toLocaleString("en-IN")} · Elevation {selected.elevation_m}m
                </p>
                <button
                  onClick={() => navigate(`/location/${selected.slug}`)}
                  className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Open Full Dashboard
                </button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5 text-sm text-slate-500">
                Click a marker on the map to see a quick summary for that locality.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
