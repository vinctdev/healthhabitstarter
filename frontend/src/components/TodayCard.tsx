import { useState, useCallback } from "react";
import GlassCard from "./ui/GlassCard";
import GoalRow from "./GoalRow";
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useReorderGoals,
  usePushGoals,
  usePolishGoal,
} from "../hooks/useGoals";
import { useStreak } from "../hooks/useStreak";
import { AI_GATED_CLASS, aiGateProps, useAiEnabled } from "../hooks/useAi";
import { getTomorrowDate, formatPrettyDate } from "../utils/date";

interface TodayCardProps {
  date: string;
}

export default function TodayCard({ date }: TodayCardProps) {
  const { data, isLoading, isError } = useGoals(date);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const reorderGoals = useReorderGoals();
  const pushGoals = usePushGoals();
  const polishGoal = usePolishGoal();
  const aiEnabled = useAiEnabled();
  const { data: streakData } = useStreak();

  const [input, setInput] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [showAll, setShowAll] = useState(false);

  const goals = data?.goals ?? [];
  const total = data?.total ?? 0;
  const doneCount = data?.done_count ?? 0;
  const streak = streakData?.count ?? 0;
  const hasPending = goals.some((g) => !g.done);

  const showMore = goals.length > 5;
  const visibleGoals = showAll ? goals : goals.slice(0, 5);

  const showStatus = (msg: string, duration = 3500) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), duration);
  };

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    createGoal.mutate({ text, due_date: date });
    setInput("");
  };

  const handlePolish = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    try {
      const result = await polishGoal.mutateAsync(text);
      createGoal.mutate({ text: result.polished, due_date: date });
      setInput("");
    } catch {
      createGoal.mutate({ text, due_date: date });
      setInput("");
      showStatus("Polishing failed, added as typed.");
    }
  }, [input, date, polishGoal, createGoal]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("text/plain", String(id));
  };

  const handleDragOver = (e: React.DragEvent, _id: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    const fromId = Number(e.dataTransfer.getData("text/plain"));
    if (!fromId || fromId === targetId) return;

    const ids = goals.map((g) => g.id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, fromId);
    reorderGoals.mutate(ids);
  };

  const handlePush = () => {
    const undone = goals.filter((g) => !g.done).length;
    if (!window.confirm(`Move ${undone} open goal${undone === 1 ? "" : "s"} to tomorrow?`)) return;
    const tomorrow = getTomorrowDate();
    pushGoals.mutate({ from_date: date, to_date: tomorrow });
  };

  const getLabel = () => {
    if (total === 0) return "no goals";
    if (doneCount === total) return "all done, solid day";
    return "done";
  };

  if (isLoading) {
    return (
      <GlassCard>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-48 rounded bg-white/10" />
          <div className="h-3 w-32 rounded bg-white/10" />
          <div className="h-2 w-full rounded bg-white/10" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  if (isError) {
    return (
      <GlassCard>
        <p className="text-center text-dash-danger">Could not load goals. Check your connection.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      className={
        doneCount > 0 && doneCount === total
          ? "bg-gradient-to-t from-transparent via-[rgba(107,227,164,0.04)] to-transparent"
          : ""
      }
    >
      <div className="mb-[14px] flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="mb-[6px] font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
            Today · {formatPrettyDate(date)}
          </p>
          <div className="flex items-baseline gap-[6px]">
            <span
              className={`font-mono text-[42px] font-bold tabular-nums tracking-tight ${
                doneCount > 0 && doneCount === total ? "text-[#6BE3A4]" : "text-white"
              }`}
            >
              {doneCount}
            </span>
            <span className="font-mono text-lg text-dash-tertiary">/ {total}</span>
            <span
              className={`font-mono text-[11px] font-semibold uppercase tracking-[0.10em] ${
                doneCount > 0 && doneCount === total ? "text-[#6BE3A4]" : "text-dash-tertiary"
              }`}
            >
              {getLabel()}
            </span>
          </div>
        </div>

        <div
          className={`inline-flex items-center gap-[6px] rounded-full px-3 py-2 ${
            streak > 0
              ? "border border-[rgba(242,192,99,0.32)] bg-[rgba(242,192,99,0.10)]"
              : "bg-white/[0.04]"
          }`}
        >
          <span
            className="text-[13px]"
            style={streak > 0 ? { filter: "drop-shadow(0 0 6px rgba(242,192,99,0.6))" } : undefined}
          >
            ⚡
          </span>
          <span
            className={`font-mono text-sm font-bold tabular-nums ${
              streak > 0 ? "text-[#F2C063]" : "text-dash-tertiary"
            }`}
          >
            {streak}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.10em] text-dash-tertiary">
            day streak
          </span>
        </div>
      </div>

      <div className="mb-4 flex h-[6px] gap-[4px]">
        {goals.length > 0
          ? goals.map((g) => (
              <div
                key={g.id}
                className={`flex-1 rounded-full transition-all ${
                  g.done ? "bg-[#6BE3A4] shadow-[0_0_6px_rgba(107,227,164,0.40)]" : "bg-white/10"
                }`}
              />
            ))
          : null}
      </div>

      <ul className="space-y-[6px]">
        {visibleGoals.map((goal) => (
          <li key={goal.id}>
            <GoalRow
              goal={goal}
              onUpdate={(id, data) => updateGoal.mutate({ id, ...data })}
              onDelete={(id) => deleteGoal.mutate(id)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onToggleQueue={(id, queued) => updateGoal.mutate({ id, queued })}
            />
          </li>
        ))}
      </ul>

      {goals.length === 0 && (
        <div className="py-[14px] text-center text-[12px] italic text-dash-tertiary">
          No goals for today yet. Add one below.
        </div>
      )}

      {showMore && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-2 w-full border border-dashed border-white/10 py-2 text-center text-[12px] text-dash-tertiary transition-colors hover:text-dash-primary"
        >
          {showAll ? "Less ▴" : `${goals.length - 5} more ▾`}
        </button>
      )}

      {hasPending && (
        <button
          type="button"
          onClick={handlePush}
          className="mt-3 w-full rounded-xl border border-dashed border-white/10 py-2 text-center text-[12px] text-dash-tertiary transition-colors hover:border-solid hover:text-dash-primary"
        >
          Move open goals to tomorrow
        </button>
      )}

      <div className="mt-[14px] flex flex-wrap items-center gap-3 border-t border-white/10 pt-[14px]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a goal…"
          className="min-w-0 flex-1 rounded-xl bg-white/[0.04] px-3 py-[11px] text-sm text-white placeholder-dash-tertiary outline-none transition-all focus:border focus:border-white/30"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={polishGoal.isPending}
          className="rounded-full bg-gradient-to-b from-white to-[#E8E5DD] px-5 py-[11px] text-[11px] font-bold text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-px hover:brightness-110 disabled:opacity-40 disabled:hover:translate-y-0"
        >
          + Add
        </button>
        <button
          type="button"
          onClick={handlePolish}
          disabled={polishGoal.isPending}
          {...aiGateProps(aiEnabled)}
          className={`rounded-full border px-5 py-[11px] text-[11px] font-bold text-dash-primary transition-all hover:bg-white/10 disabled:cursor-default ${AI_GATED_CLASS} ${
            polishGoal.isPending
              ? "border-dash-success/50 bg-dash-success/[0.06] animate-[ai-border-glow_2s_ease-in-out_infinite]"
              : "border-white/10 bg-white/[0.04]"
          }`}
        >
          {polishGoal.isPending ? (
            <span className="flex items-center gap-1.5">
              AI is thinking
              <span className="flex items-center gap-0.5 ml-0.5">
                <span
                  className="inline-block h-1 w-1 rounded-full bg-dash-success animate-[ai-dot_1.2s_ease-in-out_infinite]"
                  style={{ animationDelay: "0s" }}
                />
                <span
                  className="inline-block h-1 w-1 rounded-full bg-dash-success animate-[ai-dot_1.2s_ease-in-out_infinite]"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="inline-block h-1 w-1 rounded-full bg-dash-success animate-[ai-dot_1.2s_ease-in-out_infinite]"
                  style={{ animationDelay: "0.4s" }}
                />
              </span>
            </span>
          ) : (
            "✨ Polish"
          )}
        </button>
      </div>

      {statusMsg && <p className="mt-2 text-[11px] text-dash-tertiary">{statusMsg}</p>}
    </GlassCard>
  );
}
