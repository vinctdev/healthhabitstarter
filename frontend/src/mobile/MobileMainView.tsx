import { useState } from "react";
import { LuSettings } from "react-icons/lu";
import ThemeToggle from "../components/ThemeToggle";
import MotivationCard from "../components/MotivationCard";
import DayRing from "../components/DayRing";
import GoalsSection from "../components/GoalsSection";
import SettingsModal from "../components/SettingsModal";

/** Mobile variant of the Main tab. The goal ticker is omitted: it duplicates the goal list. */
export default function MobileMainView() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div className="mb-[14px] flex items-center justify-between">
        <h1
          className="text-[22px] font-bold leading-tight tracking-tight"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #C7C4BC 120%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          My Dashboard
        </h1>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="mobile-icon-button text-dash-tertiary transition-colors hover:text-dash-secondary"
            title="Day settings"
            aria-label="Set wake-up time, bedtime and day start"
          >
            <LuSettings className="h-5 w-5" />
          </button>
        </div>
      </div>

      <MotivationCard />
      <DayRing />
      <GoalsSection />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
