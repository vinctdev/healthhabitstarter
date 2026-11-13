import TodayCard from "./TodayCard";
import TomorrowCard from "./TomorrowCard";
import { getActiveDate, getDayStartHour, getTomorrowDate } from "../utils/date";

export default function DailyPlanTab() {
  const activeDate = getActiveDate();
  const tomorrowDate = getTomorrowDate();
  const now = new Date();
  const isTomorrowLocked = now.getHours() < getDayStartHour();

  return (
    <div className="space-y-5">
      <TodayCard date={activeDate} />
      <TomorrowCard date={tomorrowDate} isLocked={isTomorrowLocked} />
    </div>
  );
}
