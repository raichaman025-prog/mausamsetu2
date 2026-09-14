import { useEffect, useState } from "react";
import { Waves, Gauge, Clock, ArrowRight, Info } from "lucide-react";
import { CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import * as api from "@/lib/api";
import type { LocationT, FloodPropagationRowT } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/utils";

export function FloodPropagationCalculator({
  sourceLocation, allLocations,
}: { sourceLocation: LocationT; allLocations: LocationT[] }) {
  const otherLocations = allLocations.filter((l) => l.id !== sourceLocation.id);
  const [targetId, setTargetId] = useState<number | "">(otherLocations[0]?.id ?? "");
  const [speed, setSpeed] = useState(25);
  const [result, setResult] = useState<{ distance_km: number; eta_hours: number; estimated_arrival_time: string } | null>(null);
  const [table, setTable] = useState<FloodPropagationRowT[]>([]);
  const [loading, setLoading] = useState(false);

  async function calculate() {
    if (!targetId) return;
    setLoading(true);
    const [single, all] = await Promise.all([
      api.fetchFloodPropagation(sourceLocation.id, Number(targetId), speed),
      api.fetchFloodPropagationTable(sourceLocation.id, speed),
    ]);
    setResult(single);
    setTable(all.slice(0, 12));
    setLoading(false);
  }

  useEffect(() => {
    calculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceLocation.id]);

  function formatEta(hours: number): string {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Flood Propagation Calculator</CardTitle>
        <CardDescription>
          Estimate how long floodwater originating in {sourceLocation.name} would take to reach a downstream locality, based on flow speed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Waves className="h-3.5 w-3.5 text-slate-400" /> Target Locality
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {Array.from(new Set(otherLocations.map((l) => l.district))).sort().map((dist) => (
                <optgroup key={dist} label={dist}>
                  {otherLocations.filter((l) => l.district === dist).map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.locality_type})</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Gauge className="h-3.5 w-3.5 text-slate-400" /> Water Speed (km/h)
            </label>
            <input
              type="number"
              min={1}
              max={80}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            onClick={calculate}
            disabled={loading || !targetId}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Calculating…" : "Calculate ETA"}
          </button>
        </div>

        {result && (
          <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 text-slate-800">
              <span className="font-semibold">{sourceLocation.name}</span>
              <ArrowRight className="h-4 w-4 text-brand-500" />
              <span className="font-semibold">{allLocations.find((l) => l.id === targetId)?.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <div className="text-xs text-slate-500">Distance</div>
                <div className="text-lg font-bold text-slate-900">{result.distance_km} km</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Estimated Time to Reach</div>
                <div className="flex items-center gap-1.5 text-lg font-bold text-brand-700">
                  <Clock className="h-4 w-4" /> {formatEta(result.eta_hours)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Estimated Arrival</div>
                <div className="text-lg font-bold text-slate-900">
                  {formatDate(result.estimated_arrival_time)}, {formatTime(result.estimated_arrival_time)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-2 text-sm font-semibold text-slate-700">Downstream Impact Timeline</div>
        <p className="mb-3 text-xs text-slate-500">
          Nearest 12 localities ranked by estimated arrival time from {sourceLocation.name} at {speed} km/h.
        </p>
        <div className="space-y-2">
          {table.map((row, idx) => (
            <div key={row.target_location_id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500 shadow-sm">
                {idx + 1}
              </span>
              <span className="min-w-[120px] font-medium text-slate-800">{row.target_name}</span>
              <span className="text-xs text-slate-400">{row.distance_km} km away</span>
              <span className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                <Clock className="h-3.5 w-3.5" /> {formatEta(row.eta_hours)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Estimated using straight-line distance and the given flow speed — a simplified demonstration model.
          Real flood-wave routing depends on river channel geometry, terrain, and drainage infrastructure.
        </div>
      </CardContent>
    </>
  );
}
