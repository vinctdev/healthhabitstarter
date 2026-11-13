import { useFoodEntries } from "../hooks/useFood";
import FoodEntryRow from "../components/FoodEntryRow";
import GlassCard from "../components/ui/GlassCard";
import type { FoodEntry } from "../types";

interface MobileDaySummaryProps {
  date: string;
  onSaveTemplate?: (entry: FoodEntry) => void;
}

/**
 * Compact day overview for mobile: a flat, chronological list (no
 * grouping) so all dish names stay visible. The rows themselves become
 * two-line cards via CSS.
 */
export default function MobileDaySummary({ date, onSaveTemplate }: MobileDaySummaryProps) {
  const { data: entries, isLoading, isError } = useFoodEntries(date);

  if (isLoading) {
    return (
      <GlassCard>
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-white/[0.04]" />
          ))}
        </div>
      </GlassCard>
    );
  }

  if (isError) {
    return (
      <GlassCard>
        <span className="font-mono text-[11px] text-[#FF6B6B]">Failed to load</span>
      </GlassCard>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <GlassCard>
        <span className="font-mono text-[11px] text-dash-tertiary">No entries for this day</span>
      </GlassCard>
    );
  }

  const totalCalories = entries.reduce((sum, entry) => sum + entry.calories, 0);

  return (
    <GlassCard>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
          Entries
        </span>
        <span className="font-mono text-[10px] tabular-nums text-dash-tertiary">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} · {totalCalories} kcal
        </span>
      </div>

      <div className="space-y-1.5">
        {entries.map((entry) => (
          <FoodEntryRow key={entry.id} entry={entry} onSaveTemplate={onSaveTemplate} />
        ))}
      </div>
    </GlassCard>
  );
}
