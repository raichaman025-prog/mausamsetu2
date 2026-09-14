import { riskColor } from "@/lib/utils";

export function RiskGauge({ score, level, size = 180 }: { score: number; level: string; size?: number }) {
  const pct = Math.round(score * 100);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = riskColor(level);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth={14} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={14} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-extrabold text-slate-900">{pct}%</span>
        <span
          className="mt-1 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide text-white"
          style={{ backgroundColor: color }}
        >
          {level} RISK
        </span>
      </div>
    </div>
  );
}
