import { useEffect, useState } from "react";
import { useSettings } from "../hooks/useSettings";

const CIRCUMFERENCE = 2 * Math.PI * 52;

const BLUE_PALETTE: [number, number, number][] = [
  [219, 234, 254],
  [147, 197, 253],
  [59, 130, 246],
  [37, 99, 235],
];

function lerpColor(stops: [number, number, number][], t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const count = stops.length - 1;
  const idx = clamped * count;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, count);
  const frac = idx - lo;

  const r = Math.round(stops[lo][0] + (stops[hi][0] - stops[lo][0]) * frac);
  const g = Math.round(stops[lo][1] + (stops[hi][1] - stops[lo][1]) * frac);
  const b = Math.round(stops[lo][2] + (stops[hi][2] - stops[lo][2]) * frac);

  return `rgb(${r},${g},${b})`;
}

interface TimeInfo {
  hours: number;
  percent: number;
  phase: string;
  status: string;
  remainingLabel: string;
  isAwake: boolean;
  isBeforeWake: boolean;
  isPastBedtime: boolean;
}

function computeTime(wakeHour: number, sleepHour: number): TimeInfo {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

  const fmtDuration = (totalHours: number): string => {
    const rh = Math.floor(totalHours);
    const rm = Math.round((totalHours - rh) * 60);
    return `${rh}h ${rm}m`;
  };

  if (sleepHour > wakeHour) {
    if (h < wakeHour) {
      const remaining = wakeHour - h;
      return {
        hours: h,
        percent: 0,
        phase: "ASLEEP",
        status: "😴 Still asleep",
        remainingLabel: `${fmtDuration(remaining)} until wake-up`,
        isAwake: false,
        isBeforeWake: true,
        isPastBedtime: false,
      };
    }

    if (h >= sleepHour) {
      return {
        hours: h,
        percent: 100,
        phase: "OVERDUE",
        status: "⚠️ Bedtime missed",
        remainingLabel: "Go to sleep!",
        isAwake: false,
        isBeforeWake: false,
        isPastBedtime: true,
      };
    }

    const awakeWindow = sleepHour - wakeHour;
    const percent = ((h - wakeHour) / awakeWindow) * 100;
    const remaining = sleepHour - h;

    let phase: string;
    let status: string;

    if (percent < 25) {
      phase = "MORNING";
      status = "☀️ Morning, fresh start";
    } else if (percent < 50) {
      phase = "MIDDAY";
      status = "⚡ Midday, stay on it";
    } else if (percent < 75) {
      phase = "AFTERNOON";
      status = "🔥 Afternoon, keep pushing";
    } else if (percent < 90) {
      phase = "EVENING";
      status = "⏳ Evening, wrap things up";
    } else {
      phase = "BEDTIME";
      status = "🌙 Bedtime soon";
    }

    return {
      hours: h,
      percent,
      phase,
      status,
      remainingLabel: `${fmtDuration(remaining)} awake time left`,
      isAwake: true,
      isBeforeWake: false,
      isPastBedtime: false,
    };
  }

  const awakeWindow = 24 - wakeHour + sleepHour;

  if (h >= sleepHour && h < wakeHour) {
    const remaining = wakeHour - h;
    return {
      hours: h,
      percent: 0,
      phase: "ASLEEP",
      status: "😴 Still asleep",
      remainingLabel: `${fmtDuration(remaining)} until wake-up`,
      isAwake: false,
      isBeforeWake: true,
      isPastBedtime: false,
    };
  }

  const elapsed = h >= wakeHour ? h - wakeHour : 24 - wakeHour + h;
  const percent = (elapsed / awakeWindow) * 100;
  const remaining = h < sleepHour ? sleepHour - h : 24 - h + sleepHour;

  let phase: string;
  let status: string;

  if (percent < 25) {
    phase = "MORNING";
    status = "☀️ Morning, fresh start";
  } else if (percent < 50) {
    phase = "MIDDAY";
    status = "⚡ Midday, stay on it";
  } else if (percent < 75) {
    phase = "AFTERNOON";
    status = "🔥 Afternoon, keep pushing";
  } else if (percent < 90) {
    phase = "EVENING";
    status = "⏳ Evening, wrap things up";
  } else {
    phase = "BEDTIME";
    status = "🌙 Bedtime soon";
  }

  return {
    hours: h,
    percent,
    phase,
    status,
    remainingLabel: `${fmtDuration(remaining)} awake time left`,
    isAwake: true,
    isBeforeWake: false,
    isPastBedtime: false,
  };
}

function formatClock(): string {
  const now = new Date();
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function fmtHour(h: number): string {
  return h === 24 ? "0:00" : `${h}:00`;
}

export default function DayRing() {
  const { data: settings } = useSettings();
  const wakeHour = settings?.wake_hour ?? 8;
  const sleepHour = settings?.sleep_hour ?? 24;

  const [info, setInfo] = useState(() => computeTime(wakeHour, sleepHour));
  const [clock, setClock] = useState(formatClock);

  useEffect(() => {
    const update = () => {
      setInfo(computeTime(wakeHour, sleepHour));
      setClock(formatClock());
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [wakeHour, sleepHour]);

  const color = info.isBeforeWake ? "#4d4b47" : lerpColor(BLUE_PALETTE, info.percent / 100);
  const trackColor = "rgba(255,255,255,0.12)";
  const offset = CIRCUMFERENCE * (1 - info.percent / 100);

  return (
    <div className="mb-6 flex flex-col items-center gap-[26px] sm:flex-row sm:items-center sm:justify-center">
      <div className="relative h-[168px] w-[168px] shrink-0 sm:h-[168px] sm:w-[168px] max-[480px]:h-[144px] max-[480px]:w-[144px]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <defs>
            <filter id="ringGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx="60" cy="60" r="52" fill="none" stroke={trackColor} strokeWidth="8" />

          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            filter="url(#ringGlow)"
            style={{
              transition:
                "stroke 0.7s cubic-bezier(0.22,1,0.36,1), stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono font-extrabold tabular-nums tracking-tight max-[480px]:text-[32px]"
            style={{
              fontSize: "40px",
              letterSpacing: "-0.04em",
              color,
              transition: "color 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {info.isBeforeWake ? "-" : `${Math.round(info.percent)}%`}
          </span>
          <span className="mt-[5px] font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-dash-tertiary">
            {info.phase}
          </span>
          <span className="font-mono text-[10.5px] text-dash-tertiary">{clock}</span>
        </div>
      </div>

      <div className="flex max-w-[280px] flex-col gap-[6px] text-center sm:text-left">
        <span className="text-[14px] font-bold text-dash-primary">{info.status}</span>
        <span className="font-mono text-[12px] text-dash-secondary">{info.remainingLabel}</span>
        <span className="font-mono text-[11px] text-dash-tertiary">
          {fmtHour(wakeHour)} - {fmtHour(sleepHour)}
        </span>
      </div>
    </div>
  );
}
