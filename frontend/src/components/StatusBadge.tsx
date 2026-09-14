import { Badge } from "./ui/badge";
import { severityBadgeClasses, statusBadgeClasses } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function SeverityBadge({ severity, className }: { severity: string; className?: string }) {
  return (
    <Badge className={cn(severityBadgeClasses(severity), className)}>
      {severity}
    </Badge>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge className={cn(statusBadgeClasses(status), className)}>
      {status}
    </Badge>
  );
}

export function RiskDot({ level }: { level: string }) {
  const colorMap: Record<string, string> = {
    LOW: "bg-risk-low", MODERATE: "bg-risk-moderate", HIGH: "bg-risk-high", SEVERE: "bg-risk-severe",
  };
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", colorMap[level.toUpperCase()] || "bg-slate-400")} />;
}
