import { useState, useMemo } from "react";
import { LuPlus, LuPenLine, LuSettings } from "react-icons/lu";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
} from "recharts";
import GlassCard from "./ui/GlassCard";
import BodyMeasurementModal from "./BodyMeasurementModal";
import BodyProfileModal from "./BodyProfileModal";
import { GENDER_OPTIONS } from "./bodyOptions";
import type { BodyMeasurementFormData } from "./BodyMeasurementModal";
import type { BodyProfileFormData } from "./BodyProfileModal";
import {
  useBodyProfile,
  useCreateBodyProfile,
  useUpdateBodyProfile,
  useBodyMeasurements,
  useCreateBodyMeasurement,
  useUpdateBodyMeasurement,
  useDeleteBodyMeasurement,
} from "../hooks/useBodyMetrics";
import type { BodyMeasurement, BodyMeasurementCreate, BodyMeasurementUpdate } from "../types";

const BMI_SCALE_MIN = 15;
const BMI_SCALE_MAX = 35;

const BMI_ZONES: { max: number; label: string; color: string }[] = [
  { max: 18.5, label: "Underweight", color: "#6878C0" },
  { max: 25, label: "Normal weight", color: "#6BE3A4" },
  { max: Infinity, label: "Overweight", color: "#FF6B6B" },
];

function getBmiClass(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  return "Overweight";
}

