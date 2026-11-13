import { useState } from "react";
import { LuX, LuDownload } from "react-icons/lu";
import { foodApi } from "../api/food";
import { getActiveDate } from "../utils/date";

interface FoodExportModalProps {
  open: boolean;
  onClose: () => void;
}

function formatYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return formatYYYYMMDD(d);
}

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return formatYYYYMMDD(d);
}

function firstOfMonth(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return formatYYYYMMDD(new Date(d.getFullYear(), d.getMonth(), 1));
}

export default function FoodExportModal({ open, onClose }: FoodExportModalProps) {
  const today = getActiveDate();
  const [start, setStart] = useState(() => addDays(today, -6));
  const [end, setEnd] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const applyPreset = (startDate: string, endDate: string) => {
    setStart(startDate);
    setEnd(endDate);
    setError(null);
  };

  const handleExport = async () => {
    if (start > end) {
      setError("Start date is after the end date.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await foodApi.exportFood(start, end);
      const blob = new Blob([res.content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      setError("Export failed.");
    } finally {
      setLoading(false);
    }
  };

  const presets = [
    { label: "7 days", start: addDays(today, -6), end: today },
    { label: "14 days", start: addDays(today, -13), end: today },
    { label: "30 days", start: addDays(today, -29), end: today },
    { label: "This week", start: mondayOf(today), end: today },
    { label: "This month", start: firstOfMonth(today), end: today },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#0C0C0D] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dash-primary">Export (Markdown)</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-dash-tertiary transition-colors hover:text-dash-primary"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <span className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Presets
            </span>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.start, p.end)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] font-bold text-dash-primary transition-all hover:bg-white/10"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
                From
              </label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded bg-white/[0.08] px-2 py-2 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
                To
              </label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded bg-white/[0.08] px-2 py-2 font-mono text-xs text-dash-primary focus:outline-none focus:ring-1 focus:ring-dash-success"
              />
            </div>
          </div>

          {error && <span className="block font-mono text-[11px] text-[#FF6B6B]">{error}</span>}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-5 py-[11px] text-[11px] font-bold text-dash-primary transition-all hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex-1 rounded-full bg-gradient-to-b from-white to-[#E8E5DD] px-5 py-[11px] text-[11px] font-bold text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-px hover:brightness-110 disabled:opacity-50"
          >
            <LuDownload className="mr-1 inline h-3 w-3" />
            {loading ? "Exporting…" : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
