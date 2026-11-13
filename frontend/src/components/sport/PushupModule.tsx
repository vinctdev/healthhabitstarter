import { useState } from "react";
import { LuPlus, LuPenLine } from "react-icons/lu";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import GlassCard from "../ui/GlassCard";
import PushupFormModal from "./PushupFormModal";
import { PUSHUP_VARIANTS } from "./pushupVariants";
import {
  usePushupEntries,
  usePushupStats,
  usePushupSeries,
  useCreatePushup,
  useUpdatePushup,
  useDeletePushup,
} from "../../hooks/usePushups";
import type {
  PushupEntry,
  PushupEntryCreate,
  PushupEntryUpdate,
  PushupGranularity,
} from "../../types";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

const MAX_VISIBLE_ENTRIES = 20;
const BUCKETS_BY_GRANULARITY: Record<PushupGranularity, number> = {
  day: 14,
  week: 12,
  month: 12,
};

export default function PushupModule() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<PushupEntry | null>(null);
  const [granularity, setGranularity] = useState<PushupGranularity>("week");
  const [visibleCount, setVisibleCount] = useState(6);

  const { data: entries, isLoading: entriesLoading } = usePushupEntries();
  const { data: stats, isLoading: statsLoading } = usePushupStats();
  const buckets = BUCKETS_BY_GRANULARITY[granularity];
  const { data: series, isLoading: seriesLoading } = usePushupSeries(granularity, buckets);
  const createPushup = useCreatePushup();
  const updatePushup = useUpdatePushup();
  const deletePushup = useDeletePushup();

  const isMutating = createPushup.isPending || updatePushup.isPending || deletePushup.isPending;
  const visibleEntries = entries ? entries.slice(0, visibleCount) : [];

  const handleSave = (data: PushupEntryCreate) => {
    if (editEntry) {
      const updateData: PushupEntryUpdate = {};
      if (data.date !== editEntry.date) updateData.date = data.date;
      if ((data.time ?? null) !== (editEntry.time ?? null)) updateData.time = data.time;
      const newReps = JSON.stringify(data.variant_reps);
      const oldReps = JSON.stringify(editEntry.variant_reps);
      if (newReps !== oldReps) updateData.variant_reps = data.variant_reps;
      if ((data.notes ?? null) !== (editEntry.notes ?? null)) updateData.notes = data.notes;
      updatePushup.mutate(
        { id: editEntry.id, ...updateData },
        {
          onSuccess: () => {
            setModalOpen(false);
            setEditEntry(null);
          },
        },
      );
    } else {
      createPushup.mutate(data, {
        onSuccess: () => {
          setModalOpen(false);
          setEditEntry(null);
        },
      });
    }
  };

  const handleDelete = () => {
    if (!editEntry) return;
    deletePushup.mutate(editEntry.id, {
      onSuccess: () => {
        setModalOpen(false);
        setEditEntry(null);
      },
    });
  };

  const openAdd = () => {
    setEditEntry(null);
    setModalOpen(true);
  };

  const openEdit = (entry: PushupEntry) => {
    setEditEntry(entry);
    setModalOpen(true);
  };

  const breakdown =
    (granularity === "day"
      ? stats?.breakdown_today
      : granularity === "week"
        ? stats?.breakdown_week
        : stats?.breakdown_month) ?? [];
  const breakdownTotal = breakdown.reduce((sum, item) => sum + item.reps, 0);
  const breakdownMax = Math.max(1, ...breakdown.map((b) => b.reps));
  const periodLabel =
    granularity === "day" ? "today" : granularity === "week" ? "this week" : "this month";
  const chartData = (series?.buckets ?? []).map((bucket) => ({
    name: bucket.label,
    reps: bucket.reps,
  }));

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: stats?.total_reps ?? 0 },
            { label: "This week", value: stats?.reps_this_week ?? 0 },
            { label: "This month", value: stats?.reps_this_month ?? 0 },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-3 text-center"
            >
              <div className="font-mono text-lg font-bold tabular-nums text-dash-success">
                {item.value}
              </div>
              <div className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={openAdd}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-dash-success/30 bg-dash-success/[0.04] px-4 py-3 text-[11px] font-bold text-dash-success transition-all hover:border-dash-success/50 hover:bg-dash-success/[0.08]"
        >
          <LuPlus className="h-3.5 w-3.5" />
          Log push-ups
        </button>

        <GlassCard>
          <div className="flex items-center justify-between">
            <span className="block font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
              Variants
            </span>
            <span className="font-mono text-[10px] text-dash-tertiary">{periodLabel}</span>
          </div>
          {statsLoading ? (
            <div className="mt-3 h-20 animate-pulse rounded bg-white/[0.04]" />
          ) : breakdownTotal > 0 ? (
            <div className="mt-3 space-y-2.5">
              {PUSHUP_VARIANTS.map((meta) => {
                const item = breakdown.find((b) => b.variant === meta.key);
                const reps = item?.reps ?? 0;
                const pct = (reps / breakdownMax) * 100;
                return (
                  <div key={meta.key}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-dash-secondary">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.label}
                        <span className="text-[10px] text-dash-tertiary">{meta.focus}</span>
                      </span>
                      <span className="font-mono text-[11px] font-semibold tabular-nums text-dash-primary">
                        {reps} reps
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: meta.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 font-mono text-xs text-dash-tertiary">
              No push-up data in this period.
            </p>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <span className="block font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
              Progress (reps)
            </span>
            <div className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] p-0.5">
              {(["day", "week", "month"] as PushupGranularity[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] transition-all ${
                    granularity === g
                      ? "bg-dash-success/20 text-dash-success"
                      : "text-dash-tertiary hover:text-dash-secondary"
                  }`}
                >
                  {g === "day" ? "Day" : g === "week" ? "Week" : "Month"}
                </button>
              ))}
            </div>
          </div>
          {seriesLoading ? (
            <div className="mt-3 h-52 animate-pulse rounded bg-white/[0.04]" />
          ) : chartData.length > 0 ? (
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="pushupGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6BE3A4" />
                      <stop offset="100%" stopColor="#2E8B57" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: "#76746E", fontFamily: "monospace" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#76746E", fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
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
                    formatter={(value) => [`${value} reps`, "Reps"]}
                  />
                  <Bar
                    dataKey="reps"
                    name="Reps"
                    fill="url(#pushupGradient)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-3 font-mono text-xs text-dash-tertiary">No data for the chart yet.</p>
          )}
        </GlassCard>

        <GlassCard>
          <span className="mb-3 block font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
            Recent entries
          </span>
          {entriesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-white/[0.04]" />
              ))}
            </div>
          ) : entries && entries.length > 0 ? (
            <div className="space-y-1.5">
              {visibleEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 font-mono text-xs tabular-nums text-dash-secondary">
                      {formatDate(entry.date)}
                      {entry.time && <span className="ml-1 text-dash-tertiary">{entry.time}</span>}
                    </span>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-dash-primary">
                      {entry.total_reps}
                      <span className="ml-0.5 text-[10px] font-normal text-dash-tertiary">
                        reps
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1">
                      {PUSHUP_VARIANTS.map((meta) => {
                        const reps = entry.variant_reps[meta.key];
                        if (!reps) return null;
                        return (
                          <span
                            key={meta.key}
                            className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold"
                            style={{ color: meta.color, backgroundColor: `${meta.color}1f` }}
                          >
                            {meta.label} {reps}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => openEdit(entry)}
                    className="shrink-0 rounded p-1 text-dash-tertiary transition-colors hover:text-dash-primary"
                  >
                    <LuPenLine className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono text-xs text-dash-tertiary">No push-ups logged yet.</p>
          )}
          {entries && visibleCount < Math.min(MAX_VISIBLE_ENTRIES, entries.length) && (
            <button
              onClick={() =>
                setVisibleCount((c) => Math.min(c + 6, MAX_VISIBLE_ENTRIES, entries.length))
              }
              className="mt-3 w-full rounded-xl border border-dashed border-dash-success/30 bg-dash-success/[0.04] px-4 py-2.5 font-mono text-[11px] font-bold text-dash-success transition-all hover:border-dash-success/50 hover:bg-dash-success/[0.08]"
            >
              Show more ({Math.min(MAX_VISIBLE_ENTRIES, entries.length) - visibleCount})
            </button>
          )}
        </GlassCard>
      </div>

      <PushupFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditEntry(null);
        }}
        onSave={handleSave}
        onDelete={editEntry ? handleDelete : undefined}
        isPending={isMutating}
        editEntry={editEntry}
      />
    </>
  );
}
