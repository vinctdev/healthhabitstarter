import { api } from "./client";
import type {
  Supplement,
  StackItemWithStatus,
  UserSupplement,
  UserSupplementCreate,
  UserSupplementUpdate,
  ToggleRequest,
} from "../types";

export const supplementsApi = {
  getLibrary: () => api.get<Supplement[]>("/supplements/library"),
  getStack: (date: string) => api.get<StackItemWithStatus[]>(`/supplements/stack/${date}`),
  create: (data: UserSupplementCreate) => api.post<UserSupplement>("/supplements/stack", data),
  update: (id: number, data: UserSupplementUpdate) =>
    api.patch<UserSupplement>(`/supplements/stack/${id}`, data),
  remove: (id: number) => api.delete<void>(`/supplements/stack/${id}`),
  toggle: (data: ToggleRequest) => api.post<{ taken: boolean }>("/supplements/toggle", data),
};
