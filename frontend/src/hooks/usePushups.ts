import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pushupApi } from "../api/pushups";
import type { PushupEntryUpdate, PushupGranularity } from "../types";

const PUSHUP_KEY = "pushups";

export function usePushupEntries() {
  return useQuery({
    queryKey: [PUSHUP_KEY],
    queryFn: pushupApi.getAll,
  });
}

export function usePushupStats() {
  return useQuery({
    queryKey: [PUSHUP_KEY, "stats"],
    queryFn: pushupApi.getStats,
  });
}

export function usePushupSeries(granularity: PushupGranularity, buckets = 12) {
  return useQuery({
    queryKey: [PUSHUP_KEY, "series", granularity, buckets],
    queryFn: () => pushupApi.getSeries(granularity, buckets),
  });
}

export function useCreatePushup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pushupApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: [PUSHUP_KEY] }),
  });
}

export function useUpdatePushup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & PushupEntryUpdate) => pushupApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PUSHUP_KEY] }),
  });
}

export function useDeletePushup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pushupApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: [PUSHUP_KEY] }),
  });
}
