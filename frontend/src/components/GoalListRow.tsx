import { useRef } from "react";
import { LuCheck, LuTrash2 } from "react-icons/lu";
import TimeProgressBar from "./TimeProgressBar";
import { formatDueDate, formatRemaining, timeProgress } from "../utils/goals";
import type { Goal, GoalUpdate } from "../types";

interface GoalListRowProps {
  goal: Goal;
  onUpdate: (id: number, data: GoalUpdate) => void;
  onDelete: (id: number) => void;
}

export default function GoalListRow({ goal, onUpdate, onDelete }: GoalListRowProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const remaining = goal.due_date ? formatRemaining(goal.due_date) : null;
  const progress = timeProgress(goal.created_at, goal.due_date);

  const handleEditStart = () => {
    setTimeout(() => {
      if (textRef.current) {
        textRef.current.contentEditable = "true";
        textRef.current.focus();
        const range = document.createRange();
        range.selectNodeContents(textRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 0);
  };

  const handleEditEnd = () => {
    if (!textRef.current) return;
    textRef.current.contentEditable = "false";
    const newText = textRef.current.textContent?.trim();
    if (newText && newText !== goal.text) {
      onUpdate(goal.id, { text: newText });
    } else {
      textRef.current.textContent = goal.text;
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      textRef.current?.blur();
    }
    if (e.key === "Escape" && textRef.current) {
      textRef.current.textContent = goal.text;
      textRef.current.blur();
    }
  };

  const created = new Date(goal.created_at).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });

  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4 transition-all ${
        goal.done ? "opacity-45" : ""
      }`}
    >
      <div className="mb-3 flex items-start gap-3">
        <button
          type="button"
          onClick={() => onUpdate(goal.id, { done: !goal.done })}
          className={`mt-[2px] relative flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border transition-all ${
            goal.done
              ? "border-[#6BE3A4] bg-[#6BE3A4] shadow-[0_0_12px_rgba(107,227,164,0.40)]"
              : "border-white/[0.18] bg-transparent cursor-pointer"
          }`}
          title="Done"
        >
          {goal.done && <LuCheck className="h-[14px] w-[14px] text-[#0A0A0B]" />}
        </button>

        <div className="min-w-0 flex-1">
          <span
            ref={textRef}
            className={`block cursor-text break-words text-[15px] font-medium text-dash-primary outline-none ${
              goal.done ? "line-through decoration-white/40" : ""
            }`}
            onClick={handleEditStart}
            onBlur={handleEditEnd}
            onKeyDown={handleEditKeyDown}
            role="textbox"
            tabIndex={0}
            aria-label="Goal text"
          >
            {goal.text}
          </span>
          {goal.description && (
            <p className="mt-1 line-clamp-2 break-words text-[12px] leading-snug text-dash-tertiary">
              {goal.description}
            </p>
          )}
        </div>

        {remaining ? (
          <span
            className={`shrink-0 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${
              remaining.overdue
                ? "border border-[rgba(255,107,107,0.35)] bg-[rgba(255,107,107,0.10)] text-[#FF9B9B]"
                : "border border-[rgba(107,227,164,0.28)] bg-[rgba(107,227,164,0.08)] text-[#9BEFC4]"
            }`}
          >
            {remaining.label}
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 font-mono text-[10px] font-bold text-dash-tertiary">
            ∞
          </span>
        )}

        <button
          type="button"
          onClick={() => onDelete(goal.id)}
          className="shrink-0 cursor-pointer text-dash-tertiary opacity-50 transition-opacity hover:text-[#FF6B6B] hover:opacity-100"
          title="Delete"
        >
          <LuTrash2 className="h-[15px] w-[15px]" />
        </button>
      </div>

      {progress !== null && <TimeProgressBar progress={progress} overdue={remaining?.overdue} />}

      <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-dash-tertiary">
        <span>{created}</span>
        <span>{goal.due_date ? formatDueDate(goal.due_date) : "No deadline"}</span>
      </div>
    </div>
  );
}
