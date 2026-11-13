import { useState, useEffect } from "react";
import { LuX } from "react-icons/lu";
import type { BodyProfile } from "../types";
import { GENDER_OPTIONS } from "./bodyOptions";

interface BodyProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: BodyProfileFormData) => void;
  isPending: boolean;
  profile?: BodyProfile | null;
}

export interface BodyProfileFormData {
  height_cm: number;
  age: number;
  gender: string;
  occupation: string | null;
}

export default function BodyProfileModal({
  open,
  onClose,
  onSave,
  isPending,
  profile,
}: BodyProfileModalProps) {
  const [heightCm, setHeightCm] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [occupation, setOccupation] = useState("");

  const isEdit = !!profile;

  useEffect(() => {
    if (profile) {
      setHeightCm(String(profile.height_cm));
      setAge(String(profile.age));
      setGender(profile.gender);
      setOccupation(profile.occupation ?? "");
    } else {
      setHeightCm("");
      setAge("");
      setGender("male");
      setOccupation("");
    }
  }, [profile, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heightCm || !age) return;

    onSave({
      height_cm: parseFloat(heightCm),
      age: parseInt(age, 10),
      gender,
      occupation: occupation || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#0C0C0D] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dash-primary">
            {isEdit ? "Edit profile" : "Set up profile"}
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
              Height (cm)
            </label>
            <input
              type="number"
              step="0.1"
              min="50"
              max="250"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="e.g. 175"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-[10px] font-mono text-sm text-dash-primary focus:border-dash-success focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Age
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 30"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-[10px] font-mono text-sm text-dash-primary focus:border-dash-success focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Gender
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGender(value)}
                  className={`rounded-lg border px-3 py-[10px] font-mono text-[11px] font-semibold transition-all ${
                    gender === value
                      ? "border-dash-success/40 bg-dash-success/[0.08] text-dash-success"
                      : "border-white/10 bg-white/[0.04] text-dash-tertiary hover:text-dash-secondary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Occupation <span className="font-normal italic text-dash-tertiary">(optional)</span>
            </label>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="e.g. software developer"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-[10px] font-mono text-sm text-dash-primary focus:border-dash-success focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
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
