import { useState } from "react";
import { LuSettings } from "react-icons/lu";
import SportSettingsModal from "./SportSettingsModal";
import { SPORT_MODULES } from "./sport/sportModules";

/** Sport tab: shared header and settings, plus one view per registered sport module. */
export default function SportView() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moduleId, setModuleId] = useState(SPORT_MODULES[0]?.id);
  const active = SPORT_MODULES.find((m) => m.id === moduleId) ?? SPORT_MODULES[0];

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
            Sport & Exercise
          </h1>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-full p-2 text-dash-tertiary transition-colors hover:text-dash-secondary"
            title="Settings"
          >
            <LuSettings className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </button>
        </div>

        {SPORT_MODULES.length > 1 && (
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
            {SPORT_MODULES.map((item) => (
              <button
                key={item.id}
                onClick={() => setModuleId(item.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-all ${
                  active.id === item.id
                    ? "bg-dash-success/15 text-dash-success"
                    : "text-dash-tertiary hover:text-dash-secondary"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        )}

        {active && <active.view />}
      </div>

      <SportSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
