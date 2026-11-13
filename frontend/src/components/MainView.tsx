import { useState } from "react";
import { LuSettings } from "react-icons/lu";
import ThemeToggle from "./ThemeToggle";
import GoalTicker from "./GoalTicker";
import MotivationCard from "./MotivationCard";
import DayRing from "./DayRing";
import GoalsSection from "./GoalsSection";
import SettingsModal from "./SettingsModal";

export default function MainView() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
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
          My Dashboard
        </h1>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-full p-2 text-dash-tertiary transition-colors hover:text-dash-secondary"
            title="Day settings"
          >
            <LuSettings className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </button>
        </div>
      </div>

      <GoalTicker />
      <MotivationCard />
      <DayRing />
      <GoalsSection />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
