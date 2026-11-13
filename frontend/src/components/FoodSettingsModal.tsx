import { useState, useEffect } from "react";
import { LuX } from "react-icons/lu";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";

interface FoodSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function FoodSettingsModal({ open, onClose }: FoodSettingsModalProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [calorieGoal, setCalorieGoal] = useState(settings?.calorie_goal ?? 2000);

  useEffect(() => {
    if (settings) {
      setCalorieGoal(settings.calorie_goal);
    }
  }, [settings]);

  if (!open) return null;

  const handleSave = () => {
    updateSettings.mutate({ calorie_goal: calorieGoal });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#0C0C0D] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dash-primary">Calorie goal</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-dash-tertiary transition-colors hover:text-dash-primary"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Daily goal: {calorieGoal} kcal
            </label>
            <input
              type="range"
              min={500}
              max={5000}
              step={50}
              value={calorieGoal}
              onChange={(e) => setCalorieGoal(Number(e.target.value))}
              className="w-full accent-dash-success"
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-dash-tertiary">
              <span>500</span>
              <span>5000</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-5 py-[11px] text-[11px] font-bold text-dash-primary transition-all hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="flex-1 rounded-full bg-gradient-to-b from-white to-[#E8E5DD] px-5 py-[11px] text-[11px] font-bold text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-px hover:brightness-110 disabled:opacity-50"
          >
            {updateSettings.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
