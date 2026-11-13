import { useState, useEffect } from "react";
import { LuX, LuTrash2 } from "react-icons/lu";

interface BodyMeasurementModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: BodyMeasurementFormData) => void;
  onDelete?: () => void;
  isPending: boolean;
  editData?: BodyMeasurementFormData | null;
}

export interface BodyMeasurementFormData {
  date: string;
  weight_kg: number;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
}

function getDefaultDate(): string {
  const now = new Date();
  return (
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0")
  );
}

export default function BodyMeasurementModal({
  open,
  onClose,
  onSave,
  onDelete,
  isPending,
  editData,
}: BodyMeasurementModalProps) {
  const [date, setDate] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [muscleMassKg, setMuscleMassKg] = useState("");

  const isEdit = !!editData;

  useEffect(() => {
    if (editData) {
      setDate(editData.date);
      setWeightKg(String(editData.weight_kg));
      setBodyFatPct(editData.body_fat_pct != null ? String(editData.body_fat_pct) : "");
      setMuscleMassKg(editData.muscle_mass_kg != null ? String(editData.muscle_mass_kg) : "");
    } else {
      setDate(getDefaultDate());
      setWeightKg("");
      setBodyFatPct("");
      setMuscleMassKg("");
    }
  }, [editData, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !weightKg) return;

    onSave({
      date,
      weight_kg: parseFloat(weightKg),
      body_fat_pct: bodyFatPct ? parseFloat(bodyFatPct) : null,
      muscle_mass_kg: muscleMassKg ? parseFloat(muscleMassKg) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#0C0C0D] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dash-primary">
            {isEdit ? "Edit measurement" : "Log measurement"}
          </h2>
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
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-[10px] font-mono text-sm text-dash-primary focus:border-dash-success focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min="20"
              max="300"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="e.g. 75.5"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-[10px] font-mono text-sm text-dash-primary focus:border-dash-success focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Body fat (%) <span className="font-normal italic text-dash-tertiary">(optional)</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="60"
              value={bodyFatPct}
              onChange={(e) => setBodyFatPct(e.target.value)}
              placeholder="e.g. 18.5"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-[10px] font-mono text-sm text-dash-primary focus:border-dash-success focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Muscle mass (kg){" "}
              <span className="font-normal italic text-dash-tertiary">(optional)</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="10"
              max="200"
              value={muscleMassKg}
              onChange={(e) => setMuscleMassKg(e.target.value)}
              placeholder="e.g. 35.2"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-[10px] font-mono text-sm text-dash-primary focus:border-dash-success focus:outline-none"
            />
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
              disabled={isPending}
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
