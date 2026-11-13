import { useState } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { LuZap, LuLoader, LuCircleX, LuChevronRight, LuChevronDown } from "react-icons/lu";
import { useEnergyCurve } from "../hooks/useHealth";
import GlassCard from "./ui/GlassCard";
import type { EnergyCurveData } from "../types";

const INFLUENCE_LABELS: Record<string, string> = {
  caffeine: "Caffeine",
  sugar_spike: "Sugar spike",
  sugar_crash: "Sugar crash",
  meal_dip: "Large meal",
  hard_exercise_drop: "Exercise (hard)",
  hard_exercise_base_drain: "Exercise (after-effect)",
  light_exercise_boost: "Exercise (light)",
  manual: "Manual adjustment",
};

function influenceLabel(type: string): string {
  return INFLUENCE_LABELS[type] ?? type;
}

function scoreTone(score: number | null): string {
  if (score == null) return "text-dash-tertiary";
  if (score >= 55) return "text-dash-success";
  if (score <= 45) return "text-dash-danger";
  return "text-dash-secondary";
}

function magnitudeTone(magnitude: number): string {
  if (magnitude > 0) return "text-dash-success";
  if (magnitude < 0) return "text-dash-danger";
  return "text-dash-tertiary";
}

function formatHour(h: number): string {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h - Math.floor(h)) * 60);
  return `${pad(hh)}:${pad(mm)}`;
}

function formatRange(start: number, end: number): string {
  const startLabel = formatHour(start);
  if (end > start) return `${startLabel}-${formatHour(end)}`;
  return startLabel;
}

const pad = (n: number) => String(n).padStart(2, "0");

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function getVisibleHours(wake: number, bed: number): number[] {
  const normalizedBed = bed >= 24 ? 24 : bed;
  const awakeH = normalizedBed > wake ? normalizedBed - wake : 24 - wake + normalizedBed;
  if (awakeH + 2 >= 24) {
    return Array.from({ length: 24 }, (_, i) => i);
  }

  const effectiveBed = bed >= 23 ? 23 : bed;
  const start = (wake - 1 + 24) % 24;
  let end = effectiveBed + 1;
  if (end > 23) end = 23;

  const hours: number[] = [];
  if (start <= end) {
    for (let h = start; h <= end; h++) hours.push(h);
    return hours;
  }
  for (let h = start; h < 24; h++) hours.push(h);
  for (let h = 0; h <= end; h++) hours.push(h);
  return hours;
}

