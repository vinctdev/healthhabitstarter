import { useState } from "react";
import { LuSettings, LuDownload } from "react-icons/lu";
import { getActiveDate } from "../utils/date";
import DayNavigation from "./DayNavigation";
import CalorieProgress from "./CalorieProgress";
import FoodAverages from "./FoodAverages";
import MealTracker from "./MealTracker";
import DaySummary from "./DaySummary";
import QuickSelect from "./QuickSelect";
import DayTable from "./DayTable";
import FoodSettingsModal from "./FoodSettingsModal";
import FoodExportModal from "./FoodExportModal";
import SaveTemplateModal from "./SaveTemplateModal";
import TemplateManagerModal from "./TemplateManagerModal";
import { useDaySummary } from "../hooks/useFood";
import type { FoodEntry } from "../types";

export default function FoodView() {
  const [selectedDate, setSelectedDate] = useState(() => getActiveDate());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [templateEntry, setTemplateEntry] = useState<FoodEntry | null>(null);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const { data: summary } = useDaySummary(selectedDate);

  const calorieGoal = summary?.calorie_goal ?? 2000;

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
            Food Tracker
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExportOpen(true)}
              className="rounded-full p-2 text-dash-tertiary transition-colors hover:text-dash-secondary"
              title="Export as Markdown"
            >
              <LuDownload className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-full p-2 text-dash-tertiary transition-colors hover:text-dash-secondary"
              title="Set calorie goal"
            >
              <LuSettings className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </button>
          </div>
        </div>

        <DayNavigation selectedDate={selectedDate} onDateChange={setSelectedDate} />

        <FoodAverages />

        <CalorieProgress date={selectedDate} calorieGoal={calorieGoal} />

        <MealTracker
          selectedDate={selectedDate}
          onOpenTemplates={() => setTemplateManagerOpen(true)}
        />

        <QuickSelect selectedDate={selectedDate} />

        <DaySummary date={selectedDate} onSaveTemplate={(entry) => setTemplateEntry(entry)} />

        <DayTable />
      </div>

      <FoodSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <FoodExportModal open={exportOpen} onClose={() => setExportOpen(false)} />

      {templateEntry && (
        <SaveTemplateModal
          entry={templateEntry}
          open={true}
          onClose={() => setTemplateEntry(null)}
        />
      )}

      <TemplateManagerModal
        open={templateManagerOpen}
        onClose={() => setTemplateManagerOpen(false)}
        selectedDate={selectedDate}
      />
    </>
  );
}
