import { useState } from "react";
import GlassCard from "./ui/GlassCard";
import GoalRow from "./GoalRow";
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  usePolishGoal,
} from "../hooks/useGoals";
import { formatPrettyDate, getDayStartHour } from "../utils/date";
import { AI_GATED_CLASS, aiGateProps, useAiEnabled } from "../hooks/useAi";

interface TomorrowCardProps {
  date: string;
  isLocked: boolean;
}

export default function TomorrowCard({ date, isLocked }: TomorrowCardProps) {
  const { data, isLoading, isError } = useGoals(date);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const polishGoal = usePolishGoal();
  const aiEnabled = useAiEnabled();

  const [input, setInput] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const goals = data?.goals ?? [];

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

  const handlePolish = async () => {
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  if (isLoading) {
    return (
      <GlassCard>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-48 rounded bg-white/10" />
          <div className="h-3 w-32 rounded bg-white/10" />
          <div className="space-y-2">
            {[1, 2].map((i) => (
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
    <GlassCard>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="mb-[6px] font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
            Plan for tomorrow · {formatPrettyDate(date)}
          </p>
          <p className="text-[12px] text-dash-tertiary">
            Plan tonight, locked until {getDayStartHour()}:00.
          </p>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-dash-tertiary">
          {goals.length} planned
        </span>
      </div>

      <ul className="space-y-[6px]">
        {goals.map((goal) => (
          <li key={goal.id}>
            <GoalRow
              goal={goal}
              readOnly={isLocked}
              onUpdate={(id, data) => updateGoal.mutate({ id, ...data })}
              onDelete={(id) => deleteGoal.mutate(id)}
              onToggleQueue={(id, queued) => updateGoal.mutate({ id, queued })}
            />
          </li>
        ))}
      </ul>

      {goals.length === 0 && (
        <div className="py-[14px] text-center text-[12px] italic text-dash-tertiary">
          Nothing planned for tomorrow yet.
        </div>
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
          className="rounded-full bg-gradient-to-b from-white to-[#E8E5DD] px-5 py-[11px] text-[11px] font-bold text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-px hover:brightness-110"
        >
          + Add
        </button>
        <button
          type="button"
          onClick={handlePolish}
          {...aiGateProps(aiEnabled)}
          className={`rounded-full border border-white/10 bg-white/[0.04] px-5 py-[11px] text-[11px] font-bold text-dash-primary transition-all hover:bg-white/10 ${AI_GATED_CLASS}`}
        >
          ✨ Polish
        </button>
      </div>

      {statusMsg && <p className="mt-2 text-[11px] text-dash-tertiary">{statusMsg}</p>}
    </GlassCard>
  );
}
