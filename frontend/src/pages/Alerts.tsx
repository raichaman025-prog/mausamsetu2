import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, MapPin, Clock, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "@/components/StatusBadge";
import * as api from "@/lib/api";
import type { AlertT } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/utils";
import { getLocationById } from "@/lib/mockData";

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertT[]>([]);

  useEffect(() => {
    api.fetchAlerts().then(setAlerts);
  }, []);

  const severityOrder: Record<string, number> = { Red: 0, Orange: 1, Yellow: 2 };
  const sorted = [...alerts].sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-6 md:px-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Active Alerts</h1>
          <p className="text-sm text-slate-500">{sorted.length} active advisories across Lucknow district</p>
        </div>
      </div>

      <div className="space-y-4">
        {sorted.map((a) => (
          <Card key={a.id} className="overflow-hidden">
            <div className={`h-1.5 w-full ${a.severity === "Red" ? "bg-red-500" : a.severity === "Orange" ? "bg-orange-500" : "bg-yellow-400"}`} />
            <CardContent className="p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <SeverityBadge severity={`${a.severity.toUpperCase()} ALERT`} />
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" /> {formatDate(a.valid_from)}, {formatTime(a.valid_from)}
                  {a.valid_until && <> — {formatTime(a.valid_until)}</>}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{a.title}</h3>
              <Link to={`/location/${getLocationById(a.location_id)?.slug ?? a.location_id}`} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
                <MapPin className="h-3.5 w-3.5" /> {a.location_name}
              </Link>
              <p className="mt-3 text-sm text-slate-600">{a.description}</p>
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div><span className="font-semibold">Recommended action: </span>{a.recommended_action}</div>
              </div>
            </CardContent>
          </Card>
        ))}

        {sorted.length === 0 && (
          <Card><CardContent className="p-10 text-center text-slate-400">No active alerts right now.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
