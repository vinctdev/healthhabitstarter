import { api } from "./client";
import type { Run, RunCreate, RunUpdate, RunStats, RunCardio } from "../types";

export const runApi = {
  getAll: () => api.get<Run[]>("/runs/"),
  create: (data: RunCreate) => api.post<Run>("/runs/", data),
  update: (id: number, data: RunUpdate) => api.patch<Run>(`/runs/${id}`, data),
  remove: (id: number) => api.delete<void>(`/runs/${id}`),
  getStats: () => api.get<RunStats>("/runs/stats"),
  getCardio: (runId: number) => api.get<RunCardio | null>(`/runs/${runId}/cardio`),
  fetchCardio: (runId: number) => api.post<RunCardio>(`/runs/${runId}/fetch-cardio`),
};
