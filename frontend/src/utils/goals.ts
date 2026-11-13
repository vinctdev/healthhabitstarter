const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

function dueEndMs(dueDate: string): number {
  return new Date(`${dueDate}T23:59:59`).getTime();
}

export function timeProgress(createdAt: string, dueDate: string | null): number | null {
  if (!dueDate) return null;
  const start = new Date(createdAt).getTime();
  const end = dueEndMs(dueDate);
  const total = end - start;
  if (total <= 0) return 100;
  const pct = ((Date.now() - start) / total) * 100;
  return Math.min(100, Math.max(0, pct));
}

export interface Remaining {
  overdue: boolean;
  label: string;
  daysLeft: number;
}

export function formatRemaining(dueDate: string): Remaining {
  const diff = dueEndMs(dueDate) - Date.now();
  if (diff < 0) {
    const overdueDays = Math.floor(Math.abs(diff) / DAY_MS);
    return {
      overdue: true,
      label: overdueDays > 0 ? `OVERDUE ${overdueDays}d` : "OVERDUE",
      daysLeft: -overdueDays,
    };
  }
  const hours = diff / HOUR_MS;
  if (hours < 48) {
    return { overdue: false, label: `${Math.max(1, Math.round(hours))}h left`, daysLeft: 0 };
  }
  const days = Math.ceil(diff / DAY_MS);
  return { overdue: false, label: `${days}d left`, daysLeft: days };
}

export function kindLabel(kind: string): string {
  if (kind === "short") return "Short-term";
  if (kind === "long") return "Long-term";
  return "Daily";
}

export function formatDueDate(dueDate: string): string {
  const d = new Date(`${dueDate}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
