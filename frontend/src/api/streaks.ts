import { api } from "./client";
import type { StreakData } from "../types";

export const streaksApi = {
  get: () => api.get<StreakData>("/streaks/"),
};
