import { api } from "./client";
import type { AiStatus } from "../types";

export const aiApi = {
  getStatus: () => api.get<AiStatus>("/ai/status"),
};
