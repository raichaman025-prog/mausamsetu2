import { cn } from "@/lib/utils";

export function Progress({
  value, className, barClassName, color,
}: { value: number; className?: string; barClassName?: string; color?: string }) {
  return (
    <div className={cn("h-2 w-full rounded-full bg-slate-100 overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}
