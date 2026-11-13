import { useState, useEffect } from "react";
import { LuX } from "react-icons/lu";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [wake, setWake] = useState(settings?.wake_hour ?? 8);
  const [sleep, setSleep] = useState(settings?.sleep_hour ?? 24);
  const [dayStart, setDayStart] = useState(settings?.day_start_hour ?? 4);

  useEffect(() => {
    if (settings) {
      setWake(settings.wake_hour);
      setSleep(settings.sleep_hour);
      setDayStart(settings.day_start_hour);
    }
  }, [settings]);

  if (!open) return null;

  const fmt = (h: number) => `${String(h).padStart(2, "0")}:00`;

  const handleSave = () => {
    updateSettings.mutate({ wake_hour: wake, sleep_hour: sleep, day_start_hour: dayStart });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#0C0C0D] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dash-primary">Day settings</h2>
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
              Wake up: {fmt(wake)}
            </label>
            <input
              type="range"
              min={0}
              max={23}
              value={wake}
              onChange={(e) => setWake(Number(e.target.value))}
              className="w-full accent-dash-success"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Bedtime: {fmt(sleep)}
            </label>
            <input
              type="range"
              min={1}
              max={24}
              value={sleep}
              onChange={(e) => setSleep(Number(e.target.value))}
              className="w-full accent-dash-success"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Day starts at: {fmt(dayStart)}
            </label>
            <input
              type="range"
              min={0}
              max={12}
              value={dayStart}
              onChange={(e) => setDayStart(Number(e.target.value))}
              className="w-full accent-dash-success"
            />
            <p className="mt-1.5 text-[11px] text-dash-tertiary">
              Entries before this time still count toward the previous day.
            </p>
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
