import { Fragment, useEffect, useState } from "react";
import {
  FileText, AlertTriangle, MapPinned, Database, ChevronDown, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge } from "@/components/StatusBadge";
import { MapView } from "@/components/MapView";
import { VerificationBadge, VerificationBreakdown } from "@/components/VerificationDisplay";
import * as api from "@/lib/api";
import type { AdminSummaryT, CitizenReportT, LocationT } from "@/lib/types";
import { formatDate, formatTime, statusBadgeClasses } from "@/lib/utils";

const STATUSES = ["Pending", "Under Review", "Verified", "Resolved"];

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AdminSummaryT | null>(null);
  const [reports, setReports] = useState<CitizenReportT[]>([]);
  const [locations, setLocations] = useState<LocationT[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  async function refresh() {
    const [s, r, locs] = await Promise.all([
      api.fetchAdminSummary(),
      api.fetchAdminReports(statusFilter || undefined),
      api.fetchLocations(),
    ]);
    setSummary(s); setReports(r); setLocations(locs);
  }

  useEffect(() => { refresh(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStatusChange(id: number, status: string) {
    setUpdatingId(id);
    const updated = await api.updateReportStatus(id, status);
    setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
    setUpdatingId(null);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">District Admin Dashboard</h1>
        <p className="text-sm text-slate-500">Government-facing overview of citizen reports, active alerts, and risk hotspots.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={FileText} label="Total Citizen Reports" value={summary?.total_reports ?? "—"} tint="bg-blue-50 text-blue-600" />
        <SummaryCard icon={AlertTriangle} label="Active Alerts" value={summary?.active_alerts ?? "—"} tint="bg-red-50 text-red-600" />
        <SummaryCard icon={MapPinned} label="High Risk Locations" value={summary?.high_risk_locations ?? "—"} tint="bg-orange-50 text-orange-600" />
        <SummaryCard icon={Database} label="Data Sources Online" value={summary?.data_sources_online ?? "—"} tint="bg-green-50 text-green-600" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <MapView locations={locations} activeLayers={{ flood: true, alerts: true }} heightClass="h-[420px]" />
        <Card>
          <CardHeader><CardTitle>Report Status Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {STATUSES.map((s) => {
              const count = reports.filter((r) => r.status === s).length;
              const total = reports.length || 1;
              return (
                <div key={s}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-600">{s}</span>
                    <span className="font-semibold text-slate-900">{count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Citizen Reports</CardTitle>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3"></th>
                <th className="px-5 py-3">Report ID</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">AI Trust Score</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <Fragment key={r.id}>
                  <tr
                    className="cursor-pointer border-b border-slate-50 hover:bg-slate-50/60"
                    onClick={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                  >
                    <td className="px-3 py-3 text-slate-300">
                      {r.verification && (expandedId === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs font-medium text-slate-700">{r.report_code}</td>
                    <td className="px-5 py-3 text-slate-700">{r.type}</td>
                    <td className="px-5 py-3 text-slate-700">{r.location_name}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">{formatDate(r.timestamp)} {formatTime(r.timestamp)}</td>
                    <td className="px-5 py-3"><SeverityBadge severity={r.severity} /></td>
                    <td className="px-5 py-3">
                      <VerificationBadge score={r.verification_score} label={r.verification_label} />
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <select
                          value={r.status}
                          disabled={updatingId === r.id}
                          onChange={(e) => handleStatusChange(r.id, e.target.value)}
                          className={`appearance-none rounded-full border px-3 py-1 pr-6 text-xs font-medium focus:outline-none ${statusBadgeClasses(r.status)}`}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-current opacity-60" />
                      </div>
                    </td>
                  </tr>
                  {expandedId === r.id && r.verification && (
                    <tr className="border-b border-slate-50 bg-slate-50/40">
                      <td colSpan={8} className="px-5 py-4">
                        <VerificationBreakdown result={r.verification} defaultOpen />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {reports.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">No reports match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tint }: { icon: any; label: string; value: number | string; tint: string }) {
  return (
    <Card className="p-4">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
    </Card>
  );
}
