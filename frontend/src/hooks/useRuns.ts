import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { runApi } from "../api/runs";
import type { RunUpdate } from "../types";

const RUNS_KEY = "runs";
const CARDIO_KEY = "runCardio";

export function useRuns() {
  return useQuery({
    queryKey: [RUNS_KEY],
    queryFn: runApi.getAll,
  });
}

export function useRunStats() {
  return useQuery({
    queryKey: [RUNS_KEY, "stats"],
    queryFn: runApi.getStats,
  });
}

export function useCreateRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: runApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: [RUNS_KEY] }),
  });
}

export function useUpdateRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & RunUpdate) => runApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RUNS_KEY] }),
  });
}

export function useDeleteRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: runApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: [RUNS_KEY] }),
  });
}

export function useRunCardio(runId: number | null) {
  return useQuery({
    queryKey: [CARDIO_KEY, runId],
    queryFn: () => runApi.getCardio(runId!),
    enabled: runId != null,
    retry: false,
    staleTime: 30 * 60 * 1000,
  });
}

export function useFetchRunCardio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: runApi.fetchCardio,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [CARDIO_KEY, data.run_id] });
    },
  });
}