function CurveChart({
  data,
  isToday,
  currentHourLabel,
}: {
  data: EnergyCurveData;
  isToday: boolean;
  currentHourLabel: string | null;
}) {
  const visibleHours = getVisibleHours(data.wake_hour, data.bed_hour);
  const chartData = visibleHours.map((h) => ({
    hour: h,
    label: `${pad(h)}:00`,
    energy: data.curve[h].energy,
    baseline: data.baseline_curve[h].energy,
  }));

  const peakSummary = data.peak_windows
    .map((w) => `${String(w.start).padStart(2, "0")}:00-${String(w.end).padStart(2, "0")}:00`)
    .join(", ");

  const activeAreas: { x1: string; x2: string }[] = [];
  if (data.wake_hour <= data.bed_hour) {
    const endH = data.bed_hour >= 24 ? 23 : data.bed_hour;
    activeAreas.push({ x1: `${pad(data.wake_hour)}:00`, x2: `${pad(endH)}:00` });
  } else {
    activeAreas.push({ x1: "00:00", x2: `${pad(data.bed_hour)}:00` });
    activeAreas.push({ x1: `${pad(data.wake_hour)}:00`, x2: "23:00" });
  }

  return (
    <>
      <div className="mt-4 -mb-1">
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={chartData} margin={{ top: 5, right: 18, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                <stop offset="25%" stopColor="#3b82f6" stopOpacity={0.45} />
                <stop offset="25%" stopColor="#eab308" stopOpacity={0.35} />
                <stop offset="60%" stopColor="#eab308" stopOpacity={0.25} />
                <stop offset="60%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#76746E", fontFamily: "monospace" }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
              interval={2}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#76746E", fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              width={35}
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
              formatter={(value, name) => [`${value}%`, name === "baseline" ? "Ideal" : "Energy"]}
              labelFormatter={(label) => `${label}`}
            />
            {activeAreas.map((a, i) => (
              <ReferenceArea
                key={`active-${i}`}
                x1={a.x1}
                x2={a.x2}
                fill="rgba(255,255,255,0.04)"
                fillOpacity={1}
              />
            ))}
            {data.peak_windows.map((w, i) => (
              <ReferenceArea
                key={`peak-${i}`}
                x1={`${String(w.start).padStart(2, "0")}:00`}
                x2={`${String(w.end).padStart(2, "0")}:00`}
                fill="#22c55e"
                fillOpacity={0.06}
              />
            ))}
            {isToday && currentHourLabel && (
              <ReferenceLine
                x={currentHourLabel}
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                label={{
                  value: "Now",
                  position: "top",
                  fill: "#3b82f6",
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="#444"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="energy"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#energyGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data.peak_windows.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <span className="font-mono text-[10px] text-dash-tertiary uppercase tracking-[0.1em]">
            Productivity window
          </span>
          <span className="font-mono text-xs font-semibold text-dash-success">{peakSummary}</span>
        </div>
      )}
      {data.peak_windows.length === 0 && (
        <div className="mt-2 flex items-center gap-2">
          <span className="font-mono text-[10px] text-dash-tertiary uppercase tracking-[0.1em]">
            Productivity window
          </span>
          <span className="font-mono text-xs text-dash-tertiary">
            No energy peak &gt; 70% today
          </span>
        </div>
      )}
    </>
  );
}

function WhyDrivers({ data }: { data: EnergyCurveData }) {
  const [open, setOpen] = useState(false);
  const components = data.readiness_breakdown.components;
  const influences = [...data.influences].sort((a, b) => a.start_h - b.start_h);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 font-mono text-[10px] text-dash-tertiary uppercase tracking-[0.1em] transition-colors hover:text-dash-secondary"
      >
        {open ? <LuChevronDown className="h-3 w-3" /> : <LuChevronRight className="h-3 w-3" />}
        Why?
      </button>

      {open && (
        <div className="mt-3 space-y-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <div>
            <div className="mb-2 font-mono text-[9px] text-dash-tertiary uppercase tracking-[0.1em]">
              Readiness signals
            </div>
            <div className="mb-2 font-mono text-[10px] text-dash-tertiary">
              Weighted average of the available signals (score 0-100 × weight)
            </div>
            <div className="space-y-1.5">
              {components.map((c) => (
                <div key={c.key} className="flex items-baseline gap-2">
                  <span className="w-28 shrink-0 font-mono text-[11px] text-dash-secondary">
                    {c.label}
                  </span>
                  <span
                    className={`w-10 shrink-0 text-right font-mono text-[11px] font-semibold ${scoreTone(c.score)}`}
                  >
                    {c.available && c.score != null ? fmtNum(c.score) : "-"}
                  </span>
                  <span className="w-12 shrink-0 text-right font-mono text-[10px] text-dash-tertiary">
                    {c.share != null ? `× ${fmtNum(c.share)}%` : ""}
                  </span>
                  <span className="flex-1 font-mono text-[10px] text-dash-tertiary">
                    {c.detail ?? (c.available ? "" : "no data")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {influences.length > 0 && (
            <div className="border-t border-white/[0.05] pt-3">
              <div className="mb-2 font-mono text-[9px] text-dash-tertiary uppercase tracking-[0.1em]">
                Curve influences
              </div>
              <div className="space-y-1.5">
                {influences.map((inf, i) => {
                  const sign = inf.magnitude > 0 ? "+" : "";
                  const endSign = (inf.end_magnitude ?? 0) > 0 ? "+" : "";
                  const note = [inf.description, inf.recommendation].filter(Boolean).join(" · ");
                  return (
                    <div key={i} className="flex items-baseline gap-2">
                      <span className="w-28 shrink-0 font-mono text-[10px] text-dash-tertiary">
                        {formatRange(inf.start_h, inf.end_h)}
                      </span>
                      <span className="w-32 shrink-0 font-mono text-[11px] text-dash-secondary">
                        {influenceLabel(inf.type)}
                      </span>
                      <span
                        className={`w-24 shrink-0 text-right font-mono text-[11px] font-semibold ${magnitudeTone(inf.magnitude)}`}
                      >
                        {sign}
                        {fmtNum(inf.magnitude)}%
                        {inf.end_magnitude != null && (
                          <span className="text-dash-tertiary">
                            {" \u2192 "}
                            {endSign}
                            {fmtNum(inf.end_magnitude)}%
                          </span>
                        )}
                      </span>
                      <span className="flex-1 font-mono text-[10px] text-dash-tertiary">
                        {note}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EnergyCurve({ date }: { date: string }) {
  const { data, isLoading, isError } = useEnergyCurve(date);

  if (isLoading) {
    return (
      <GlassCard>
        <div className="flex items-center gap-3">
          <LuZap className="h-5 w-5 text-dash-secondary" />
          <h2 className="text-sm font-semibold text-dash-secondary">Peak tracker</h2>
        </div>
        <div className="mt-5 flex items-center gap-3 text-dash-tertiary py-6">
          <LuLoader className="h-4 w-4 animate-spin" />
          <span className="font-mono text-xs uppercase tracking-[0.12em]">
            Calculating energy curve…
          </span>
        </div>
      </GlassCard>
    );
  }

  if (isError || !data) {
    return (
      <GlassCard>
        <div className="flex items-center gap-3">
          <LuZap className="h-5 w-5 text-dash-secondary" />
          <h2 className="text-sm font-semibold text-dash-secondary">Peak tracker</h2>
        </div>
        <div className="mt-5 flex items-center gap-3 text-dash-danger py-4">
          <LuCircleX className="h-4 w-4" />
          <span className="font-mono text-xs">Failed to load the energy curve</span>
        </div>
      </GlassCard>
    );
  }

  const isToday = date === new Date().toISOString().slice(0, 10);
  const currentHourLabel = isToday ? `${pad(new Date().getHours())}:00` : null;

  return (
    <GlassCard>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LuZap className="h-5 w-5 text-dash-secondary" />
          <h2 className="text-sm font-semibold text-dash-secondary">Peak tracker</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[9px] text-dash-tertiary">
          {data.readiness_breakdown.components.map((c) => (
            <span
              key={c.key}
              className={c.available ? "" : "opacity-50"}
              title={c.detail ?? "No data"}
            >
              {c.label}:{" "}
              {c.available && c.score != null ? (
                <span className="text-dash-primary">{fmtNum(c.score)}</span>
              ) : (
                <span className="text-dash-tertiary">-</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-6">
        <div className="text-center">
          <div className="font-mono text-3xl font-bold text-dash-primary">
            {data.readiness_score ?? "-"}
          </div>
          <div className="font-mono text-[10px] text-dash-tertiary tracking-wider">/ 100</div>
          <div className="mt-1 font-mono text-[9px] text-dash-tertiary uppercase tracking-[0.1em]">
            Readiness
          </div>
          {data.readiness_score == null ? (
            <div className="mt-1 font-mono text-[9px] text-dash-warning">no data</div>
          ) : data.readiness_breakdown.coverage_pct < 100 ? (
            <div className="mt-1 font-mono text-[9px] text-dash-tertiary">
              Data coverage {fmtNum(data.readiness_breakdown.coverage_pct)}%
            </div>
          ) : null}
        </div>
        <div className="flex-1" />
      </div>

      <WhyDrivers data={data} />

      <CurveChart data={data} isToday={isToday} currentHourLabel={currentHourLabel} />
    </GlassCard>
  );
}
