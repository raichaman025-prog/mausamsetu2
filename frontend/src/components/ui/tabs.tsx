import { cn } from "@/lib/utils";

export function Tabs({
  options, value, onChange, className,
}: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
            value === opt.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
