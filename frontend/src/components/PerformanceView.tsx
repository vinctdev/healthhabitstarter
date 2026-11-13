import { useState } from "react";
import {
  LuCircleCheck,
  LuLoader,
  LuCircleX,
  LuCircleMinus,
  LuInfo,
  LuMoon,
  LuThermometer,
  LuWind,
  LuHeart,
  LuHeartPulse,
  LuActivity,
  LuGauge,
  LuFootprints,
} from "react-icons/lu";
import {
  useHealthStatus,
  useHealthSleep,
  useHealthSleepAverages,
  useDailyMetrics,
} from "../hooks/useHealth";
import { getActiveDate, parseUtc } from "../utils/date";
import DayNavigation from "./DayNavigation";
import GlassCard from "./ui/GlassCard";
import EnergyCurve from "./EnergyCurve";
import type { SleepStageSegment, SleepSessionData } from "../types";

function utcToLocalTime(utcStr: string | null): string {
  if (!utcStr) return "--:--";
  return parseUtc(utcStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function formatMinutesShort(ms: number): string {
  const h = Math.floor(ms / 60);
  const m = ms % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

const STAGE_COLORS: Record<string, string> = {
  AWAKE: "#fb923c",
  LIGHT: "#38bdf8",
  DEEP: "#4f46e5",
  REM: "#a78bfa",
  ASLEEP: "#38bdf8",
  RESTLESS: "#f2c063",
};

const STAGE_LABELS: Record<string, string> = {
  AWAKE: "Awake",
  LIGHT: "Light",
  DEEP: "Deep",
  REM: "REM",
  ASLEEP: "Asleep",
  RESTLESS: "Restless",
};

const STAGE_ORDER = ["DEEP", "REM", "LIGHT", "AWAKE"] as const;

function SleepTimeline({
  stages,
  totalMinutes,
  startTimeUtc,
  endTimeUtc,
}: {
  stages: SleepStageSegment[];
  totalMinutes: number;
  startTimeUtc: string | null;
  endTimeUtc: string | null;
}) {
  if (!stages.length || totalMinutes <= 0) return null;

  const sorted = [...stages].sort(
    (a, b) => parseUtc(a.start_time_utc).getTime() - parseUtc(b.start_time_utc).getTime(),
  );

  const filled: Array<{ type: string; startMs: number; endMs: number; isGap: boolean }> = [];
  for (let i = 0; i < sorted.length; i++) {
    const segStart = parseUtc(sorted[i].start_time_utc).getTime();
    const segEnd = parseUtc(sorted[i].end_time_utc).getTime();
    if (filled.length > 0) {
      const prev = filled[filled.length - 1];
      if (segStart - prev.endMs > 60000) {
        filled.push({ type: "AWAKE", startMs: prev.endMs, endMs: segStart, isGap: true });
      }
    }
    filled.push({ type: sorted[i].type, startMs: segStart, endMs: segEnd, isGap: false });
  }

  const overallStartMs = startTimeUtc ? parseUtc(startTimeUtc).getTime() : filled[0].startMs;
  const overallEndMs = endTimeUtc
    ? parseUtc(endTimeUtc).getTime()
    : filled[filled.length - 1].endMs;

  const hourMarkers: Array<{ hour: number; pct: number }> = [];
  const firstFullHour = Math.ceil(overallStartMs / 3600000) * 3600000;
  const lastFullHour = Math.floor(overallEndMs / 3600000) * 3600000;
  for (let t = firstFullHour; t <= lastFullHour; t += 3600000) {
    const pct = ((t - overallStartMs) / (overallEndMs - overallStartMs)) * 100;
    if (pct >= 0 && pct <= 100) {
      hourMarkers.push({ hour: ((new Date(t).getHours() % 24) + 24) % 24, pct });
    }
  }

  return (
    <div className="mt-4">
      <div className="relative">
        <div className="relative h-6 w-full">
          {hourMarkers.map((m, i) => (
            <div
              key={`tick-${i}`}
              className="absolute top-0 h-1.5 w-px bg-dash-tertiary/40"
              style={{ left: `${m.pct}%` }}
            />
          ))}
          <div className="absolute inset-0 overflow-hidden rounded-full bg-white/[0.05]">
            {filled.map((seg, i) => {
              const segMinutes = (seg.endMs - seg.startMs) / 60000;
              const widthPct = Math.max(0.5, (segMinutes / totalMinutes) * 100);
              const color = STAGE_COLORS[seg.type] || STAGE_COLORS.AWAKE;

              const leftPct = filled.slice(0, i).reduce((acc, s) => {
                const ms = (s.endMs - s.startMs) / 60000;
                return acc + (ms / totalMinutes) * 100;
              }, 0);

              return (
                <div
                  key={i}
                  className="absolute inset-y-0 transition-opacity hover:opacity-80"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: color,
                    opacity: seg.isGap ? 0.3 : 1,
                  }}
                  title={
                    seg.isGap
                      ? `Gap: ${formatMinutesShort(Math.round(segMinutes))}`
                      : `${STAGE_LABELS[seg.type] || seg.type}: ${formatMinutesShort(Math.round(segMinutes))}`
                  }
                />
              );
            })}
          </div>
        </div>
        <div className="relative mt-1 h-4">
          {hourMarkers.map((m, i) => {
            const label = `${String(m.hour).padStart(2, "0")}:00`;
            return (
              <span
                key={`label-${i}`}
                className="absolute font-mono text-[10px] text-dash-tertiary -translate-x-1/2"
                style={{ left: `${m.pct}%` }}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {STAGE_ORDER.map((type) => (
          <span
            key={type}
            className="flex items-center gap-1.5 font-mono text-[10px] text-dash-tertiary"
          >
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: STAGE_COLORS[type] }}
            />
            {STAGE_LABELS[type]}
          </span>
        ))}
      </div>
    </div>
  );
}

function StageBreakdown({ data, totalMinutes }: { data: SleepSessionData; totalMinutes: number }) {
  const items = [
    {
      label: "Deep",
      minutes: data.minutes_deep,
      type: "DEEP" as const,
      color: STAGE_COLORS.DEEP,
      pct: totalMinutes > 0 ? Math.round((data.minutes_deep / totalMinutes) * 100) : 0,
    },
    {
      label: "REM",
      minutes: data.minutes_rem,
      type: "REM" as const,
      color: STAGE_COLORS.REM,
      pct: totalMinutes > 0 ? Math.round((data.minutes_rem / totalMinutes) * 100) : 0,
    },
    {
      label: "Light",
      minutes: data.minutes_light,
      type: "LIGHT" as const,
      color: STAGE_COLORS.LIGHT,
      pct: totalMinutes > 0 ? Math.round((data.minutes_light / totalMinutes) * 100) : 0,
    },
    {
      label: "Awake",
      minutes: data.minutes_awake,
      type: "AWAKE" as const,
      color: STAGE_COLORS.AWAKE,
      pct: totalMinutes > 0 ? Math.round((data.minutes_awake / totalMinutes) * 100) : 0,
    },
  ];

  return (
    <div className="mt-5 space-y-2.5">
      {items.map((item) => (
        <div key={item.type} className="flex items-center gap-3">
          <span className="w-12 font-mono text-[11px] text-dash-tertiary">{item.label}</span>
          <span className="w-14 text-right font-mono text-[11px] text-dash-secondary">
            {formatMinutesShort(item.minutes)}
          </span>
          <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(1, item.pct)}%`, backgroundColor: item.color }}
            />
          </div>
          <span className="w-8 text-right font-mono text-[10px] text-dash-tertiary">
            {item.pct}%
          </span>
        </div>
      ))}
    </div>
  );
}

const PROVIDER_LABELS: Record<string, string> = { google: "Google Health", demo: "Demo data" };

function providerLabel(provider: string) {
  return PROVIDER_LABELS[provider] ?? provider;
}

function NoTrackerHint() {
  return (
    <GlassCard>
      <div className="flex items-start gap-3">
        <LuInfo className="mt-0.5 h-4 w-4 shrink-0 text-dash-tertiary" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-dash-secondary">No health tracker connected</p>
          <p className="text-xs leading-relaxed text-dash-tertiary">
            Sleep, readiness and daily metrics come from a tracker. Set{" "}
            <code className="font-mono">HEALTH_PROVIDER</code> in your{" "}
            <code className="font-mono">.env</code>: <code className="font-mono">google</code> for
            Fitbit or Pixel Watch (see <code className="font-mono">docs/google-health.md</code>), or{" "}
            <code className="font-mono">demo</code> to try the app with generated data.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

export default function PerformanceView() {
  const [selectedDate, setSelectedDate] = useState(getActiveDate());
  const { data: status, isLoading: statusLoading } = useHealthStatus();
  const {
    data: sleepData,
    isLoading: sleepLoading,
    isError: sleepError,
  } = useHealthSleep(selectedDate);
  const { data: averages } = useHealthSleepAverages();
  const { data: dailyMetrics } = useDailyMetrics(selectedDate);

  const hasSleepData = sleepData && sleepData.start_time_utc;
  const totalMinutes = sleepData?.minutes_in_sleep_period || 0;

  const avgMins = Math.round(averages?.avg_minutes_asleep ?? 0);
  const pctChange =
    avgMins > 0 && sleepData
      ? Math.round(((sleepData.minutes_asleep - avgMins) / avgMins) * 100)
      : 0;

  return (
    <>
      <div className="mb-2 flex items-start justify-between">
        <h1
          className="text-[22px] font-bold leading-tight tracking-tight max-[480px]:text-[22px] sm:text-[28px]"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #C7C4BC 120%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Performance
        </h1>
        <div className="flex items-center gap-1.5 pt-1">
          {statusLoading ? (
            <LuLoader className="h-3.5 w-3.5 animate-spin text-dash-tertiary" />
          ) : !status || status.provider === "none" ? (
            <>
              <LuCircleMinus className="h-3.5 w-3.5 text-dash-tertiary" />
              <span className="font-mono text-[11px] tracking-[0.08em] text-dash-tertiary">
                No tracker connected
              </span>
            </>
          ) : status.connected ? (
            <>
              <LuCircleCheck className="h-3.5 w-3.5 text-dash-success" />
              <span className="font-mono text-[11px] tracking-[0.08em] text-dash-success">
                {status.provider === "demo"
                  ? "Demo data"
                  : `${providerLabel(status.provider)}: connected`}
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1.5" title={status.error ?? undefined}>
              <LuCircleX className="h-3.5 w-3.5 text-dash-warning" />
              <span className="font-mono text-[11px] tracking-[0.08em] text-dash-warning">
                {providerLabel(status.provider)}: disconnected
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <DayNavigation selectedDate={selectedDate} onDateChange={setSelectedDate} />
      </div>

      <div className="flex flex-col gap-4">
        {status?.provider === "none" && <NoTrackerHint />}

        <EnergyCurve date={selectedDate} />

        <GlassCard>
          <div className="flex items-center gap-3">
            <LuMoon className="h-5 w-5 text-dash-secondary" />
            <h2 className="text-sm font-semibold text-dash-secondary">Sleep analysis</h2>
          </div>

          <div className="mt-5">
            {sleepLoading ? (
              <div className="flex items-center gap-3 text-dash-tertiary py-6">
                <LuLoader className="h-4 w-4 animate-spin" />
                <span className="font-mono text-xs uppercase tracking-[0.12em]">
                  Loading sleep data…
                </span>
              </div>
            ) : sleepError ? (
              <div className="flex items-center gap-3 text-dash-danger py-4">
                <LuCircleX className="h-4 w-4" />
                <span className="font-mono text-xs">Failed to load sleep data</span>
              </div>
            ) : !hasSleepData ? (
              <div className="py-6 text-center">
                <p className="font-mono text-xs text-dash-tertiary">No sleep data for this day</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-6">
                  <div className="text-center">
                    <div className="font-mono text-3xl font-bold text-dash-primary">
                      {sleepData.sleep_index}
                    </div>
                    <div className="font-mono text-[10px] text-dash-tertiary tracking-wider">
                      / 100
                    </div>
                    <div className="mt-1 font-mono text-[9px] text-dash-tertiary uppercase tracking-[0.1em]">
                      Index
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div>
                      <span className="font-mono text-[11px] text-dash-tertiary">Duration </span>
                      <span className="font-mono text-sm font-semibold text-dash-primary">
                        {formatDuration(sleepData.minutes_asleep)}
                      </span>
                      {avgMins > 0 && pctChange !== 0 && (
                        <span
                          className={`ml-2 font-mono text-[10px] ${
                            pctChange > 0 ? "text-dash-success" : "text-dash-warning"
                          }`}
                        >
                          {pctChange > 0 ? "▲" : "▼"} {Math.abs(pctChange)}%{" "}
                          {pctChange > 0 ? "above" : "below"} avg ({formatDuration(avgMins)})
                        </span>
                      )}
                      {avgMins > 0 && pctChange === 0 && (
                        <span className="ml-2 font-mono text-[10px] text-dash-tertiary">
                          ≈ avg ({formatDuration(avgMins)})
                        </span>
                      )}
                      <span className="ml-1 font-mono text-[11px] text-dash-tertiary">
                        (in bed {formatDuration(totalMinutes)})
                      </span>
                    </div>
                    <div>
                      <span className="font-mono text-[11px] text-dash-tertiary">
                        {utcToLocalTime(sleepData.start_time_utc)}
                        {" - "}
                        {utcToLocalTime(sleepData.end_time_utc)}
                      </span>
                    </div>
                    {sleepData.minutes_to_fall_asleep != null &&
                      sleepData.minutes_to_fall_asleep > 0 && (
                        <div>
                          <span className="font-mono text-[11px] text-dash-tertiary">
                            Time to fall asleep{" "}
                          </span>
                          <span className="font-mono text-xs text-dash-secondary">
                            {sleepData.minutes_to_fall_asleep}min
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                <SleepTimeline
                  stages={sleepData.stages}
                  totalMinutes={totalMinutes}
                  startTimeUtc={sleepData.start_time_utc}
                  endTimeUtc={sleepData.end_time_utc}
                />

                <StageBreakdown data={sleepData} totalMinutes={totalMinutes} />

                {(sleepData.skin_temperature_celsius != null ||
                  sleepData.respiratory_rate_avg != null ||
                  sleepData.avg_heart_rate != null) && (
                  <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.04] pt-4">
                    {sleepData.skin_temperature_celsius != null && (
                      <div className="flex items-center gap-2">
                        <LuThermometer className="h-3.5 w-3.5 text-dash-tertiary" />
                        <span className="font-mono text-[11px] text-dash-tertiary">
                          Skin temp.{" "}
                        </span>
                        <span className="font-mono text-xs font-semibold text-dash-primary">
                          avg {sleepData.skin_temperature_celsius.toFixed(1)}°C
                        </span>
                        {sleepData.baseline_temperature_celsius != null && (
                          <span className="font-mono text-[10px] text-dash-tertiary">
                            (Baseline {sleepData.baseline_temperature_celsius.toFixed(1)}°C)
                          </span>
                        )}
                      </div>
                    )}
                    {sleepData.respiratory_rate_avg != null && (
                      <div className="flex items-center gap-2">
                        <LuWind className="h-3.5 w-3.5 text-dash-tertiary" />
                        <span className="font-mono text-[11px] text-dash-tertiary">
                          Breathing rate{" "}
                        </span>
                        <span className="font-mono text-xs font-semibold text-dash-primary">
                          avg {sleepData.respiratory_rate_avg.toFixed(1)}/min
                        </span>
                      </div>
                    )}
                    {sleepData.avg_heart_rate != null && (
                      <div className="flex items-center gap-2">
                        <LuHeart className="h-3.5 w-3.5 text-dash-tertiary" />
                        <span className="font-mono text-[11px] text-dash-tertiary">
                          Heart rate{" "}
                        </span>
                        <span className="font-mono text-xs font-semibold text-dash-primary">
                          avg {sleepData.avg_heart_rate.toFixed(1)} bpm
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </GlassCard>

        {dailyMetrics && (
          <GlassCard>
            <div className="flex items-center gap-3">
              <LuActivity className="h-5 w-5 text-dash-secondary" />
              <h2 className="text-sm font-semibold text-dash-secondary">Readiness</h2>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
              {dailyMetrics.resting_heart_rate != null && (
                <div className="flex items-center gap-2">
                  <LuHeartPulse className="h-3.5 w-3.5 text-dash-tertiary" />
                  <span className="font-mono text-[11px] text-dash-tertiary">Resting HR </span>
                  <span className="font-mono text-xs font-semibold text-dash-primary">
                    avg {dailyMetrics.resting_heart_rate} bpm
                  </span>
                </div>
              )}
              {dailyMetrics.hrv_rmssd != null && (
                <div className="flex items-center gap-2">
                  <LuActivity className="h-3.5 w-3.5 text-dash-tertiary" />
                  <span className="font-mono text-[11px] text-dash-tertiary">HRV </span>
                  <span className="font-mono text-xs font-semibold text-dash-primary">
                    avg {dailyMetrics.hrv_rmssd} ms
                  </span>
                </div>
              )}
              {dailyMetrics.spo2_avg != null && (
                <div className="flex items-center gap-2">
                  <LuGauge className="h-3.5 w-3.5 text-dash-tertiary" />
                  <span className="font-mono text-[11px] text-dash-tertiary">SpO2 </span>
                  <span className="font-mono text-xs font-semibold text-dash-primary">
                    avg {dailyMetrics.spo2_avg.toFixed(1)}%
                  </span>
                  {dailyMetrics.spo2_low != null && (
                    <span className="font-mono text-[10px] text-dash-tertiary">
                      min {dailyMetrics.spo2_low.toFixed(1)}%
                    </span>
                  )}
                </div>
              )}
              {dailyMetrics.steps != null && (
                <div className="flex items-center gap-2">
                  <LuFootprints className="h-3.5 w-3.5 text-dash-tertiary" />
                  <span className="font-mono text-[11px] text-dash-tertiary">Steps </span>
                  <span className="font-mono text-xs font-semibold text-dash-primary">
                    {dailyMetrics.steps}
                  </span>
                </div>
              )}
            </div>
          </GlassCard>
        )}
      </div>
    </>
  );
}
