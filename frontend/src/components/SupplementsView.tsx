import { useState, useMemo } from "react";
import { LuSearch, LuClock, LuPill, LuX, LuChevronUp } from "react-icons/lu";
import { getActiveDate } from "../utils/date";
import DayNavigation from "./DayNavigation";
import GlassCard from "./ui/GlassCard";
import {
  useSupplementLibrary,
  useSupplementStack,
  useCreateUserSupplement,
  useDeleteUserSupplement,
  useToggleSupplement,
} from "../hooks/useSupplements";
import type { Supplement } from "../types";

const TIME_WINDOWS = [
  { key: "morning", label: "Morning (07:00-10:00)" },
  { key: "midday", label: "Midday (12:00-14:00)" },
  { key: "evening", label: "Evening (18:00-21:00)" },
  { key: "bedtime", label: "Before bed (22:00)" },
  { key: "anytime", label: "Anytime (no fixed time window)" },
] as const;

const INTERVAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
const UNIT_OPTIONS = ["mg", "g", "µg", "IU", "capsule", "ml"];

export default function SupplementsView() {
  const [selectedDate, setSelectedDate] = useState(() => getActiveDate());
  const { data: library } = useSupplementLibrary();
  const { data: stack, isLoading, isError } = useSupplementStack(selectedDate);
  const createMutation = useCreateUserSupplement();
  const deleteMutation = useDeleteUserSupplement();
  const toggleMutation = useToggleSupplement();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplement, setSelectedSupplement] = useState<Supplement | null>(null);
  const [dosage, setDosage] = useState("");
  const [unit, setUnit] = useState("mg");
  const [customTags, setCustomTags] = useState("");
  const [intervalDays, setIntervalDays] = useState(1);
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

  const filteredLibrary = useMemo(() => {
    if (!library || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return library.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
  }, [library, searchQuery]);

  const relevantCount = stack?.filter((s) => s.is_due_today || s.taken_today).length ?? 0;
  const takenCount = stack?.filter((s) => s.taken_today).length ?? 0;

  const handleSelectSupplement = (supp: Supplement) => {
    setSelectedSupplement(supp);
    setSearchQuery(supp.name);
    setDosage(supp.default_dosage);
    setUnit(supp.default_unit);
    setCustomTags("");
    setIntervalDays(1);
    setTimeDropdownOpen(false);
  };

  const handleAdd = (timeWindow: string) => {
    if (!selectedSupplement) return;
    createMutation.mutate({
      supplement_id: selectedSupplement.id,
      dosage,
      unit,
      time_window: timeWindow,
      interval_days: intervalDays,
      custom_tags: customTags.trim() || undefined,
    });
    setSelectedSupplement(null);
    setSearchQuery("");
    setCustomTags("");
    setIntervalDays(1);
    setTimeDropdownOpen(false);
  };

  const handleToggle = (stackId: number) => {
    toggleMutation.mutate({ user_supplement_id: stackId, date: selectedDate });
  };

  const handleDelete = (stackId: number) => {
    deleteMutation.mutate(stackId);
  };

  const groupedStack = useMemo(() => {
    if (!stack) return {};
    const groups: Record<string, typeof stack> = {};
    for (const tw of TIME_WINDOWS) {
      groups[tw.key] = [];
    }
    for (const item of stack) {
      if (groups[item.time_window]) {
        groups[item.time_window].push(item);
      }
    }
    return groups;
  }, [stack]);

  return (
    <div className="space-y-4">
      <h1
        className="mb-[14px] text-[22px] font-bold leading-tight tracking-tight max-[480px]:text-[22px] sm:text-[28px]"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #C7C4BC 120%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Supplements
      </h1>

      <DayNavigation selectedDate={selectedDate} onDateChange={setSelectedDate} />

      {/* Section 1: day overview */}
      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-secondary">
            Today's stack
          </span>
          <span className="font-mono text-[12px] text-dash-primary/80">
            {takenCount}/{relevantCount} taken
          </span>
        </div>

        {relevantCount > 0 && (
          <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-dash-success shadow-[0_0_8px_rgba(107,227,164,0.3)] transition-all duration-500"
              style={{ width: `${relevantCount > 0 ? (takenCount / relevantCount) * 100 : 0}%` }}
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-4 w-40 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-10 animate-pulse rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <span className="font-mono text-[11px] text-[#FF6B6B]">Failed to load</span>
        ) : (
          <>
            {(() => {
              const activeWindows = TIME_WINDOWS.filter(
                (tw) => (groupedStack[tw.key] || []).length > 0,
              );
              if (activeWindows.length === 0) {
                return (
                  <p className="py-6 text-center font-mono text-[12px] text-dash-tertiary/60">
                    No supplements planned for today. Use the search below to add some.
                  </p>
                );
              }
              return (
                <div className="space-y-4">
                  {activeWindows.map((tw) => {
                    const items = groupedStack[tw.key] || [];
                    return (
                      <div key={tw.key}>
                        <span className="mb-2 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-dash-secondary">
                          {tw.label}
                        </span>
                        <div className="space-y-1">
                          {items.map((item) => {
                            const seedTags = item.tags ? item.tags.split(",") : [];
                            const customTagList = item.custom_tags
                              ? item.custom_tags
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter(Boolean)
                              : [];
                            return (
                              <div
                                key={item.id}
                                className={`flex items-center gap-3 rounded-xl border-0 bg-white/[0.045] px-3 py-3 transition-all ${!item.is_due_today ? "opacity-40" : ""}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleToggle(item.id)}
                                  className={`relative flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-all cursor-pointer ${
                                    item.taken_today
                                      ? "border-[#6BE3A4] bg-[#6BE3A4] shadow-[0_0_12px_rgba(107,227,164,0.40)]"
                                      : item.is_due_today
                                        ? "border-white/[0.22] bg-transparent"
                                        : "border-white/[0.10] bg-transparent"
                                  }`}
                                >
                                  {item.taken_today && (
                                    <svg
                                      viewBox="0 0 12 10"
                                      className="h-[10px] w-[12px] text-[#0A0A0B]"
                                      style={{
                                        animation:
                                          "check-pop 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
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

                                <LuPill className="h-4 w-4 shrink-0 text-dash-secondary/80" />

                                <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                                  <span className="truncate text-sm text-dash-primary">
                                    {item.name}
                                  </span>
                                  <span className="truncate font-mono text-[10.5px] text-dash-secondary">
                                    {item.dosage} {item.unit}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {seedTags.length > 0 && (
                                    <div className="hidden gap-1 sm:flex">
                                      {seedTags.slice(0, 2).map((tag) => (
                                        <span
                                          key={tag}
                                          className="rounded-full bg-white/[0.10] px-2 py-0.5 font-mono text-[9px] text-dash-secondary"
                                        >
                                          {tag.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {customTagList.length > 0 && (
                                    <div className="hidden gap-1 sm:flex">
                                      {customTagList.slice(0, 2).map((tag) => (
                                        <span
                                          key={tag}
                                          className="rounded-full bg-dash-success/10 px-2 py-0.5 font-mono text-[9px] text-dash-success"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {item.interval_days > 1 ? (
                                    <span className="rounded-full bg-dash-warning/10 px-2 py-0.5 font-mono text-[9px] text-dash-warning/90">
                                      every {item.interval_days} days
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-dash-success/10 px-2 py-0.5 font-mono text-[9px] text-dash-success">
                                      daily
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.id)}
                                  className="cursor-pointer text-dash-secondary/60 transition-colors hover:text-[#FF6B6B]"
                                >
                                  <LuX className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}
      </GlassCard>

      {/* Section 2: search / add */}
      <GlassCard>
        <span className="mb-3 block font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-secondary">
          Search / add
        </span>

        <p className="mb-4 font-mono text-[11px] text-dash-secondary/80">
          Search the library to build your stack.
        </p>

        <div className="relative mb-3">
          <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dash-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedSupplement(null);
              setTimeDropdownOpen(false);
            }}
            placeholder="Search supplements…"
            className="w-full rounded-xl border border-white/[0.10] bg-white/[0.05] py-2.5 pl-10 pr-4 text-sm text-dash-primary placeholder:text-dash-tertiary/60 outline-none transition-colors focus:border-white/[0.16] focus:bg-white/[0.07]"
          />
        </div>

        {filteredLibrary.length > 0 && !selectedSupplement && (
          <div className="mb-3 space-y-0.5">
            {filteredLibrary.map((supp) => (
              <button
                key={supp.id}
                type="button"
                onClick={() => handleSelectSupplement(supp)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
              >
                <span className="text-lg">{supp.emoji}</span>
                <div className="flex flex-col">
                  <span className="text-sm text-dash-primary">{supp.name}</span>
                  <span className="font-mono text-[10.5px] text-dash-secondary/80">
                    {supp.default_dosage} {supp.default_unit} · {supp.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedSupplement && (
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2.5">
            <span className="text-lg">{selectedSupplement.emoji}</span>
            <div className="flex flex-1 flex-col">
              <span className="text-sm text-dash-primary">{selectedSupplement.name}</span>
              <span className="font-mono text-[10.5px] text-dash-secondary/80">
                {selectedSupplement.default_dosage} {selectedSupplement.default_unit} ·{" "}
                {selectedSupplement.category}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedSupplement(null);
                setSearchQuery("");
              }}
              className="text-dash-secondary/60 hover:text-dash-secondary"
            >
              <LuX className="h-4 w-4" />
            </button>
          </div>
        )}

        {selectedSupplement && (
          <>
            <div className="mb-3 flex gap-2">
              <div className="flex-1">
                <span className="mb-1.5 block font-mono text-[10px] text-dash-secondary/80">
                  Dosage
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.10] bg-white/[0.05] px-3 py-2 text-sm text-dash-primary placeholder:text-dash-tertiary/50 outline-none transition-colors focus:border-white/[0.16] focus:bg-white/[0.07]"
                />
              </div>
              <div className="w-24">
                <span className="mb-1.5 block font-mono text-[10px] text-dash-secondary/80">
                  Unit
                </span>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="h-full w-full rounded-xl border border-white/[0.10] bg-white/[0.05] px-3 py-2 text-sm text-dash-primary outline-none transition-colors focus:border-white/[0.16] appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2376746E' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 8px center",
                    paddingRight: "28px",
                  }}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u} className="bg-[#121215]">
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-3">
              <span className="mb-1.5 block font-mono text-[10px] text-dash-secondary/80">
                Custom tags (optional)
              </span>
              <input
                type="text"
                value={customTags}
                onChange={(e) => setCustomTags(e.target.value)}
                placeholder="e.g. after meals, before training"
                className="w-full rounded-xl border border-white/[0.10] bg-white/[0.05] px-3 py-2 text-sm text-dash-primary placeholder:text-dash-tertiary/50 outline-none transition-colors focus:border-white/[0.16] focus:bg-white/[0.07]"
              />
            </div>

            <div className="mb-3">
              <span className="mb-1.5 block font-mono text-[10px] text-dash-secondary/80">
                Every how many days?
              </span>
              <div className="flex gap-1.5">
                {INTERVAL_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setIntervalDays(n)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-[11px] transition-all ${
                      intervalDays === n
                        ? "bg-dash-success/15 text-dash-success shadow-[0_0_6px_rgba(107,227,164,0.15)]"
                        : "bg-white/[0.04] text-dash-secondary/60 hover:bg-white/[0.08] hover:text-dash-secondary"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dash-success/30 bg-dash-success/[0.06] py-2.5 text-sm text-dash-success transition-colors hover:bg-dash-success/[0.10]"
              >
                <LuClock className="h-4 w-4" />
                <span>When to take it?</span>
                <LuChevronUp
                  className={`h-4 w-4 transition-transform ${timeDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {timeDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 z-30 mb-1 overflow-hidden rounded-xl border border-white/[0.10] bg-[#121215] shadow-[0_-8px_32px_rgba(0,0,0,0.7)]">
                  {TIME_WINDOWS.map((tw) => (
                    <button
                      key={tw.key}
                      type="button"
                      onClick={() => handleAdd(tw.key)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-dash-primary transition-colors hover:bg-white/[0.06]"
                    >
                      <LuClock className="h-4 w-4 text-dash-secondary" />
                      <span>{tw.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </GlassCard>
    </div>
  );
}
