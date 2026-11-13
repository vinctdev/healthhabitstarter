interface TimeProgressBarProps {
  progress: number;
  overdue?: boolean;
  className?: string;
  height?: number;
}

export default function TimeProgressBar({
  progress,
  overdue = false,
  className = "",
  height = 6,
}: TimeProgressBarProps) {
  const width = overdue ? 100 : Math.min(100, Math.max(0, progress));
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-white/[0.07] ${className}`}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${width}%`,
          background: overdue
            ? "linear-gradient(90deg, #F2C063, #FF6B6B)"
            : "linear-gradient(90deg, #6BE3A4, #F2C063, #FF6B6B)",
        }}
      />
    </div>
  );
}
