import { AlertCircle } from "lucide-react";
import { CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Progress } from "./ui/progress";
import { RiskGauge } from "./RiskGauge";
import { riskColor } from "@/lib/utils";

export interface HazardFactor {
  label: string;
  value: number;
}

export function HazardRiskCard({
  title, description, score, level, factors, disclaimer,
}: {
  title: string;
  description: string;
  score: number;
  level: string;
  factors: HazardFactor[];
  disclaimer: string;
}) {
  return (
    <>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
          <div className="flex justify-center md:justify-start">
            <RiskGauge score={score} level={level} />
          </div>
          <div className="space-y-4">
            {factors.map((f) => {
              const color = f.value >= 70 ? riskColor("HIGH") : f.value >= 40 ? riskColor("MODERATE") : riskColor("LOW");
              return (
                <div key={f.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{f.label}</span>
                    <span className="font-semibold text-slate-900">{f.value}%</span>
                  </div>
                  <Progress value={f.value} color={color} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {disclaimer}
        </div>
      </CardContent>
    </>
  );
}
