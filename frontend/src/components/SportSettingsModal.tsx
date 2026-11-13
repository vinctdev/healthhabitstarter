import { useState, useEffect, useRef } from "react";
import { LuX } from "react-icons/lu";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";

const PREDEFINED_REASONS = [
  "Health",
  "Endurance",
  "Weight loss",
  "Muscle gain",
  "Stress relief",
  "Fun",
  "Competition",
  "Being outdoors",
  "Social",
];

interface SportSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SportSettingsModal({ open, onClose }: SportSettingsModalProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReasonOpen, setCustomReasonOpen] = useState(false);
  const [customReason, setCustomReason] = useState("");
  const [goal, setGoal] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      const saved = settings.sport_reasons ?? [];
      const predefined = saved.filter((r) => PREDEFINED_REASONS.includes(r));
      const custom = saved.filter((r) => !PREDEFINED_REASONS.includes(r));
      setSelectedReasons(predefined);
      if (custom.length > 0) {
        setCustomReason(custom.join(", "));
        setCustomReasonOpen(true);
      } else {
        setCustomReason("");
        setCustomReasonOpen(false);
      }
      setGoal(settings.sport_goal ?? "");
    }
  }, [settings]);

  useEffect(() => {
    if (customReasonOpen && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [customReasonOpen]);

  if (!open) return null;

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason],
    );
  };

  const toggleCustomReason = () => {
    if (customReasonOpen) {
      setCustomReason("");
      setCustomReasonOpen(false);
    } else {
      setCustomReasonOpen(true);
    }
  };

  const handleSave = () => {
    const reasonList = [...selectedReasons];
    if (customReason.trim()) {
      reasonList.push(customReason.trim());
    }
    updateSettings.mutate({
      sport_reasons: reasonList.length > 0 ? reasonList : null,
      sport_goal: goal.trim() || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#0C0C0D] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dash-primary">Sport settings</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-dash-tertiary transition-colors hover:text-dash-primary"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2.5 block font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Why do you work out?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PREDEFINED_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => toggleReason(reason)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                    selectedReasons.includes(reason)
                      ? "bg-dash-success/20 text-dash-success ring-1 ring-dash-success/40"
                      : "bg-white/[0.06] text-dash-tertiary hover:bg-white/[0.10] hover:text-dash-secondary"
                  }`}
                >
                  {reason}
                </button>
              ))}
              <button
                onClick={toggleCustomReason}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  customReasonOpen
                    ? "bg-dash-success/20 text-dash-success ring-1 ring-dash-success/40"
                    : "border border-dashed border-dash-tertiary/30 bg-white/[0.04] text-dash-tertiary hover:border-dash-tertiary/50 hover:text-dash-secondary"
                }`}
              >
                + Other
              </button>
            </div>
            {customReasonOpen && (
              <input
                ref={customInputRef}
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Your own reason…"
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-dash-primary placeholder:text-dash-tertiary focus:border-dash-success/50 focus:outline-none"
              />
            )}
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-dash-secondary">
              Goal (optional)
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. run 5 km in under 25 minutes…"
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-dash-primary placeholder:text-dash-tertiary focus:border-dash-success/50 focus:outline-none"
            />
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
