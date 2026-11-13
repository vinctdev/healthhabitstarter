const MS_IN_DAY = 86_400_000;

// A "day" starts at this local hour (user setting), so late-night entries count for the
// previous day. Cached in localStorage so the first render uses the right boundary.
const DAY_START_STORAGE_KEY = "dayStartHour";
const DEFAULT_DAY_START_HOUR = 4;
let dayStartHour = readStoredDayStartHour();

function readStoredDayStartHour(): number {
  try {
    const stored = localStorage.getItem(DAY_START_STORAGE_KEY);
    const hour = stored === null ? NaN : Number(stored);
    return Number.isInteger(hour) && hour >= 0 && hour <= 12 ? hour : DEFAULT_DAY_START_HOUR;
  } catch {
    return DEFAULT_DAY_START_HOUR;
  }
}

export function getDayStartHour(): number {
  return dayStartHour;
}

export function setDayStartHour(hour: number): void {
  dayStartHour = hour;
  try {
    localStorage.setItem(DAY_START_STORAGE_KEY, String(hour));
  } catch {
    // Storage unavailable (private mode); the in-memory value still applies.
  }
}

/** Parses a UTC timestamp from the API; naive strings (no offset) are treated as UTC. */
export function parseUtc(value: string): Date {
  return new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
}

export function getActiveDate(): string {
  const now = new Date();
  const d = now.getHours() < dayStartHour ? new Date(now.getTime() - MS_IN_DAY) : now;
  return formatYYYYMMDD(d);
}

export function getTomorrowDate(): string {
  const now = new Date();
  if (now.getHours() < dayStartHour) return formatYYYYMMDD(now);
  const tomorrow = new Date(now.getTime() + MS_IN_DAY);
  return formatYYYYMMDD(tomorrow);
}

function formatYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatPrettyDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
