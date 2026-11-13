import { useEffect, useRef, useState } from "react";
import { useGoals, useGoalsByKind } from "../hooks/useGoals";
import { getActiveDate } from "../utils/date";

interface TickerItem {
  status: "done" | "pending" | "empty";
  text: string;
}

export default function GoalTicker() {
  const date = getActiveDate();
  const { data, isSuccess } = useGoals(date);
  const { data: shortGoals, isSuccess: shortSuccess } = useGoalsByKind("short");
  const [items, setItems] = useState<TickerItem[]>([]);
  const [cycleIdx, setCycleIdx] = useState(0);
  const [total, setTotal] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isSuccess || !data || !shortSuccess) return;

    const shortToday = (shortGoals ?? []).filter((g) => g.due_date === date);
    const combinedTotal = data.total + shortToday.length;
    const combinedDone = data.done_count + shortToday.filter((g) => g.done).length;

    setTotal(combinedTotal);
    setDoneCount(combinedDone);

    if (combinedTotal === 0) {
      setItems([
        {
          status: "empty",
          text: "No goals for today. Add one.",
        },
      ]);
    } else if (combinedDone === combinedTotal) {
      setItems([{ status: "done", text: "✓ All goals done. Solid day." }]);
    } else {
      const pending = [
        ...data.goals.filter((g) => !g.done),
        ...shortToday.filter((g) => !g.done),
      ].map((g) => ({ status: "pending" as const, text: g.text }));
      setItems(pending);
    }
    setCycleIdx(0);
  }, [data, isSuccess, shortGoals, shortSuccess, date]);

  useEffect(() => {
    if (items.length <= 1) return;

    const tick = () => {
      setLeaving(true);
      setTimeout(() => {
        setCycleIdx((prev) => (prev + 1) % items.length);
        setLeaving(false);
      }, 450);
    };

    intervalRef.current = setInterval(tick, 5000);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [items.length]);

  const currentItem = items[cycleIdx] ?? { status: "empty" as const, text: "" };
  const statusGlyph =
    currentItem.status === "done" ? "✓" : currentItem.status === "pending" ? "○" : "·";
  const statusColor =
    currentItem.status === "done"
      ? "text-[#6BE3A4]"
      : currentItem.status === "pending"
        ? "text-dash-tertiary"
        : "text-dash-tertiary";

  return (
    <div className="mb-[18px]">
      <div
        className="relative flex flex-row items-center gap-[10px] overflow-hidden rounded-xl px-[7px] py-3"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.30) 100%)",
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.30) 100%),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 3px)`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
            width: "30%",
            animation: "sweep 8s ease-in-out infinite",
          }}
        />

        <div className="relative flex h-[7px] w-[7px] items-center justify-center">
          <div
            className="h-[7px] w-[7px] rounded-full bg-[#6BE3A4]"
            style={{
              boxShadow: "0 0 8px rgba(107,227,164,0.7)",
              animation: "pulse-led 1.6s ease-in-out infinite",
            }}
          />
        </div>

        <span className="font-mono text-[9.5px] font-extrabold tracking-[0.18em] text-dash-tertiary">
          GOALS
        </span>

        <div className="relative h-[22px] flex-1 overflow-hidden">
          <div
            key={cycleIdx}
            className={`flex h-[22px] flex-row items-center gap-2 whitespace-nowrap font-mono text-[12.5px] font-semibold tabular-nums text-white ${
              leaving
                ? "animate-[ticker-leave_0.45s_cubic-bezier(0.55,0,0.55,1)_forwards]"
                : "animate-[ticker-enter_0.45s_cubic-bezier(0.22,1,0.36,1)_forwards]"
            }`}
          >
            <span className={`inline-block w-[18px] text-center ${statusColor}`}>
              {statusGlyph}
            </span>
            <span className="flex-1 truncate">{currentItem.text}</span>
          </div>
        </div>

        <div className="rounded-full bg-white/[0.04] px-[3px] py-[8px] font-mono text-[11px] font-bold tabular-nums tracking-[0.04em] text-dash-secondary">
          {doneCount}/{total}
        </div>
      </div>
    </div>
  );
}
