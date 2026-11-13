import { useFoodEntries } from "../hooks/useFood";
import FoodEntryRow from "./FoodEntryRow";
import GlassCard from "./ui/GlassCard";
import type { FoodEntry } from "../types";

interface DaySummaryProps {
  date: string;
  onSaveTemplate?: (entry: FoodEntry) => void;
}

export default function DaySummary({ date, onSaveTemplate }: DaySummaryProps) {
  const { data: entries, isLoading, isError } = useFoodEntries(date);

  if (isLoading) {
    return (
      <GlassCard>
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-white/[0.04]" />
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

  return (
    <GlassCard>
      <span className="mb-3 block font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
        Entries
      </span>

      <div className="space-y-1">
        {entries.map((entry) => (
          <FoodEntryRow key={entry.id} entry={entry} onSaveTemplate={onSaveTemplate} />
        ))}
      </div>
    </GlassCard>
  );
}
