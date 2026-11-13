import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { foodApi } from "../api/food";
import type { FoodEntryUpdate, NutritionSuggestionRequest, FoodTemplateUpdate } from "../types";

const FOOD_KEY = "food";

export function useFoodEntries(date: string) {
  return useQuery({
    queryKey: [FOOD_KEY, date],
    queryFn: ({ queryKey }) => foodApi.getByDate(queryKey[1] as string),
  });
}

export function useDaySummary(date: string) {
  return useQuery({
    queryKey: [FOOD_KEY, "summary", date],
    queryFn: ({ queryKey }) => foodApi.getSummary(queryKey[2] as string),
  });
}

export function useCreateFoodEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: foodApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: [FOOD_KEY] }),
  });
}

export function useUpdateFoodEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & FoodEntryUpdate) => foodApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [FOOD_KEY] }),
  });
}

export function useDeleteFoodEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: foodApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: [FOOD_KEY] }),
  });
}

export function useFoodStreak() {
  return useQuery({
    queryKey: [FOOD_KEY, "streak"],
    queryFn: foodApi.getStreak,
    staleTime: 60_000,
  });
}

export function useWeeklyCalories() {
  return useQuery({
    queryKey: [FOOD_KEY, "weekly"],
    queryFn: foodApi.getWeekly,
  });
}

export function useAverages() {
  return useQuery({
    queryKey: [FOOD_KEY, "averages"],
    queryFn: foodApi.getAverages,
  });
}

export function useRecentMeals() {
  return useQuery({
    queryKey: [FOOD_KEY, "recent"],
    queryFn: foodApi.getRecent,
    staleTime: 60_000,
  });
}

export function useKnownFoods() {
  return useQuery({
    queryKey: [FOOD_KEY, "known"],
    queryFn: foodApi.getKnownFoods,
    staleTime: 300_000,
  });
}

export function useMealDefaults() {
  return useQuery({
    queryKey: [FOOD_KEY, "defaults"],
    queryFn: foodApi.getMealDefaults,
    staleTime: 300_000,
  });
}

export function useAnalyzePhoto() {
  return useMutation({
    mutationFn: ({ file, notes }: { file: File; notes?: string }) =>
      foodApi.analyzePhoto(file, notes),
  });
}

export function useSuggestNutrition() {
  return useMutation({
    mutationFn: (req: NutritionSuggestionRequest) => foodApi.suggestNutrition(req),
  });
}

export function useFoodTemplates(q?: string) {
  return useQuery({
    queryKey: [FOOD_KEY, "templates", q ?? ""],
    queryFn: () => foodApi.getTemplates(q),
  });
}

export function useCreateFoodTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: foodApi.createTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: [FOOD_KEY, "templates"] }),
  });
}

export function useUpdateFoodTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & FoodTemplateUpdate) =>
      foodApi.updateTemplate(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [FOOD_KEY, "templates"] }),
  });
}

export function useDeleteFoodTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: foodApi.deleteTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: [FOOD_KEY, "templates"] }),
  });
}

export function useScaleTemplate() {
  return useMutation({
    mutationFn: ({ templateId, targetAmount }: { templateId: number; targetAmount: number }) =>
      foodApi.scaleTemplate(templateId, targetAmount),
  });
}
