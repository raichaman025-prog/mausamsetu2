import type { LucideIcon } from "lucide-react";
import { Sun, Cloud, CloudRain, CloudLightning, CloudDrizzle, CloudFog } from "lucide-react";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";

export function conditionIcon(condition: string): LucideIcon {
  const c = condition.toLowerCase();
  if (c.includes("thunder")) return CloudLightning;
  if (c.includes("heavy rain")) return CloudRain;
  if (c.includes("light rain") || c.includes("drizzle")) return CloudDrizzle;
  if (c.includes("cloud")) return Cloud;
  if (c.includes("haz") || c.includes("fog")) return CloudFog;
  return Sun;
}

export function StatCard({
  icon: Icon, label, value, unit, tint,
}: { icon: LucideIcon; label: string; value: string | number; unit?: string; tint?: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div
        className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tint || "bg-brand-50 text-brand-600")}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="truncate text-lg font-bold text-slate-900">
          {value}
          {unit && <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>}
        </div>
      </div>
    </Card>
  );
}
