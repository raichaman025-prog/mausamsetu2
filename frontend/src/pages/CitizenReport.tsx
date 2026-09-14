import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Waves, Droplets, CloudRain, Construction, AlertOctagon, HelpCircle,
  Upload, CheckCircle2, MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VerificationBreakdown } from "@/components/VerificationDisplay";
import * as api from "@/lib/api";
import type { LocationT, CitizenReportT } from "@/lib/types";
import { cn } from "@/lib/utils";

const INCIDENT_TYPES = [
  { value: "Flood", icon: Waves },
  { value: "Waterlogging", icon: Droplets },
  { value: "Heavy Rain", icon: CloudRain },
  { value: "Road Damage", icon: Construction },
  { value: "Drainage Blockage", icon: AlertOctagon },
  { value: "Other", icon: HelpCircle },
];

export default function CitizenReport() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<LocationT[]>([]);
  const [district, setDistrict] = useState<string>("");
  const [type, setType] = useState("Waterlogging");
  const [locationId, setLocationId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dateTime, setDateTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CitizenReportT | null>(null);

  useEffect(() => {
    api.fetchLocations().then((locs) => {
      setLocations(locs);
      if (locs[0]) { setDistrict(locs[0].district); setLocationId(locs[0].id); }
    });
  }, []);

  const districts = useMemo(() => Array.from(new Set(locations.map((l) => l.district))).sort(), [locations]);
  const filteredLocations = useMemo(
    () => (district ? locations.filter((l) => l.district === district) : locations),
    [locations, district]
  );

  useEffect(() => {
    // If the current selection falls outside the newly chosen district, reset to the first match
    if (filteredLocations.length && !filteredLocations.some((l) => l.id === locationId)) {
      setLocationId(filteredLocations[0].id);
    }
  }, [filteredLocations, locationId]);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locationId) return;
    setSubmitting(true);
    try {
      const report = await api.submitCitizenReport({
        location_id: Number(locationId),
        type,
        description,
        image_url: imagePreview,
      });
      setResult(report);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Report submitted successfully.</h1>
        <p className="mt-2 text-sm text-slate-500">Your report has been logged and will be reviewed by district authorities.</p>
        <div className="mx-auto mt-5 inline-block rounded-xl border border-slate-200 bg-slate-50 px-6 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Report ID</div>
          <div className="text-lg font-bold text-brand-700">REPORT #{result.report_code}</div>
        </div>

        {result.verification && (
          <div className="mt-6 text-left">
            <VerificationBreakdown result={result.verification} defaultOpen />
          </div>
        )}

        <div className="mt-8 flex justify-center gap-3">
          <Button variant="outline" onClick={() => { setResult(null); setDescription(""); setImagePreview(null); }}>Submit Another</Button>
          <Button onClick={() => navigate("/citizen/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Report Local Condition</h1>
      <p className="mt-1 text-sm text-slate-500">Help your community by reporting flooding, waterlogging, or infrastructure issues in real time.</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
          <CardDescription>All fields marked required must be completed before submission.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Incident Type</label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {INCIDENT_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      type="button"
                      key={t.value}
                      onClick={() => setType(t.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
                        type === t.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {t.value}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">District</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Locality</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    required
                    value={locationId}
                    onChange={(e) => setLocationId(Number(e.target.value))}
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {["city", "ward", "tehsil", "block", "village"].map((type) => {
                      const group = filteredLocations.filter((l) => l.locality_type === type);
                      if (group.length === 0) return null;
                      return (
                        <optgroup key={type} label={type[0].toUpperCase() + type.slice(1) + "s"}>
                          {group.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you're observing — depth of water, affected roads, urgency…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Upload Image</label>
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="preview" className="h-40 w-full rounded-lg object-cover" />
                  <button type="button" onClick={() => setImagePreview(null)} className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">Remove</button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-8 text-sm text-slate-400 hover:bg-slate-50">
                  <Upload className="h-6 w-6" />
                  Click to upload a photo (optional)
                  <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                </label>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Date / Time</label>
              <Input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Report"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
