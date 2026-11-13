import { useMemo } from "react";
import GlassCard from "./ui/GlassCard";
import TimeProgressBar from "./TimeProgressBar";
import { formatDueDate, formatRemaining, kindLabel, timeProgress } from "../utils/goals";
import type { Goal } from "../types";

interface ComingUpCardProps {
  goals: Goal[];
}

export default function ComingUpCard({ goals }: ComingUpCardProps) {
  const next = useMemo(() => {
    return goals
      .filter((g) => !g.done && g.due_date)
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))[0];
  }, [goals]);

  if (!next || !next.due_date) {
    return (
      <GlassCard className="border border-white/[0.06]">
        <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
          Coming up
        </p>
        <p className="mt-2 text-[13px] italic text-dash-tertiary">
          No upcoming goal with a deadline.
        </p>
      </GlassCard>
    );
  }

  const remaining = formatRemaining(next.due_date);
  const progress = timeProgress(next.created_at, next.due_date) ?? 0;
  const created = new Date(next.created_at).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });

  return (
    <GlassCard
      className={`border ${
        remaining.overdue ? "border-[rgba(255,107,107,0.35)]" : "border-white/[0.08]"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`inline-block h-[7px] w-[7px] rounded-full ${
            remaining.overdue ? "bg-[#FF6B6B]" : "bg-[#6BE3A4]"
          }`}
          style={{
            boxShadow: remaining.overdue
              ? "0 0 8px rgba(255,107,107,0.7)"
              : "0 0 8px rgba(107,227,164,0.7)",
            animation: "pulse-led 1.6s ease-in-out infinite",
          }}
        />
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
          Coming up
        </span>
      </div>

      <p className="mb-2 break-words text-[22px] font-semibold leading-tight text-white">
        {next.text}
      </p>

      <p className="mb-4 font-mono text-[11px] text-dash-tertiary">
        {kindLabel(next.kind)}
        <span className="mx-2 opacity-40">·</span>
        Due {formatDueDate(next.due_date)}
        <span className="mx-2 opacity-40">·</span>
        <span className={remaining.overdue ? "text-[#FF6B6B]" : "text-dash-secondary"}>
          {remaining.label}
        </span>
      </p>

      <TimeProgressBar progress={progress} overdue={remaining.overdue} height={7} />

      <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-dash-tertiary">
        <span>{created}</span>
        <span>{formatDueDate(next.due_date)}</span>
      </div>
    </GlassCard>
  );
}
