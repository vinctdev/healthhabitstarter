import { useQuery } from "@tanstack/react-query";
import { healthApi } from "../api/health";
import { getActiveDate } from "../utils/date";

export function useHealthStatus() {
  return useQuery({
    queryKey: ["health", "status"],
    queryFn: healthApi.getStatus,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHealthSteps(days: number = 1) {
  return useQuery({
    queryKey: ["health", "steps", days],
    queryFn: ({ queryKey }) => healthApi.getSteps(queryKey[2] as number),
    staleTime: 5 * 60 * 1000,
  });
}

export function useHealthSleep(date: string) {
  return useQuery({
    queryKey: ["health", "sleep", date],
    queryFn: ({ queryKey }) => healthApi.getSleep(queryKey[2] as string),
    staleTime: 30 * 60 * 1000,
  });
}

export function useHealthSleepAverages() {
  return useQuery({
    queryKey: ["health", "sleep", "averages"],
    queryFn: healthApi.getSleepAverages,
    staleTime: 30 * 60 * 1000,
  });
}

export function useDailyMetrics(date: string) {
  return useQuery({
    queryKey: ["health", "daily-metrics", date],
    queryFn: ({ queryKey }) => healthApi.getDailyMetrics(queryKey[2] as string),
    staleTime: 30 * 60 * 1000,
  });
}

export function useEnergyCurve(date: string) {
  const today = getActiveDate();
  return useQuery({
    queryKey: ["health", "energy-curve", date],
    queryFn: ({ queryKey }) => healthApi.getEnergyCurve(queryKey[2] as string),
    staleTime: date === today ? 0 : 15 * 60 * 1000,
  });
}
