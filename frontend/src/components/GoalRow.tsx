import { useRef, useState } from "react";
import type { Goal, GoalUpdate } from "../types";
import { getDayStartHour } from "../utils/date";

interface GoalRowProps {
  goal: Goal;
  readOnly?: boolean;
  onUpdate: (id: number, data: GoalUpdate) => void;
  onDelete: (id: number) => void;
  onDragStart?: (e: React.DragEvent, id: number) => void;
  onDragOver?: (e: React.DragEvent, id: number) => void;
  onDrop?: (e: React.DragEvent, id: number) => void;
  onToggleQueue?: (id: number, queued: boolean) => void;
}

export default function GoalRow({
  goal,
  readOnly = false,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleQueue,
}: GoalRowProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [flashing, setFlashing] = useState(false);

  const handleCheck = () => {
    if (readOnly) return;
    onUpdate(goal.id, { done: !goal.done });
  };

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
    if (e.key === "Escape") {
      if (textRef.current) {
        textRef.current.textContent = goal.text;
        textRef.current.blur();
      }
    }
  };

  const doneBg = goal.done ? "bg-[rgba(107,227,164,0.04)]" : "";
  const doneText = goal.done ? "line-through decoration-white/40" : "";
  const queuedBg = goal.queued
    ? "bg-[rgba(242,192,63,0.10)] shadow-[inset_3px_0_0_0_#F2C063] text-[#FFE2A8]"
    : "";
  const flashClass = flashing ? "animate-[queue-flash_0.48s_ease-in-out_forwards]" : "";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-3 ${doneBg} ${queuedBg} ${flashClass} transition-all ${goal.done ? "opacity-45" : ""}`}
      draggable={true}
      onDragStart={(e) => onDragStart?.(e, goal.id)}
      onDragOver={(e) => onDragOver?.(e, goal.id)}
      onDrop={(e) => onDrop?.(e, goal.id)}
    >
      <span
        className="w-[14px] cursor-grab text-dash-tertiary opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
        style={{ letterSpacing: "-2px" }}
      >
        ⋮⋮
      </span>

      <button
        type="button"
        onClick={handleCheck}
        disabled={readOnly}
        title={readOnly ? `Unlocks tomorrow at ${getDayStartHour()}:00` : undefined}
        className={`relative flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border transition-all ${
          goal.done
            ? "border-[#6BE3A4] bg-[#6BE3A4] shadow-[0_0_12px_rgba(107,227,164,0.40)]"
            : "border-white/[0.18] bg-transparent"
        } ${readOnly ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        {goal.done && (
          <svg
            viewBox="0 0 12 10"
            className="h-[10px] w-[12px] text-[#0A0A0B]"
            style={{
              animation: "check-pop 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}
          >
            <path
              d="M1 5.5L4.5 9L11 1"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        <span
          ref={textRef}
          className={`cursor-text truncate text-sm text-dash-primary outline-none ${doneText}`}
          onClick={handleEditStart}
          onBlur={handleEditEnd}
          onKeyDown={handleEditKeyDown}
          role="textbox"
          tabIndex={0}
          aria-label="Goal text"
        >
          {goal.text}
        </span>
        {goal.due_date && (
          <span className="truncate font-mono text-[10px] text-dash-tertiary">
            Due: {goal.due_date}
          </span>
        )}
      </div>

      {onToggleQueue && (
        <button
          type="button"
          onClick={() => {
            onToggleQueue(goal.id, !goal.queued);
            setFlashing(true);
            setTimeout(() => setFlashing(false), 480);
          }}
          disabled={readOnly}
          className={`cursor-pointer text-sm transition-all ${
            goal.queued
              ? "text-[#F2C063] drop-shadow-[0_0_4px_rgba(242,192,99,0.65)]"
              : "text-dash-tertiary opacity-55"
          } ${readOnly ? "cursor-not-allowed opacity-30" : ""}`}
          title="Queue for productivity window"
        >
          ⚡
        </button>
      )}

      <button
        type="button"
        onClick={() => onDelete(goal.id)}
        className="cursor-pointer text-dash-tertiary opacity-50 transition-opacity hover:text-[#FF6B6B] hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
