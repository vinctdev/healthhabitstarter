import { Fragment, useState, useMemo } from "react";
import {
  LuPlus,
  LuPenLine,
  LuChevronDown,
  LuChevronRight,
  LuHeart,
  LuZap,
  LuTimer,
  LuFlame,
  LuFootprints,
  LuLoader,
  LuRefreshCw,
} from "react-icons/lu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import GlassCard from "../ui/GlassCard";
import RunFormModal from "./RunFormModal";
import { runLocationIcon } from "./runLocations";
import type { RunFormData } from "./RunFormModal";
import {
  useRuns,
  useRunStats,
  useCreateRun,
  useUpdateRun,
  useDeleteRun,
  useRunCardio,
  useFetchRunCardio,
} from "../../hooks/useRuns";
import { useHealthStatus } from "../../hooks/useHealth";
import type { Run, RunCreate, RunUpdate, HeartRateZones } from "../../types";

function formatPace(distanceKm: number, durationMin: number): string {
  if (!distanceKm || !durationMin || distanceKm <= 0 || durationMin <= 0) return "--:--";
  const pace = durationMin / distanceKm;
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatPaceFromDecimal(paceDecimal: number | null | undefined): string {
  if (paceDecimal == null || paceDecimal <= 0) return "--:--";
  const mins = Math.floor(paceDecimal);
  const secs = Math.round((paceDecimal - mins) * 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatSpeed(distanceKm: number, durationMin: number): number {
  if (!distanceKm || !durationMin || durationMin <= 0) return 0;
  return (distanceKm * 60) / durationMin;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  const s = Math.round((minutes % 1) * 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}min`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

function parseAsLocal(iso: string): Date {
  const [datePart, timePart] = iso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (timePart) {
    const [h, min] = timePart.split(":").map(Number);
    return new Date(y, m - 1, d, h, min);
  }
  return new Date(y, m - 1, d);
}

function formatDateTime(iso: string): string {
  const d = parseAsLocal(iso);
  return (
    d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    }) +
    " " +
    d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  );
}

function formatShortDate(iso: string): string {
  const d = parseAsLocal(iso);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

const HR_ZONE_COLORS: Record<string, string> = {
  light: "#38bdf8",
  moderate: "#4ade80",
  vigorous: "#fb923c",
  peak: "#ef4444",
};

const HR_ZONE_LABELS: Record<string, string> = {
  light: "Light",
  moderate: "Moderate",
  vigorous: "Vigorous",
  peak: "Peak",
};

const HR_ZONE_ORDER = ["light", "moderate", "vigorous", "peak"] as const;

const EFFORT_COLORS: Record<number, string> = {
  1: "#6BE3A4",
  2: "#6BE3A4",
  3: "#A3E65C",
  4: "#F2C063",
  5: "#F2C063",
  6: "#F28B4B",
  7: "#FF6B6B",
  8: "#FF6B6B",
  9: "#E04040",
  10: "#CC1111",
};

/** Cardio data can only be fetched when a health provider is configured. */
function useCanFetchCardio() {
  const { data: status } = useHealthStatus();
  return status != null && status.provider !== "none";
}

function HrZoneBar({ zones }: { zones: HeartRateZones }) {
  const total =
    (zones.light ?? 0) + (zones.moderate ?? 0) + (zones.vigorous ?? 0) + (zones.peak ?? 0);
  if (total <= 0) return null;

  return (
    <div className="mt-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
        {HR_ZONE_ORDER.map((zone) => {
          const val = zones[zone] ?? 0;
          const pct = (val / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={zone}
              className="h-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: HR_ZONE_COLORS[zone] }}
              title={`${HR_ZONE_LABELS[zone]}: ${Math.round(val)}min (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        {HR_ZONE_ORDER.map((zone) => {
          const val = zones[zone] ?? 0;
          if (val <= 0) return null;
          const pct = Math.round((val / total) * 100);
          return (
            <span
              key={zone}
              className="flex items-center gap-1 font-mono text-[10px] text-dash-tertiary"
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: HR_ZONE_COLORS[zone] }}
              />
              {HR_ZONE_LABELS[zone]}: {Math.round(val)}min ({pct}%)
            </span>
          );
        })}
      </div>
    </div>
  );
}

function RunCardioRow({ runId }: { runId: number }) {
  const { data: cardio, isLoading, isError } = useRunCardio(runId);
  const fetchCardio = useFetchRunCardio();
  const canFetchCardio = useCanFetchCardio();

  const handleFetch = () => {
    fetchCardio.mutate(runId);
  };

  return (
    <div className="py-3 px-1 border-t border-white/[0.04]">
      {isLoading || fetchCardio.isPending ? (
        <div className="flex items-center gap-2 text-dash-tertiary py-2">
          <LuLoader className="h-3 w-3 animate-spin" />
          <span className="font-mono text-[10px]">Loading cardio data…</span>
        </div>
      ) : isError || !cardio ? (
        <div className="flex items-center gap-3 py-1">
          <span className="font-mono text-[10px] text-dash-tertiary">No cardio data</span>
          {canFetchCardio && (
            <button
              onClick={handleFetch}
              disabled={fetchCardio.isPending}
              className="inline-flex items-center gap-1 rounded-full border border-dash-success/30 bg-dash-success/[0.06] px-2.5 py-1 text-[9px] font-bold text-dash-success transition-all hover:border-dash-success/50"
            >
              <LuRefreshCw className="h-2.5 w-2.5" />
              Fetch
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {cardio.avg_heart_rate != null && (
              <div className="flex items-center gap-1.5">
                <LuHeart className="h-3 w-3 text-dash-danger/70" />
                <span className="font-mono text-[10px] text-dash-tertiary">Avg HR</span>
                <span className="font-mono text-xs font-semibold text-dash-primary">
                  {Math.round(cardio.avg_heart_rate)} bpm
                </span>
              </div>
            )}
            {cardio.cardio_load != null && (
              <div className="flex items-center gap-1.5">
                <LuZap className="h-3 w-3 text-dash-warning" />
                <span className="font-mono text-[10px] text-dash-tertiary">Cardio load</span>
                <span className="font-mono text-xs font-semibold text-dash-primary">
                  {cardio.cardio_load}
                </span>
              </div>
            )}
            {cardio.active_zone_minutes != null && (
              <div className="flex items-center gap-1.5">
                <LuTimer className="h-3 w-3 text-dash-success" />
                <span className="font-mono text-[10px] text-dash-tertiary">AZM</span>
                <span className="font-mono text-xs font-semibold text-dash-primary">
                  {Math.round(cardio.active_zone_minutes)} min
                </span>
              </div>
            )}
            {cardio.calories_kcal != null && (
              <div className="flex items-center gap-1.5">
                <LuFlame className="h-3 w-3 text-dash-warning/80" />
                <span className="font-mono text-[10px] text-dash-tertiary">kcal</span>
                <span className="font-mono text-xs font-semibold text-dash-primary">
                  {Math.round(cardio.calories_kcal)}
                </span>
              </div>
            )}
            {cardio.steps != null && (
              <div className="flex items-center gap-1.5">
                <LuFootprints className="h-3 w-3 text-dash-secondary" />
                <span className="font-mono text-[10px] text-dash-tertiary">Steps</span>
                <span className="font-mono text-xs font-semibold text-dash-primary">
                  {cardio.steps}
                </span>
              </div>
            )}
          </div>
          {cardio.heart_rate_zones && <HrZoneBar zones={cardio.heart_rate_zones} />}
        </div>
      )}
    </div>
  );
}

export default function RunningModule() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editRun, setEditRun] = useState<Run | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  const { data: runs, isLoading: runsLoading } = useRuns();
  const { data: stats } = useRunStats();
  const createRun = useCreateRun();
  const updateRun = useUpdateRun();
  const deleteRun = useDeleteRun();

  const latestRun = runs?.[0] ?? null;
  const visibleRuns = runs ? runs.slice(0, visibleCount) : [];
  const { data: latestCardio, isLoading: latestCardioLoading } = useRunCardio(
    latestRun?.id ?? null,
  );
  const fetchCardio = useFetchRunCardio();
  const canFetchCardio = useCanFetchCardio();

  const handleSave = (data: RunFormData) => {
    if (editRun) {
      const updateData: RunUpdate = {};
      if (data.start_time !== editRun.start_time) updateData.start_time = data.start_time;
      if (data.distance_km !== editRun.distance_km) updateData.distance_km = data.distance_km;
      if (data.duration_minutes !== editRun.duration_minutes)
        updateData.duration_minutes = data.duration_minutes;
      if (data.location !== editRun.location) updateData.location = data.location;
      if (data.temperature !== editRun.temperature) updateData.temperature = data.temperature;
      if (data.perceived_effort !== editRun.perceived_effort)
        updateData.perceived_effort = data.perceived_effort;
      updateRun.mutate(
        { id: editRun.id, ...updateData },
        {
          onSuccess: () => {
            setModalOpen(false);
            setEditRun(null);
          },
        },
      );
    } else {
      createRun.mutate(data as RunCreate, {
        onSuccess: () => {
          setModalOpen(false);
          setEditRun(null);
        },
      });
    }
  };

  const handleDelete = () => {
    if (!editRun) return;
    deleteRun.mutate(editRun.id, {
      onSuccess: () => {
        setModalOpen(false);
        setEditRun(null);
      },
    });
  };

  const openAdd = () => {
    setEditRun(null);
    setModalOpen(true);
  };

  const openEdit = (run: Run) => {
    setEditRun(run);
    setModalOpen(true);
  };

  const isMutating = createRun.isPending || updateRun.isPending || deleteRun.isPending;

  const chartData = useMemo(() => {
    if (!runs) return { data: [], kmhMin: 0, kmhMax: 10 };
    const data = [...runs]
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(-10)
      .map((r) => ({
        name: formatShortDate(r.start_time),
        km: Math.round(r.distance_km * 10) / 10,
        kmh: Math.round(formatSpeed(r.distance_km, r.duration_minutes) * 10) / 10,
      }));
    const kmhVals = data.map((d) => d.kmh);
    const kmhMin = kmhVals.length > 0 ? Math.floor(Math.min(...kmhVals) - 1) : 0;
    const kmhMax = kmhVals.length > 0 ? Math.ceil(Math.max(...kmhVals) + 1) : 10;
    return { data, kmhMin, kmhMax };
  }, [runs]);

  const tableBlock = (
    <GlassCard>
      <span className="mb-3 block font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
        Recent runs
      </span>
      {runsLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-white/[0.04]" />
          ))}
        </div>
      ) : runs && runs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="pb-2 pr-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                  Date
                </th>
                <th className="pb-2 pr-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                  km
                </th>
                <th className="pb-2 pr-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                  Duration
                </th>
                <th className="pb-2 pr-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                  Pace
                </th>
                <th className="pb-2 pr-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                  Location
                </th>
                <th className="pb-2 pr-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                  °C
                </th>
                <th className="pb-2 pr-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                  Effort
                </th>
                <th className="pb-2 pr-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                  Cardio
                </th>
                <th className="pb-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary"></th>
              </tr>
            </thead>
            <tbody>
              {visibleRuns.map((run) => {
                const isExpanded = expandedRunId === run.id;
                return (
                  <Fragment key={run.id}>
                    <tr className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-2 font-mono text-xs tabular-nums text-dash-primary whitespace-nowrap">
                        {formatDateTime(run.start_time)}
                      </td>
                      <td className="py-2.5 pr-2 font-mono text-xs tabular-nums text-dash-secondary whitespace-nowrap">
                        {run.distance_km.toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-2 font-mono text-xs tabular-nums text-dash-secondary whitespace-nowrap">
                        {formatDuration(run.duration_minutes)}
                      </td>
                      <td className="py-2.5 pr-2 font-mono text-xs font-semibold tabular-nums text-dash-success whitespace-nowrap">
                        {formatPace(run.distance_km, run.duration_minutes)}
                      </td>
                      <td className="py-2.5 pr-2 font-mono text-xs text-dash-secondary whitespace-nowrap">
                        {runLocationIcon(run.location)} {run.location}
                      </td>
                      <td className="py-2.5 pr-2 font-mono text-xs tabular-nums text-dash-secondary whitespace-nowrap">
                        {run.temperature != null ? `${run.temperature.toFixed(1)}°` : "-"}
                      </td>
                      <td className="py-2.5 pr-2 font-mono text-xs tabular-nums whitespace-nowrap">
                        {run.perceived_effort != null ? (
                          <span style={{ color: EFFORT_COLORS[run.perceived_effort] ?? "#76746E" }}>
                            {run.perceived_effort}
                          </span>
                        ) : (
                          <span className="text-dash-tertiary">-</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-2">
                        <button
                          onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                          className="rounded p-1 text-dash-tertiary transition-colors hover:text-dash-primary"
                          title="Cardio details"
                        >
                          {isExpanded ? (
                            <LuChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <LuChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5">
                        <button
                          onClick={() => openEdit(run)}
                          className="rounded p-1 text-dash-tertiary transition-colors hover:text-dash-primary"
                        >
                          <LuPenLine className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-white/[0.03]">
                        <td colSpan={9} className="p-0">
                          <RunCardioRow runId={run.id} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="font-mono text-xs text-dash-tertiary">No runs logged yet.</p>
      )}
      {runs && visibleCount < runs.length && (
        <button
          onClick={() => setVisibleCount((c) => Math.min(c + 10, runs.length))}
          className="mt-3 w-full rounded-xl border border-dashed border-dash-success/30 bg-dash-success/[0.04] px-4 py-2.5 font-mono text-[11px] font-bold text-dash-success transition-all hover:border-dash-success/50 hover:bg-dash-success/[0.08]"
        >
          Show more ({runs.length - visibleCount})
        </button>
      )}
    </GlassCard>
  );

  const chartBlock = (
    <GlassCard>
      <span className="mb-3 block font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
        Distance & speed
      </span>
      {runsLoading ? (
        <div className="h-48 animate-pulse rounded bg-white/[0.04]" />
      ) : chartData.data.length > 0 ? (
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={chartData.data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="kmhGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6878C0" />
                <stop offset="100%" stopColor="#3840A0" />
              </linearGradient>
              <linearGradient id="kmGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D0708A" />
                <stop offset="100%" stopColor="#8E2A55" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#76746E", fontFamily: "monospace" }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: "#76746E", fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[chartData.kmhMin, chartData.kmhMax]}
              tick={{ fontSize: 10, fill: "#76746E", fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0C0C0D",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                fontSize: "12px",
                fontFamily: "monospace",
                color: "#FAFAFA",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "10px", fontFamily: "monospace", color: "#B8B6B0" }}
            />
            <Bar
              yAxisId="left"
              dataKey="km"
              name="km"
              fill="url(#kmGradient)"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="kmh"
              name="km/h"
              fill="url(#kmhGradient)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="font-mono text-xs text-dash-tertiary">No data for the chart yet.</p>
      )}
    </GlassCard>
  );

  return (
    <>
      <div className="space-y-4">
        {stats && stats.total_runs > 0 && (
          <p className="font-mono text-sm text-dash-secondary">
            Avg pace{" "}
            <span className="text-base font-semibold text-dash-success tabular-nums">
              {formatPaceFromDecimal(stats.avg_pace_min_per_km)}
            </span>
            <span className="text-dash-tertiary"> min/km</span>
            <span className="text-dash-tertiary">
              {" "}
              over {stats.total_runs} {stats.total_runs === 1 ? "run" : "runs"}
            </span>
          </p>
        )}

        <button
          onClick={openAdd}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-dash-success/30 bg-dash-success/[0.04] px-4 py-3 text-[11px] font-bold text-dash-success transition-all hover:border-dash-success/50 hover:bg-dash-success/[0.08]"
        >
          <LuPlus className="h-3.5 w-3.5" />
          Log run
        </button>

        {latestRun && (
          <GlassCard>
            <div className="flex items-center justify-between">
              <span className="block font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
                Cardio data: last run
              </span>
              {latestRun.start_time && (
                <span className="font-mono text-[10px] text-dash-tertiary">
                  {formatShortDate(latestRun.start_time)}
                </span>
              )}
            </div>

            {latestCardioLoading || fetchCardio.isPending ? (
              <div className="flex items-center gap-2 text-dash-tertiary py-4 mt-2">
                <LuLoader className="h-3.5 w-3.5 animate-spin" />
                <span className="font-mono text-[10px]">Loading cardio data…</span>
              </div>
            ) : latestCardio ? (
              <div className="mt-3 space-y-2.5">
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {latestCardio.avg_heart_rate != null && (
                    <div className="flex items-center gap-1.5">
                      <LuHeart className="h-3.5 w-3.5 text-dash-danger/70" />
                      <span className="font-mono text-[10px] text-dash-tertiary">
                        Avg heart rate
                      </span>
                      <span className="font-mono text-sm font-semibold text-dash-primary">
                        {Math.round(latestCardio.avg_heart_rate)} bpm
                      </span>
                    </div>
                  )}
                  {latestCardio.cardio_load != null && (
                    <div className="flex items-center gap-1.5">
                      <LuZap className="h-3.5 w-3.5 text-dash-warning" />
                      <span className="font-mono text-[10px] text-dash-tertiary">Cardio load</span>
                      <span className="font-mono text-sm font-semibold text-dash-primary">
                        {latestCardio.cardio_load}
                      </span>
                    </div>
                  )}
                  {latestCardio.active_zone_minutes != null && (
                    <div className="flex items-center gap-1.5">
                      <LuTimer className="h-3.5 w-3.5 text-dash-success" />
                      <span className="font-mono text-[10px] text-dash-tertiary">
                        Active zone minutes
                      </span>
                      <span className="font-mono text-sm font-semibold text-dash-primary">
                        {Math.round(latestCardio.active_zone_minutes)} min
                      </span>
                    </div>
                  )}
                  {latestCardio.calories_kcal != null && (
                    <div className="flex items-center gap-1.5">
                      <LuFlame className="h-3.5 w-3.5 text-dash-warning/80" />
                      <span className="font-mono text-[10px] text-dash-tertiary">Calories</span>
                      <span className="font-mono text-sm font-semibold text-dash-primary">
                        {Math.round(latestCardio.calories_kcal)} kcal
                      </span>
                    </div>
                  )}
                  {latestCardio.steps != null && (
                    <div className="flex items-center gap-1.5">
                      <LuFootprints className="h-3.5 w-3.5 text-dash-secondary" />
                      <span className="font-mono text-[10px] text-dash-tertiary">Steps</span>
                      <span className="font-mono text-sm font-semibold text-dash-primary">
                        {latestCardio.steps}
                      </span>
                    </div>
                  )}
                </div>
                {latestCardio.heart_rate_zones && (
                  <div>
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                      Heart rate zones
                    </span>
                    <HrZoneBar zones={latestCardio.heart_rate_zones} />
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[10px] text-dash-tertiary">No cardio data yet</span>
                {canFetchCardio && (
                  <button
                    onClick={() => fetchCardio.mutate(latestRun.id)}
                    disabled={fetchCardio.isPending}
                    className="inline-flex items-center gap-1 rounded-full border border-dash-success/30 bg-dash-success/[0.06] px-3 py-1.5 text-[10px] font-bold text-dash-success transition-all hover:border-dash-success/50"
                  >
                    <LuRefreshCw className="h-3 w-3" />
                    Fetch
                  </button>
                )}
              </div>
            )}
          </GlassCard>
        )}

        {tableBlock}
        {chartBlock}
      </div>

      <RunFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditRun(null);
        }}
        onSave={handleSave}
        onDelete={editRun ? handleDelete : undefined}
        isPending={isMutating}
        editRun={editRun}
      />
    </>
  );
}
