import { useState } from "react";
import ComingUpCard from "./ComingUpCard";
import DailyPlanTab from "./DailyPlanTab";
import ShortTermTab from "./ShortTermTab";
import LongTermTab from "./LongTermTab";
import { useGoals, useGoalsByKind } from "../hooks/useGoals";
import { getActiveDate } from "../utils/date";
import type { GoalKind } from "../types";

type TabId = "daily" | "short" | "long";

const TABS: { id: TabId; label: string }[] = [
  { id: "daily", label: "Daily plan" },
  { id: "short", label: "Short-term" },
  { id: "long", label: "Long-term" },
];

export default function GoalsSection() {
  const [tab, setTab] = useState<TabId>("daily");
  const { data: shortGoals } = useGoalsByKind("short" as GoalKind);
  const { data: longGoals } = useGoalsByKind("long" as GoalKind);
  const { data: dailyGoals } = useGoals(getActiveDate());

  const counts: Record<TabId, number> = {
    daily: dailyGoals?.goals.filter((g) => !g.done).length ?? 0,
    short: shortGoals?.filter((g) => !g.done).length ?? 0,
    long: longGoals?.filter((g) => !g.done).length ?? 0,
  };

  return (
    <section>
      <div className="section-title mb-4 flex items-center gap-3">
        <span className="inline-block h-px w-[18px] bg-dash-tertiary opacity-60" />
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
          Goals
        </span>
        <span className="flex-1 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
      </div>

      <ComingUpCard goals={[...(shortGoals ?? []), ...(longGoals ?? [])]} />

      <div className="my-5 grid grid-cols-3 gap-2">
        {TABS.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 transition-all ${
                isActive
                  ? "bg-gradient-to-b from-[#6BE3A4] to-[#3FB98A] text-[#062018] shadow-[0_0_24px_rgba(107,227,164,0.30)]"
                  : "bg-white/[0.04] text-dash-secondary hover:bg-white/[0.07]"
              }`}
            >
              <span className="text-[12px] font-semibold">{t.label}</span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  isActive ? "text-[#062018] opacity-70" : "text-dash-tertiary"
                }`}
              >
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "daily" ? <DailyPlanTab /> : tab === "short" ? <ShortTermTab /> : <LongTermTab />}
    </section>
  );
}
