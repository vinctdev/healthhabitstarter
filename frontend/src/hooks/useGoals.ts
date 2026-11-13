import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi } from "../api/goals";
import type { GoalKind, GoalUpdate } from "../types";

const GOALS_KEY = "goals";

export function useGoals(date: string) {
  return useQuery({
    queryKey: [GOALS_KEY, date],
    queryFn: ({ queryKey }) => goalsApi.getByDate(queryKey[1] as string),
  });
}

export function useGoalsByKind(kind: GoalKind) {
  return useQuery({
    queryKey: [GOALS_KEY, "kind", kind],
    queryFn: () => goalsApi.listByKind(kind),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: [GOALS_KEY] }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & GoalUpdate) => goalsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [GOALS_KEY] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: goalsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: [GOALS_KEY] }),
  });
}

export function useReorderGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: goalsApi.reorder,
    onSuccess: () => qc.invalidateQueries({ queryKey: [GOALS_KEY] }),
  });
}

export function usePushGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ from_date, to_date }: { from_date: string; to_date: string }) =>
      goalsApi.push(from_date, to_date),
    onSuccess: () => qc.invalidateQueries({ queryKey: [GOALS_KEY] }),
  });
}

export function usePolishGoal() {
  return useMutation({
    mutationFn: goalsApi.polish,
  });
}
