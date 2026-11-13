import { api } from "./client";
import type {
  PushupEntry,
  PushupEntryCreate,
  PushupEntryUpdate,
  PushupStats,
  PushupSeries,
  PushupGranularity,
} from "../types";

export const pushupApi = {
  getAll: () => api.get<PushupEntry[]>("/pushups/"),
  create: (data: PushupEntryCreate) => api.post<PushupEntry>("/pushups/", data),
  update: (id: number, data: PushupEntryUpdate) => api.patch<PushupEntry>(`/pushups/${id}`, data),
  remove: (id: number) => api.delete<void>(`/pushups/${id}`),
  getStats: () => api.get<PushupStats>("/pushups/stats"),
  getSeries: (granularity: PushupGranularity, buckets: number) =>
    api.get<PushupSeries>(`/pushups/series?granularity=${granularity}&buckets=${buckets}`),
};
