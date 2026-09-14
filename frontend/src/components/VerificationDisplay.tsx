import { ShieldCheck, ShieldAlert, ShieldQuestion, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { VerificationResultT } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABEL_STYLES: Record<string, { classes: string; icon: any }> = {
  "Likely True": { classes: "bg-green-100 text-green-700 border-green-200", icon: ShieldCheck },
  "Needs Review": { classes: "bg-amber-100 text-amber-700 border-amber-200", icon: ShieldQuestion },
  "Likely False": { classes: "bg-red-100 text-red-700 border-red-200", icon: ShieldAlert },
};

export function VerificationBadge({ score, label, className }: { score: number; label: string; className?: string }) {
  const style = LABEL_STYLES[label] || LABEL_STYLES["Needs Review"];
  const Icon = style.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", style.classes, className)}>
      <Icon className="h-3.5 w-3.5" />
      {Math.round(score)}/100 · {label}
    </span>
  );
}

export function VerificationBreakdown({ result, defaultOpen = false }: { result: VerificationResultT; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <VerificationBadge score={result.total_score} label={result.label} />
          <span className="text-sm text-slate-500">AI Verification — {result.factors.length} factors checked</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="space-y-3">
            {result.factors.map((f) => (
              <div key={f.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{f.name}</span>
                  <span className="font-semibold text-slate-900">{f.points} / {f.max_points} pts</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(f.points / f.max_points) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">{f.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">{result.disclaimer}</div>
        </div>
      )}
    </div>
  );
}