function getBmiClassColor(bmi: number): string {
  if (bmi < 18.5) return "#6878C0";
  if (bmi < 25) return "#6BE3A4";
  return "#FF6B6B";
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDelta(current: number, previous: number): { text: string; color: string } {
  const pct = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  const abs = Math.abs(pct);
  const sign = pct > 0 ? `↑${abs.toFixed(1)}` : pct < 0 ? `↓${abs.toFixed(1)}` : `±0`;
  const color = pct > 0 ? "#FF6B6B" : pct < 0 ? "#6BE3A4" : "#76746E";
  return { text: `${sign}%`, color };
}

function getBmiScaleGradient(): string {
  const total = BMI_SCALE_MAX - BMI_SCALE_MIN;
  const u1 = ((18.5 - BMI_SCALE_MIN) / total) * 100;
  const u2 = ((25 - BMI_SCALE_MIN) / total) * 100;
  return `linear-gradient(to right, #6878C0 0%, #6878C0 ${u1}%, #6BE3A4 ${u1}%, #6BE3A4 ${u2}%, #FF6B6B ${u2}%, #FF6B6B 100%)`;
}

function getBmiMarkerPosition(bmi: number): number {
  const clamped = Math.max(BMI_SCALE_MIN, Math.min(BMI_SCALE_MAX, bmi));
  return ((clamped - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * 100;
}

interface MeasurementRow {
  id: number;
  date: string;
  weight_kg: number;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  bmi: number;
  deltaFromPrev: { text: string; color: string } | null;
  deltaFromYear: { text: string; color: string } | null;
}

function computeMeasurementRows(measurements: BodyMeasurement[]): MeasurementRow[] {
  const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date));

  const rows: MeasurementRow[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const cur = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;
    const deltaFromPrev = prev ? formatDelta(cur.weight_kg, prev.weight_kg) : null;

    // Δ 12M: against the oldest earlier measurement within the year before this row.
    const yearBefore = `${Number(cur.date.slice(0, 4)) - 1}${cur.date.slice(4)}`;
    const yearRef = sorted.slice(0, i).find((m) => m.date >= yearBefore);
    const yearWeight = yearRef?.weight_kg ?? null;
    const deltaFromYear = yearWeight != null ? formatDelta(cur.weight_kg, yearWeight) : null;

    rows.push({
      id: cur.id,
      date: cur.date,
      weight_kg: cur.weight_kg,
      body_fat_pct: cur.body_fat_pct,
      muscle_mass_kg: cur.muscle_mass_kg,
      bmi: cur.bmi,
      deltaFromPrev,
      deltaFromYear,
    });
  }
  return rows;
}

export default function BodyView() {
  const [measurementModalOpen, setMeasurementModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editMeasurement, setEditMeasurement] = useState<BodyMeasurement | null>(null);

  const { data: profile, isLoading: profileLoading } = useBodyProfile();
  const { data: measurements, isLoading: measurementsLoading } = useBodyMeasurements();

  const createProfile = useCreateBodyProfile();
  const updateProfile = useUpdateBodyProfile();
  const createMeasurement = useCreateBodyMeasurement();
  const updateMeasurement = useUpdateBodyMeasurement();
  const deleteMeasurement = useDeleteBodyMeasurement();

  const isMutatingProfile = createProfile.isPending || updateProfile.isPending;

  const measurementRows = useMemo(
    () => (measurements ? computeMeasurementRows(measurements) : []),
    [measurements],
  );

  const handleSaveProfile = (data: BodyProfileFormData) => {
    if (profile) {
      updateProfile.mutate(data, {
        onSuccess: () => setProfileModalOpen(false),
      });
    } else {
      createProfile.mutate(data, {
        onSuccess: () => setProfileModalOpen(false),
      });
    }
  };

  const handleSaveMeasurement = (data: BodyMeasurementFormData) => {
    if (editMeasurement) {
      const updateData: BodyMeasurementUpdate = {};
      if (data.date !== editMeasurement.date) updateData.date = data.date;
      if (data.weight_kg !== editMeasurement.weight_kg) updateData.weight_kg = data.weight_kg;
      if (data.body_fat_pct !== editMeasurement.body_fat_pct)
        updateData.body_fat_pct = data.body_fat_pct;
      if (data.muscle_mass_kg !== editMeasurement.muscle_mass_kg)
        updateData.muscle_mass_kg = data.muscle_mass_kg;
      updateMeasurement.mutate(
        { id: editMeasurement.id, ...updateData },
        {
          onSuccess: () => {
            setMeasurementModalOpen(false);
            setEditMeasurement(null);
          },
        },
      );
    } else {
      createMeasurement.mutate(data as BodyMeasurementCreate, {
        onSuccess: () => {
          setMeasurementModalOpen(false);
          setEditMeasurement(null);
        },
      });
    }
  };

  const handleDeleteMeasurement = () => {
    if (!editMeasurement) return;
    deleteMeasurement.mutate(editMeasurement.id, {
      onSuccess: () => {
        setMeasurementModalOpen(false);
        setEditMeasurement(null);
      },
    });
  };

  const openAddMeasurement = () => {
    setEditMeasurement(null);
    setMeasurementModalOpen(true);
  };

  const openEditMeasurement = (m: BodyMeasurement) => {
    setEditMeasurement(m);
    setMeasurementModalOpen(true);
  };

  const isMutatingMeasurement =
    createMeasurement.isPending || updateMeasurement.isPending || deleteMeasurement.isPending;

  const chartData = useMemo(() => {
    if (!measurements) return [];
    return [...measurements]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({
        date: formatShortDate(m.date),
        weight: m.weight_kg,
        bodyFat: m.body_fat_pct ?? undefined,
      }));
  }, [measurements]);

  const bmiZones = useMemo(() => {
    if (!profile) return null;
    const h = profile.height_cm / 100;
    return {
      underweight: Math.round(18.5 * h * h * 10) / 10,
      overweight: Math.round(25 * h * h * 10) / 10,
    };
  }, [profile]);

  const weightRange = useMemo(() => {
    if (!chartData.length) return { min: 50, max: 100 };
    const vals = chartData.map((d) => d.weight);
    const min = Math.floor(Math.min(...vals) - 5);
    const max = Math.ceil(Math.max(...vals) + 5);
    return { min, max };
  }, [chartData]);

  const bodyFatRange = useMemo(() => {
    const vals = chartData.map((d) => d.bodyFat).filter((v): v is number => v != null);
    if (!vals.length) return { min: 5, max: 40 };
    return {
      min: Math.floor(Math.min(...vals) - 2),
      max: Math.ceil(Math.max(...vals) + 2),
    };
  }, [chartData]);

  const latestMeasurement = measurements && measurements.length > 0 ? measurements[0] : null;
  const bmiColor = latestMeasurement ? getBmiClassColor(latestMeasurement.bmi) : "#76746E";
  const bmiMarkerPct = latestMeasurement ? getBmiMarkerPosition(latestMeasurement.bmi) : 0;

  if (profileLoading) {
    return (
      <div className="space-y-4">
        <h1
          className="text-[22px] font-bold leading-tight tracking-tight sm:text-[28px]"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #C7C4BC 120%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Body & Measurements
        </h1>
        <div className="h-32 animate-pulse rounded-xl bg-white/[0.04]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <h1
          className="text-[22px] font-bold leading-tight tracking-tight sm:text-[28px]"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #C7C4BC 120%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Body & Measurements
        </h1>

        <GlassCard>
          <span className="mb-3 block font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
            Set up profile
          </span>
          <p className="mb-4 font-mono text-xs text-dash-secondary">
            Enter your basic data to start tracking.
          </p>
          <button
            onClick={() => setProfileModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-dash-success/30 bg-dash-success/[0.04] px-4 py-3 text-[11px] font-bold text-dash-success transition-all hover:border-dash-success/50 hover:bg-dash-success/[0.08]"
          >
            <LuPlus className="h-3.5 w-3.5" />
            Set up profile
          </button>
        </GlassCard>

        <BodyProfileModal
          open={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          onSave={handleSaveProfile}
          isPending={isMutatingProfile}
          profile={null}
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="mb-[14px] flex items-center justify-between">
          <h1
            className="text-[22px] font-bold leading-tight tracking-tight max-[480px]:text-[22px] sm:text-[28px]"
            style={{
              background: "linear-gradient(180deg, #FFFFFF 0%, #C7C4BC 120%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Body & Measurements
          </h1>
          <button
            onClick={() => setProfileModalOpen(true)}
            className="rounded-full p-2 text-dash-tertiary transition-colors hover:text-dash-secondary"
            title="Edit profile"
          >
            <LuSettings className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </button>
        </div>

        {/* Compact profile row */}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
          <div className="flex items-baseline gap-2 font-mono text-xs text-dash-secondary">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-dash-tertiary">
              Profile
            </span>
            <span className="text-dash-primary">{profile.height_cm}&thinsp;cm</span>
            <span className="text-dash-tertiary">·</span>
            <span className="text-dash-primary">{profile.age}&thinsp;y</span>
            <span className="text-dash-tertiary">·</span>
            <span className="text-dash-primary">
              {GENDER_OPTIONS.find((g) => g.value === profile.gender)?.label ?? profile.gender}
            </span>
            {profile.occupation && (
              <>
                <span className="text-dash-tertiary">·</span>
                <span className="text-dash-primary">{profile.occupation}</span>
              </>
            )}
          </div>
          <button
            onClick={() => setProfileModalOpen(true)}
            className="rounded p-1 text-dash-tertiary transition-colors hover:text-dash-secondary"
          >
            <LuPenLine className="h-3 w-3" />
          </button>
        </div>

        <button
          onClick={openAddMeasurement}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-dash-success/30 bg-dash-success/[0.04] px-4 py-3 text-[11px] font-bold text-dash-success transition-all hover:border-dash-success/50 hover:bg-dash-success/[0.08]"
        >
          <LuPlus className="h-3.5 w-3.5" />
          Log measurement
        </button>

        {/* Table with delta columns */}
        <GlassCard>
          <span className="mb-3 block font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
            Measurements
          </span>
          {measurementsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-white/[0.04]" />
              ))}
            </div>
          ) : measurementRows.length > 0 ? (
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="pb-2 pr-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                      Date
                    </th>
                    <th className="pb-2 pr-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                      Weight
                    </th>
                    <th className="pb-2 pr-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                      Δ
                    </th>
                    <th className="pb-2 pr-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                      Δ 12M
                    </th>
                    <th className="pb-2 pr-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                      BMI
                    </th>
                    <th className="pb-2 pr-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                      Body fat
                    </th>
                    <th className="pb-2 pr-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary">
                      Muscle
                    </th>
                    <th className="pb-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-dash-tertiary"></th>
                  </tr>
                </thead>
                <tbody>
                  {measurementRows.map((m) => (
                    <tr key={m.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-1 font-mono text-xs tabular-nums text-dash-primary whitespace-nowrap">
                        {formatDate(m.date)}
                      </td>
                      <td className="py-2.5 pr-1 font-mono text-xs tabular-nums text-dash-secondary whitespace-nowrap">
                        {m.weight_kg.toFixed(1)} kg
                      </td>
                      <td
                        className="py-2.5 pr-1 font-mono text-[10px] tabular-nums whitespace-nowrap"
                        style={{ color: m.deltaFromPrev?.color ?? "#76746E" }}
                      >
                        {m.deltaFromPrev?.text ?? "-"}
                      </td>
                      <td
                        className="py-2.5 pr-1 font-mono text-[10px] tabular-nums whitespace-nowrap"
                        style={{ color: m.deltaFromYear?.color ?? "#76746E" }}
                      >
                        {m.deltaFromYear?.text ?? "-"}
                      </td>
                      <td
                        className="py-2.5 pr-1 font-mono text-xs font-semibold tabular-nums whitespace-nowrap"
                        style={{ color: getBmiClassColor(m.bmi) }}
                      >
                        {m.bmi.toFixed(1)}
                      </td>
                      <td className="py-2.5 pr-1 font-mono text-xs tabular-nums text-dash-secondary whitespace-nowrap">
                        {m.body_fat_pct != null ? `${m.body_fat_pct.toFixed(1)} %` : "-"}
                      </td>
                      <td className="py-2.5 pr-1 font-mono text-xs tabular-nums text-dash-secondary whitespace-nowrap">
                        {m.muscle_mass_kg != null ? `${m.muscle_mass_kg.toFixed(1)} kg` : "-"}
                      </td>
                      <td className="py-2.5">
                        <button
                          onClick={() => {
                            const original = measurements?.find((x) => x.id === m.id);
                            if (original) openEditMeasurement(original);
                          }}
                          className="rounded p-1 text-dash-tertiary transition-colors hover:text-dash-primary"
                        >
                          <LuPenLine className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="font-mono text-xs text-dash-tertiary">No measurements logged yet.</p>
          )}
        </GlassCard>

        {/* Compact BMI with scale bar */}
        {latestMeasurement && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-tertiary">
                BMI
              </span>
              <span className="font-mono text-xs text-dash-tertiary">
                {getBmiClass(latestMeasurement.bmi)}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span
                className="font-mono text-2xl font-bold tabular-nums"
                style={{ color: bmiColor }}
              >
                {latestMeasurement.bmi.toFixed(1)}
              </span>
              <div className="relative flex-1">
                <div
                  className="h-1.5 w-full rounded-full"
                  style={{ background: getBmiScaleGradient() }}
                />
                <div
                  className="absolute -top-[3px] h-[7px] w-0.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.4)]"
                  style={{ left: `${bmiMarkerPct}%` }}
                />
              </div>
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[9px] text-dash-tertiary">
              <span>{BMI_ZONES[0].label}</span>
              <span>{BMI_ZONES[1].label}</span>
              <span>{BMI_ZONES[2].label}</span>
            </div>
          </div>
        )}

        {/* Chart */}
        <GlassCard>
          <span className="mb-3 block font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-dash-tertiary">
            Weight & body fat
          </span>
          {measurementsLoading ? (
            <div className="h-48 animate-pulse rounded bg-white/[0.04]" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D0708A" />
                    <stop offset="100%" stopColor="#8E2A55" />
                  </linearGradient>
                  <linearGradient id="bodyFatGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6878C0" />
                    <stop offset="100%" stopColor="#3840A0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#76746E", fontFamily: "monospace" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  domain={[weightRange.min, weightRange.max]}
                  tick={{ fontSize: 10, fill: "#76746E", fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[bodyFatRange.min, bodyFatRange.max]}
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
                {bmiZones && (
                  <>
                    <ReferenceArea
                      yAxisId="left"
                      y1={0}
                      y2={bmiZones.underweight}
                      fill="rgba(104,120,192,0.06)"
                      label={{
                        value: "Underweight",
                        position: "insideTopLeft",
                        fontSize: 9,
                        fontFamily: "monospace",
                        fill: "#6878C0",
                      }}
                    />
                    <ReferenceArea
                      yAxisId="left"
                      y1={bmiZones.underweight}
                      y2={bmiZones.overweight}
                      fill="rgba(107,227,164,0.06)"
                      label={{
                        value: "Normal",
                        position: "insideTopLeft",
                        fontSize: 9,
                        fontFamily: "monospace",
                        fill: "#6BE3A4",
                      }}
                    />
                    <ReferenceArea
                      yAxisId="left"
                      y1={bmiZones.overweight}
                      y2={weightRange.max}
                      fill="rgba(255,107,107,0.06)"
                      label={{
                        value: "Overweight",
                        position: "insideTopLeft",
                        fontSize: 9,
                        fontFamily: "monospace",
                        fill: "#FF6B6B",
                      }}
                    />
                  </>
                )}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="weight"
                  name="Weight (kg)"
                  stroke="url(#weightGradient)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#D0708A" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="bodyFat"
                  name="Body fat (%)"
                  stroke="url(#bodyFatGradient)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#6878C0" }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="font-mono text-xs text-dash-tertiary">No data for the chart yet.</p>
          )}
        </GlassCard>
      </div>

      <BodyProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onSave={handleSaveProfile}
        isPending={isMutatingProfile}
        profile={profile}
      />

      <BodyMeasurementModal
        open={measurementModalOpen}
        onClose={() => {
          setMeasurementModalOpen(false);
          setEditMeasurement(null);
        }}
        onSave={handleSaveMeasurement}
        onDelete={editMeasurement ? handleDeleteMeasurement : undefined}
        isPending={isMutatingMeasurement}
        editData={editMeasurement}
      />
    </>
  );
}
