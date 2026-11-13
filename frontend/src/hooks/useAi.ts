import type { MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { aiApi } from "../api/ai";

export const AI_DISABLED_HINT = "Needs GEMINI_API_KEY";

export function useAiStatus() {
  return useQuery({
    queryKey: ["ai", "status"],
    queryFn: aiApi.getStatus,
    staleTime: Infinity, // only changes with a backend restart
  });
}

/** Whether AI features are available. Optimistic while loading; the backend guards anyway (503). */
export function useAiEnabled(): boolean {
  const { data } = useAiStatus();
  return data?.enabled ?? true;
}

/**
 * Props for an AI button: without a key it is greyed out with the tooltip "Needs GEMINI_API_KEY",
 * so users see what would be possible. Uses aria-disabled instead of `disabled`, because disabled
 * buttons do not show tooltips in every browser. Combine with the `AI_GATED_CLASS` class.
 */
export function aiGateProps(enabled: boolean) {
  if (enabled) return {};
  return {
    "aria-disabled": true,
    title: AI_DISABLED_HINT,
    onClickCapture: (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
  };
}

export const AI_GATED_CLASS = "aria-disabled:cursor-not-allowed aria-disabled:opacity-40";
