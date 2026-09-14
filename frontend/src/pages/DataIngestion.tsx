import { useEffect, useState } from "react";
import {
  CloudCog, ShieldCheck, SprayCan, Cpu, Database, BrainCircuit, LayoutDashboard,
  Radio, RefreshCw, CheckCircle2, ArrowDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as api from "@/lib/api";
import type { DataSourceT } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const PIPELINE_STAGES = [
  { label: "Weather / Rainfall / River APIs", icon: Radio },
  { label: "Data Ingestion", icon: CloudCog },
  { label: "Validation", icon: ShieldCheck },
  { label: "Cleaning", icon: SprayCan },
  { label: "Feature Engineering", icon: Cpu },
  { label: "Database", icon: Database },
  { label: "ML / Risk Engine", icon: BrainCircuit },
  { label: "Dashboard", icon: LayoutDashboard },
];

const CATEGORY_LABEL: Record<string, string> = {
  weather: "Weather Data", rainfall: "Rainfall Data", river: "River Data",
  citizen: "Citizen Data", satellite: "Satellite Data",
};

export default function DataIngestion() {
  const [sources, setSources] = useState<DataSourceT[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => { api.fetchDataSources().then(setSources); }, []);

  async function handleSync() {
    setSyncing(true);
    setJustSynced(false);
    const updated = await new Promise<DataSourceT[]>((resolve) => {
      setTimeout(() => api.runDataSync().then(resolve), 1200);
    });
    setSources(updated);
    setSyncing(false);
    setJustSynced(true);
    setTimeout(() => setJustSynced(false), 4000);
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Ingestion Dashboard</h1>
          <p className="text-sm text-slate-500">How external weather, rainfall, and river data flow into MausamSetu's risk engine.</p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Run Data Sync"}
        </Button>
      </div>

      {justSynced && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 className="h-4 w-4" /> Data successfully synchronized.
        </div>
      )}

      <Card className="mb-6">
        <CardHeader><CardTitle>Ingestion Pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-1">
            {PIPELINE_STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              return (
                <div key={stage.label} className="flex w-full flex-col items-center">
                  <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{stage.label}</span>
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && <ArrowDown className="my-1 h-4 w-4 text-slate-300" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Connected Data Sources</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {sources.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{CATEGORY_LABEL[s.category] || s.name}</span>
                  <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> {s.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400">{s.name}</div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{timeAgo(s.last_sync)}</div>
                    <div className="text-slate-400">Last Updated</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{s.records_ingested.toLocaleString("en-IN")}</div>
                    <div className="text-slate-400">Records</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{s.data_quality_pct}%</div>
                    <div className="text-slate-400">Data Quality</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
