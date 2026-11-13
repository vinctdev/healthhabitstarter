import { api } from "./client";
import type {
  Goal,
  GoalCreate,
  GoalKind,
  GoalUpdate,
  GoalsForDate,
  PolishResponse,
} from "../types";

export const goalsApi = {
  getByDate: (date: string) => api.get<GoalsForDate>(`/goals/${date}`),
  listByKind: (kind: GoalKind) => api.get<Goal[]>(`/goals?kind=${kind}`),
  create: (goal: GoalCreate) => api.post<Goal>("/goals/", goal),
  update: (id: number, data: GoalUpdate) => api.patch<Goal>(`/goals/${id}`, data),
  remove: (id: number) => api.delete<void>(`/goals/${id}`),
  reorder: (ids: number[]) => api.put<void>("/goals/reorder", { ids }),
  push: (from_date: string, to_date: string) =>
    api.post<{ ok: boolean; moved: number }>("/goals/push", { from_date, to_date }),
  polish: (text: string) => api.post<PolishResponse>("/goals/polish", { text }),
};
