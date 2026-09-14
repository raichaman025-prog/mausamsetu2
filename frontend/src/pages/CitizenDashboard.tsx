import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home as HomeIcon, Briefcase, Wheat, MapPin, Plus, Trash2, FilePlus2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RiskDot } from "@/components/StatusBadge";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { RISK_PROFILE, riskLevelFromScore } from "@/lib/mockData";
import type { SavedLocationT, WeatherCurrentT, AlertT } from "@/lib/types";
import { riskColor } from "@/lib/utils";

const LABEL_ICON: Record<string, any> = { Home: HomeIcon, Work: Briefcase, Farm: Wheat };

export default function CitizenDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<SavedLocationT[]>([]);
  const [weatherByLoc, setWeatherByLoc] = useState<Record<number, WeatherCurrentT>>({});
  const [alertsByLoc, setAlertsByLoc] = useState<Record<number, AlertT[]>>({});
  const [prefs, setPrefs] = useState({ weather: true, flood: true, heavyRain: true });

  useEffect(() => {
    if (!user) { navigate("/citizen/login"); return; }
    api.fetchSavedLocations().then(async (locs) => {
      setSaved(locs);
      const weatherEntries = await Promise.all(locs.map((s) => api.fetchCurrentWeather(s.location.id)));
      const alertEntries = await Promise.all(locs.map((s) => api.fetchAlerts(s.location.id)));
      setWeatherByLoc(Object.fromEntries(locs.map((s, i) => [s.location.id, weatherEntries[i]])));
      setAlertsByLoc(Object.fromEntries(locs.map((s, i) => [s.location.id, alertEntries[i]])));
    });
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {user.name.split(" ")[0]}</h1>
          <p className="text-sm text-slate-500">Your saved locations, personalized weather, and flood risk.</p>
        </div>
        <Link to="/citizen/report">
          <Button><FilePlus2 className="h-4 w-4" /> Report Local Condition</Button>
        </Link>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">My Locations</h2>
          <button className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            <Plus className="h-4 w-4" /> Add location
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((s) => {
            const Icon = LABEL_ICON[s.label] || MapPin;
            const weather = weatherByLoc[s.location.id];
            const bias = RISK_PROFILE[s.location.slug] ?? 0.3;
            const level = riskLevelFromScore(bias);
            const locAlerts = alertsByLoc[s.location.id] || [];

            return (
              <Card key={s.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</div>
                        <Link to={`/location/${s.location.slug}`} className="text-sm font-bold text-slate-900 hover:text-brand-700">
                          {s.location.name}
                        </Link>
                      </div>
                    </div>
                    <button className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>

                  {weather && (
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-3xl font-extrabold text-slate-900">{weather.temperature}°C</span>
                      <span className="text-xs text-slate-500">{weather.condition}</span>
                    </div>
                  )}

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Rain Probability</span>
                      <span className="font-semibold text-slate-800">{Math.round((weather?.rainfall ?? 0) * 3.5)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Flood Risk</span>
                      <span className="flex items-center gap-1.5 font-semibold" style={{ color: riskColor(level) }}>
                        <RiskDot level={level} /> {level}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Active Alerts</span>
                      <span className="font-semibold text-slate-800">{locAlerts.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <PrefRow label="Weather Alerts" description="General daily weather advisories" checked={prefs.weather} onChange={(v) => setPrefs((p) => ({ ...p, weather: v }))} />
          <PrefRow label="Flood Alerts" description="High and severe flood risk notifications" checked={prefs.flood} onChange={(v) => setPrefs((p) => ({ ...p, flood: v }))} />
          <PrefRow label="Heavy Rain Alerts" description="Rainfall exceeding 50mm in 6 hours" checked={prefs.heavyRain} onChange={(v) => setPrefs((p) => ({ ...p, heavyRain: v }))} />
        </CardContent>
      </Card>
    </div>
  );
}

function PrefRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}
