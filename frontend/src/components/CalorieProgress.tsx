import { useDaySummary } from "../hooks/useFood";
import GlassCard from "./ui/GlassCard";

interface CalorieProgressProps {
  date: string;
  calorieGoal: number;
}

export default function CalorieProgress({ date, calorieGoal }: CalorieProgressProps) {
  const { data: summary, isLoading } = useDaySummary(date);

  if (isLoading) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3 w-full animate-pulse rounded-full bg-white/[0.04]" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-white/[0.06]" />
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  const totalCal = summary?.total_calories ?? 0;
  const pct = calorieGoal > 0 ? Math.min((totalCal / calorieGoal) * 100, 100) : 0;
  const remaining = Math.max(calorieGoal - totalCal, 0);

  const nutrients: { label: string; value: number | null; unit: string }[] = [
    { label: "Protein", value: summary?.total_protein ?? 0, unit: "g" },
    { label: "Carbs", value: summary?.total_carbs ?? 0, unit: "g" },
    { label: "Fat", value: summary?.total_fat ?? 0, unit: "g" },
    { label: "Fiber", value: summary?.total_fiber ?? null, unit: "g" },
    { label: "Sugar", value: summary?.total_sugar ?? 0, unit: "g" },
    { label: "Salt", value: summary?.total_salt ?? 0, unit: "g" },
  ];

  const barColor = pct >= 100 ? "bg-[#FF6B6B]" : pct >= 80 ? "bg-[#F2C063]" : "bg-dash-success";

  return (
    <GlassCard>
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
            Calories
          </span>
          <span className="font-mono text-sm tabular-nums text-dash-primary">
            <span className="text-lg font-bold">{totalCal}</span>
            <span className="text-dash-tertiary"> / {calorieGoal} kcal</span>
          </span>
        </div>

        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="text-center font-mono text-[11px] text-dash-tertiary">
          {pct >= 100 ? (
            <span className="text-[#FF6B6B]">+{totalCal - calorieGoal} kcal over goal</span>
          ) : (
            <span>{remaining} kcal left</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {nutrients.map((n) => (
            <div key={n.label} className="flex flex-col rounded-lg bg-white/[0.03] px-3 py-2">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                {n.label}
              </span>
              <span
                className="font-mono text-sm font-semibold tabular-nums text-dash-primary"
                data-typo-mono={n.value == null ? "true" : undefined}
                title={n.value == null ? "Unknown" : undefined}
              >
                {n.value == null ? (
                  <>
                    <span aria-hidden="true">- {n.unit}</span>
                    <span className="sr-only">{n.label}: unknown</span>
                  </>
                ) : (
                  `${n.value.toFixed(1)} ${n.unit}`
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
