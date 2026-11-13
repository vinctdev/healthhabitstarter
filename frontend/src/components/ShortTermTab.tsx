import { useState } from "react";
import GoalListRow from "./GoalListRow";
import {
  useGoalsByKind,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  usePolishGoal,
} from "../hooks/useGoals";
import { getActiveDate } from "../utils/date";

function defaultDueDate(): string {
  const d = new Date(getActiveDate() + "T12:00:00");
  d.setDate(d.getDate() + 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ShortTermTab() {
  const { data, isLoading, isError } = useGoalsByKind("short");
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const polishGoal = usePolishGoal();

  const [input, setInput] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [statusMsg, setStatusMsg] = useState("");

  const goals = data ?? [];
  const open = goals.filter((g) => !g.done);

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 3500);
  };

  const payload = () => ({
    text: input.trim(),
    due_date: dueDate || null,
    kind: "short" as const,
    description: description.trim() || null,
  });

  const resetForm = () => {
    setInput("");
    setDescription("");
    setDueDate(defaultDueDate());
  };

  const handleAdd = () => {
    if (!input.trim()) return;
    createGoal.mutate(payload());
    resetForm();
  };

  const handlePolish = async () => {
    const text = input.trim();
    if (!text) return;
    try {
      const result = await polishGoal.mutateAsync(text);
      createGoal.mutate({ ...payload(), text: result.polished });
      resetForm();
    } catch {
      createGoal.mutate(payload());
      resetForm();
      showStatus("Polishing failed, added as typed.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="py-6 text-center text-dash-danger">Could not load goals.</p>;
  }

  return (
    <div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Short-term goal…"
            className="min-w-0 flex-1 rounded-xl bg-white/[0.04] px-3 py-[11px] text-sm text-white placeholder-dash-tertiary outline-none transition-all focus:border focus:border-white/30"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-[150px] shrink-0 rounded-xl bg-white/[0.04] px-3 py-[11px] text-sm text-dash-primary outline-none transition-all focus:border focus:border-white/30 [color-scheme:dark]"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={polishGoal.isPending}
            className="rounded-full bg-gradient-to-b from-white to-[#E8E5DD] px-5 py-[11px] text-[11px] font-bold text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-px hover:brightness-110 disabled:opacity-40"
          >
            + Add
          </button>
          <button
            type="button"
            onClick={handlePolish}
            disabled={polishGoal.isPending}
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-[11px] text-[11px] font-bold text-dash-primary transition-all hover:bg-white/10 disabled:opacity-40"
          >
            ✨ Polish
          </button>
        </div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)…"
          className="w-full rounded-xl bg-white/[0.04] px-3 py-[11px] text-sm text-white placeholder-dash-tertiary outline-none transition-all focus:border focus:border-white/30"
        />
      </div>

      {statusMsg && <p className="mt-2 text-[11px] text-dash-tertiary">{statusMsg}</p>}

      <div className="mb-3 mt-5 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-dash-tertiary">
          {open.length} open · {goals.length} total
        </p>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => (
          <GoalListRow
            key={goal.id}
            goal={goal}
            onUpdate={(id, data) => updateGoal.mutate({ id, ...data })}
            onDelete={(id) => deleteGoal.mutate(id)}
          />
        ))}
      </div>

      {goals.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-[12px] italic text-dash-tertiary">
          No short-term goals yet. Add one above.
        </div>
      )}
    </div>
  );
}
