import { api } from "./client";
import type {
  HealthStatus,
  HealthStepsData,
  SleepSessionData,
  SleepAveragesData,
  DailyMetricsData,
  EnergyCurveData,
} from "../types";

export const healthApi = {
  getStatus: () => api.get<HealthStatus>("/health-data/status"),
  getSteps: (days: number = 1) => api.get<HealthStepsData>(`/health-data/steps?days=${days}`),
  getSleep: (date: string) => api.get<SleepSessionData>(`/health-data/sleep?date=${date}`),
  getSleepAverages: () => api.get<SleepAveragesData>("/health-data/sleep/averages"),
  getDailyMetrics: (date: string) =>
    api.get<DailyMetricsData>(`/health-data/daily-metrics?date=${date}`),
  getEnergyCurve: (date: string) =>
    api.get<EnergyCurveData>(`/health-data/energy-curve?date=${date}`),
};
