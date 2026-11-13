import { useState, useEffect } from "react";
import { LuX, LuTrash2 } from "react-icons/lu";
import type { PushupEntry, PushupEntryCreate, PushupVariant, VariantReps } from "../../types";
import { PUSHUP_VARIANTS } from "./pushupVariants";
import { getActiveDate } from "../../utils/date";

interface PushupFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: PushupEntryCreate) => void;
  onDelete?: () => void;
  isPending: boolean;
  editEntry?: PushupEntry | null;
}

function getDefaultTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export default function PushupFormModal({
  open,
  onClose,
  onSave,
  onDelete,
  isPending,
  editEntry,
}: PushupFormModalProps) {
  const [date, setDate] = useState(getActiveDate());
  const [time, setTime] = useState(getDefaultTime());
  const [variants, setVariants] = useState<PushupVariant[]>([]);
  const [repsInput, setRepsInput] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  const isEdit = !!editEntry;

  useEffect(() => {
    if (editEntry) {
      setDate(editEntry.date);
      setTime(editEntry.time ?? "");
      setVariants(Object.keys(editEntry.variant_reps) as PushupVariant[]);
      setRepsInput(
        Object.fromEntries(
          Object.entries(editEntry.variant_reps).map(([variant, reps]) => [variant, String(reps)]),
        ),
      );
      setNotes(editEntry.notes ?? "");
    } else {
      setDate(getActiveDate());
      setTime(getDefaultTime());
      setVariants([]);
      setRepsInput({});
      setNotes("");
    }
  }, [editEntry, open]);

  if (!open) return null;

  const parsedReps: VariantReps = {};
  for (const variant of variants) {
    const value = parseInt(repsInput[variant] ?? "", 10);
    if (value > 0) parsedReps[variant] = value;
  }
  const totalReps = Object.values(parsedReps).reduce((sum, value) => sum + value, 0);
  const allFilled = variants.every((variant) => parsedReps[variant] != null);
  const canSubmit = !!date && variants.length > 0 && allFilled;

  const toggleVariant = (variant: PushupVariant) => {
    setVariants((prev) =>
      prev.includes(variant) ? prev.filter((v) => v !== variant) : [...prev, variant],
    );
    setRepsInput((prev) => (variant in prev ? prev : { ...prev, [variant]: "" }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave({
      date,
      time: time || null,
      variant_reps: parsedReps,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#0C0C0D] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dash-primary">
            {isEdit ? "Edit push-ups" : "Log push-ups"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-dash-tertiary transition-colors hover:text-dash-primary"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
                Time <span className="font-normal italic text-dash-tertiary">(opt.)</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-[10px] font-mono text-sm text-dash-primary focus:border-dash-success focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Variants
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PUSHUP_VARIANTS.map((option) => {
                const active = variants.includes(option.key);
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => toggleVariant(option.key)}
                    title={option.focus}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all hover:brightness-110"
                    style={{
                      color: option.color,
                      backgroundColor: active ? `${option.color}22` : "transparent",
                      border: `1px solid ${active ? option.color : `${option.color}55`}`,
                      boxShadow: active ? `inset 0 0 0 1px ${option.color}66` : undefined,
                    }}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {variants.length > 0 && (
            <div className="space-y-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              {variants.map((variant) => {
                const meta = PUSHUP_VARIANTS.find((option) => option.key === variant)!;
                const filled = parsedReps[variant] != null;
                return (
                  <div key={variant} className="flex items-center justify-between gap-3">
                    <span
                      className="flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: meta.color }}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.label}
                      <span className="font-mono text-[10px] font-normal text-dash-tertiary">
                        {meta.focus}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={repsInput[variant] ?? ""}
                        onChange={(e) =>
                          setRepsInput((prev) => ({ ...prev, [variant]: e.target.value }))
                        }
                        placeholder="0"
                        className={`w-20 rounded-lg border bg-white/[0.04] px-2 py-[7px] text-right font-mono text-sm text-dash-primary focus:outline-none ${
                          filled || repsInput[variant] === ""
                            ? "border-white/10 focus:border-dash-success"
                            : "border-dash-danger/50 focus:border-dash-danger"
                        }`}
                      />
                      <span className="font-mono text-[10px] text-dash-tertiary">Reps</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-tertiary">
                  Total
                </span>
                <span className="font-mono text-sm font-bold tabular-nums text-dash-success">
                  {totalReps} reps
                </span>
              </div>
            </div>
          )}

          {variants.length === 0 && (
            <p className="font-mono text-[10px] text-dash-tertiary">Select at least one variant.</p>
          )}
          {variants.length > 0 && !allFilled && (
            <p className="font-mono text-[10px] text-dash-danger/80">
              Enter reps for each selected variant.
            </p>
          )}

          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Note <span className="font-normal italic text-dash-tertiary">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. knees down, last set was hard"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-[10px] text-sm text-dash-primary placeholder:text-dash-tertiary focus:border-dash-success focus:outline-none"
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
              disabled={isPending || !canSubmit}
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
