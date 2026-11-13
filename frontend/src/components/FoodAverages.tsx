import { useAverages, useFoodStreak } from "../hooks/useFood";

export default function FoodAverages() {
  const { data: avg, isLoading: avgLoading } = useAverages();
  const { data: streak, isLoading: streakLoading } = useFoodStreak();

  const isLoading = avgLoading || streakLoading;
  const count = streak?.count ?? 0;
  const hasData = avg && avg.days_counted > 0;

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white/[0.04] px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="h-4 w-48 animate-pulse rounded bg-white/[0.06]" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white/[0.04] px-4 py-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
            Streak
          </span>
          <span
            className={`font-mono text-sm font-bold tabular-nums ${
              count > 0 ? "text-dash-success" : "text-dash-tertiary"
            }`}
          >
            {count} {count === 1 ? "day" : "days"}
          </span>
          {count > 0 && (
            <span className="h-[7px] w-[7px] rounded-full bg-dash-success shadow-[0_0_8px_rgba(107,227,164,0.7)]" />
          )}
        </div>

        <span className="h-3 w-px bg-white/[0.08]" />

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
            7-day avg
          </span>
          <span className="font-mono text-sm tabular-nums text-dash-primary">
            {hasData ? `${avg.avg_calories.toFixed(0)} kcal` : "-"}
          </span>
        </div>
      </div>
    </div>
  );
}
