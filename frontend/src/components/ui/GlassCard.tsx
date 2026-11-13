import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export default function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div
      className={`rounded-2xl bg-white/[0.04] p-[18px] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl saturate-[1.2] sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}
