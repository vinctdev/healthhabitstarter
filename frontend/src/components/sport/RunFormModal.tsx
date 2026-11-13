import { useState, useEffect } from "react";
import { LuX, LuTrash2 } from "react-icons/lu";
import type { Run } from "../../types";
import { RUN_LOCATIONS, isIndoorLocation } from "./runLocations";

interface RunFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: RunFormData) => void;
  onDelete?: () => void;
  isPending: boolean;
  editRun?: Run | null;
}

export interface RunFormData {
  start_time: string;
  distance_km: number;
  duration_minutes: number;
  location: string;
  temperature: number | null;
  perceived_effort: number | null;
}

function toLocalDatetimeString(iso: string): string {
  return iso.slice(0, 16);
}

// Plausible pace range in min/km. Keep in sync with backend/app/routers/runs.py.
const MIN_PACE = 2;
const MAX_PACE = 30;

/** Local date and time as "YYYY-MM-DDTHH:MM", the format of datetime-local inputs. */
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Today 18:00, or now if that is still in the future. */
function getDefaultDatetime(): string {
  const now = new Date();
  const evening = new Date(now);
  evening.setHours(18, 0, 0, 0);
  return toDatetimeLocal(evening < now ? evening : now);
}

function formatPace(distanceKm: number, durationMin: number): string {
  if (!distanceKm || !durationMin || distanceKm <= 0 || durationMin <= 0) return "--:--";
  const pace = durationMin / distanceKm;
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${String(secs).padStart(2, "0")} min/km`;
}

const EFFORT_COLORS = [
  "#6BE3A4",
  "#6BE3A4",
  "#A3E65C",
  "#F2C063",
  "#F2C063",
  "#F28B4B",
  "#FF6B6B",
  "#FF6B6B",
  "#E04040",
  "#CC1111",
];

export default function RunFormModal({
  open,
  onClose,
  onSave,
  onDelete,
  isPending,
  editRun,
}: RunFormModalProps) {
  const [startTime, setStartTime] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [durationSec, setDurationSec] = useState("");
  const [location, setLocation] = useState(RUN_LOCATIONS[0].value);
  const [temperature, setTemperature] = useState("");
  const [effort, setEffort] = useState(0);

  const isEdit = !!editRun;

  useEffect(() => {
    if (editRun) {
      setStartTime(toLocalDatetimeString(editRun.start_time));
      setDistanceKm(String(editRun.distance_km));
      setDurationMin(String(Math.floor(editRun.duration_minutes)));
      const secs = Math.round((editRun.duration_minutes % 1) * 60);
      setDurationSec(secs > 0 ? String(secs) : "");
      setLocation(editRun.location);
      setTemperature(editRun.temperature != null ? String(editRun.temperature) : "");
      setEffort(editRun.perceived_effort ?? 0);
    } else {
      setStartTime(getDefaultDatetime());
      setDistanceKm("");
      setDurationMin("");
      setDurationSec("");
      setLocation(RUN_LOCATIONS[0].value);
      setTemperature("");
      setEffort(0);
    }
  }, [editRun, open]);

  if (!open) return null;

  const dist = parseFloat(distanceKm) || 0;
  const dur = (parseFloat(durationMin) || 0) + (parseFloat(durationSec) || 0) / 60;
  const pace = dist > 0 && dur > 0 ? dur / dist : null;
  const nowLocal = toDatetimeLocal(new Date());
  const validationError =
    startTime > nowLocal
      ? "Start time is in the future"
      : pace !== null && (pace < MIN_PACE || pace > MAX_PACE)
        ? `Pace must be between ${MIN_PACE}:00 and ${MAX_PACE}:00 min/km`
        : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || pace === null || validationError) return;

    const utcDate = new Date(startTime);
    const utcIso =
      utcDate.getFullYear() +
      "-" +
      String(utcDate.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(utcDate.getDate()).padStart(2, "0") +
      "T" +
      String(utcDate.getHours()).padStart(2, "0") +
      ":" +
      String(utcDate.getMinutes()).padStart(2, "0") +
      ":00";

    onSave({
      start_time: utcIso,
      distance_km: dist,
      duration_minutes: dur,
      location,
      temperature: temperature ? parseFloat(temperature) : null,
      perceived_effort: effort > 0 ? effort : null,
    });
  };

  const effortLabels: Record<string, string> = {
    "1": "Very easy",
    "2": "Easy",
    "3": "Moderate",
    "4": "Somewhat hard",
    "5": "Hard",
    "6": "Quite hard",
    "7": "Very hard",
    "8": "Extremely hard",
    "9": "Almost maximal",
    "10": "Maximal",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#0C0C0D] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dash-primary">{isEdit ? "Edit run" : "Log run"}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-dash-tertiary transition-colors hover:text-dash-primary"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Start time
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              max={nowLocal}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-[10px] font-mono text-sm text-dash-primary focus:border-dash-success focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
                Distance (km)
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                placeholder="5.2"
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-[10px] font-mono text-sm text-dash-primary focus:border-dash-success focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
                Duration
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    placeholder="min"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-[10px] font-mono text-sm text-dash-primary focus:border-dash-success focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="59"
                    value={durationSec}
                    onChange={(e) => setDurationSec(e.target.value)}
                    placeholder="s"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-[10px] font-mono text-sm text-dash-primary focus:border-dash-success focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {validationError ? (
            <div className="rounded-lg bg-dash-danger/10 px-3 py-2 text-center">
              <span className="font-mono text-xs text-dash-danger">{validationError}</span>
            </div>
          ) : (
            pace !== null && (
              <div className="rounded-lg bg-dash-success/10 px-3 py-2 text-center">
                <span className="font-mono text-xs text-dash-success">
                  Pace: {formatPace(dist, dur)}
                </span>
              </div>
            )
          )}

          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-[10px] font-mono text-sm text-dash-primary focus:border-dash-success focus:outline-none"
            >
              {RUN_LOCATIONS.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.icon} {loc.value}
                </option>
              ))}
            </select>
          </div>

          {!isIndoorLocation(location) && (
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
                Temperature (°C){" "}
                <span className="font-normal italic text-dash-tertiary">(optional)</span>
              </label>
              <input
                type="number"
                step="0.5"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="e.g. 14"
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-[10px] font-mono text-sm text-dash-primary focus:border-dash-success focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 flex items-baseline justify-between font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              <span>
                Effort <span className="font-normal italic text-dash-tertiary">(optional)</span>
              </span>
              {effort > 0 && (
                <span style={{ color: EFFORT_COLORS[effort - 1] }}>
                  {effort} - {effortLabels[effort]}
                </span>
              )}
            </label>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-dash-tertiary">1</span>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={effort}
                onChange={(e) => setEffort(Number(e.target.value))}
                className="w-full accent-dash-success"
              />
              <span className="font-mono text-[10px] text-dash-tertiary">10</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-full border border-dash-danger/30 bg-dash-danger/10 px-4 py-[11px] text-[11px] font-bold text-dash-danger transition-all hover:bg-dash-danger/20"
              >
                <LuTrash2 className="inline h-4 w-4 -mt-0.5 mr-1" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-5 py-[11px] text-[11px] font-bold text-dash-primary transition-all hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || pace === null || !!validationError}
              className="flex-1 rounded-full bg-gradient-to-b from-white to-[#E8E5DD] px-5 py-[11px] text-[11px] font-bold text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-px hover:brightness-110 disabled:opacity-50"
            >
              {isPending ? "Saving…" : isEdit ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
