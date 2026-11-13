import { useFoodStreak } from "../hooks/useFood";

export default function FoodStreak() {
  const { data: streak, isLoading } = useFoodStreak();

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white/[0.04] px-4 py-3">
        <div className="h-5 w-32 animate-pulse rounded bg-white/[0.06]" />
      </div>
    );
  }

  const count = streak?.count ?? 0;

  return (
    <div className="rounded-xl bg-white/[0.04] px-4 py-3">
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
    </div>
  );
}
