import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { LocationT, HazardType } from "@/lib/types";
import { HAZARD_RISK_PROFILES, riskLevelFromScore } from "@/lib/mockData";
import { riskColor } from "@/lib/utils";

const LUCKNOW_CENTER: [number, number] = [26.8600, 80.9400];

function FlyToMarker({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 13, { duration: 0.8 });
  }, [target, map]);
  return null;
}

export function MapView({
  locations,
  activeLayers,
  focusLocationId,
  onSelectLocation,
  heightClass = "h-full",
  hazardType = "flood",
}: {
  locations: LocationT[];
  activeLayers: { flood: boolean; alerts: boolean };
  focusLocationId?: number | null;
  onSelectLocation?: (loc: LocationT) => void;
  heightClass?: string;
  hazardType?: HazardType;
}) {
  const navigate = useNavigate();
  const focusLoc = locations.find((l) => l.id === focusLocationId);
  const focusTarget: [number, number] | null = focusLoc ? [focusLoc.latitude, focusLoc.longitude] : null;
  const riskProfile = HAZARD_RISK_PROFILES[hazardType];

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-slate-200 shadow-panel ${heightClass}`}>
      <MapContainer center={LUCKNOW_CENTER} zoom={11} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToMarker target={focusTarget} />
        {locations.map((loc) => {
          const bias = riskProfile[loc.slug] ?? 0.3;
          const level = riskLevelFromScore(bias);
          const color = riskColor(level);
          return (
            <CircleMarker
              key={loc.id}
              center={[loc.latitude, loc.longitude]}
              radius={activeLayers.flood ? 14 + bias * 10 : 11}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: activeLayers.flood ? 0.45 : 0.85,
                weight: 2,
              }}
              eventHandlers={{
                click: () => {
                  if (onSelectLocation) onSelectLocation(loc);
                  else navigate(`/location/${loc.slug}`);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <div className="text-xs font-semibold">{loc.name}</div>
                <div className="text-[11px] text-slate-500">{level} {hazardType} risk</div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-panel backdrop-blur">
        <div className="mb-1 font-semibold capitalize text-slate-700">{hazardType} Risk</div>
        <div className="flex items-center gap-3">
          <LegendDot color={riskColor("LOW")} label="Low" />
          <LegendDot color={riskColor("MODERATE")} label="Moderate" />
          <LegendDot color={riskColor("HIGH")} label="High" />
          <LegendDot color={riskColor("SEVERE")} label="Severe" />
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}
