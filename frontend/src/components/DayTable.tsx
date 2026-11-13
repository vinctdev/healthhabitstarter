import { useWeeklyCalories } from "../hooks/useFood";
import GlassCard from "./ui/GlassCard";

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

export default function DayTable() {
  const { data: weekly, isLoading } = useWeeklyCalories();

  if (isLoading) {
    return (
      <GlassCard>
        <div className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-white/[0.06]" />
          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-white/[0.04]" />
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <span className="mb-3 block font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
        Last 7 days
      </span>

      <div className="space-y-1">
        {weekly?.map((entry) => (
          <div key={entry.date} className="flex items-center justify-between rounded-lg px-3 py-2">
            <span className="font-mono text-[12px] text-dash-secondary">
              {formatDateShort(entry.date)}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold tabular-nums text-dash-primary">
                {entry.total_calories} kcal
              </span>
              <span className="font-mono text-[11px] tabular-nums text-dash-tertiary">
                {entry.entry_count} {entry.entry_count === 1 ? "entry" : "entries"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
