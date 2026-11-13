import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplementsApi } from "../api/supplements";
import type { UserSupplementCreate, UserSupplementUpdate, ToggleRequest } from "../types";

const SUPPLEMENTS_KEY = "supplements";

export function useSupplementLibrary() {
  return useQuery({
    queryKey: [SUPPLEMENTS_KEY, "library"],
    queryFn: supplementsApi.getLibrary,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSupplementStack(date: string) {
  return useQuery({
    queryKey: [SUPPLEMENTS_KEY, "stack", date],
    queryFn: ({ queryKey }) => supplementsApi.getStack(queryKey[2] as string),
  });
}

export function useCreateUserSupplement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UserSupplementCreate) => supplementsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SUPPLEMENTS_KEY] }),
  });
}

export function useUpdateUserSupplement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & UserSupplementUpdate) =>
      supplementsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SUPPLEMENTS_KEY] }),
  });
}

export function useDeleteUserSupplement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: supplementsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: [SUPPLEMENTS_KEY] }),
  });
}

export function useToggleSupplement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ToggleRequest) => supplementsApi.toggle(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SUPPLEMENTS_KEY] }),
  });
}
