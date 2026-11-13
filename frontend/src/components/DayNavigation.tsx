import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { getActiveDate } from "../utils/date";

interface DayNavigationProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return formatYYYYMMDD(d);
}

function formatYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function DayNavigation({ selectedDate, onDateChange }: DayNavigationProps) {
  const today = getActiveDate();
  const isToday = selectedDate === today;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onDateChange(addDays(selectedDate, -1))}
        className="rounded-lg p-1.5 text-dash-tertiary transition-colors hover:text-dash-secondary"
      >
        <LuChevronLeft className="h-4 w-4" />
      </button>

      <span className="font-mono text-sm font-semibold text-dash-primary min-w-[120px] text-center">
        {formatDate(selectedDate)}
      </span>

      {isToday ? (
        <div className="w-7" />
      ) : (
        <button
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="rounded-lg p-1.5 text-dash-tertiary transition-colors hover:text-dash-secondary"
        >
          <LuChevronRight className="h-4 w-4" />
        </button>
      )}

      {!isToday && (
        <button
          onClick={() => onDateChange(today)}
          className="ml-2 rounded-full bg-dash-success px-3 py-1 font-mono text-[10px] font-bold text-black transition-opacity hover:opacity-80"
        >
          Today
        </button>
      )}
    </div>
  );
}
