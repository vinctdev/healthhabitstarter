import { api } from "./client";
import type {
  FoodEntry,
  FoodEntryCreate,
  FoodEntryUpdate,
  DaySummary,
  FoodStreakData,
  WeeklyEntry,
  AveragesData,
  RecentMeal,
  KnownFood,
  PhotoAnalysisResult,
  NutritionSuggestionRequest,
  MealDefaults,
  FoodTemplate,
  FoodTemplateCreate,
  FoodTemplateUpdate,
  FoodExport,
} from "../types";

export const foodApi = {
  getByDate: (date: string) => api.get<FoodEntry[]>(`/food/${date}`),
  create: (entry: FoodEntryCreate) => api.post<FoodEntry>("/food/", entry),
  update: (id: number, data: FoodEntryUpdate) => api.patch<FoodEntry>(`/food/${id}`, data),
  remove: (id: number) => api.delete<void>(`/food/${id}`),
  getSummary: (date: string) => api.get<DaySummary>(`/food/${date}/summary`),
  getStreak: () => api.get<FoodStreakData>("/food/streak"),
  getWeekly: () => api.get<WeeklyEntry[]>("/food/weekly"),
  getAverages: () => api.get<AveragesData>("/food/averages"),
  getRecent: () => api.get<RecentMeal[]>("/food/recent"),
  getKnownFoods: () => api.get<KnownFood[]>("/food/foods-db"),
  getMealDefaults: () => api.get<MealDefaults>("/food/defaults/time"),
  analyzePhoto: (file: File, notes?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (notes) formData.append("notes", notes);
    return api.upload<PhotoAnalysisResult>("/food/analyze-photo", formData);
  },
  suggestNutrition: (req: NutritionSuggestionRequest) =>
    api.post<PhotoAnalysisResult>("/food/suggest-nutrition", req),
  getTemplates: (q?: string) =>
    api.get<FoodTemplate[]>(`/food/templates${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createTemplate: (data: FoodTemplateCreate) => api.post<FoodTemplate>("/food/templates", data),
  updateTemplate: (id: number, data: FoodTemplateUpdate) =>
    api.patch<FoodTemplate>(`/food/templates/${id}`, data),
  deleteTemplate: (id: number) => api.delete<void>(`/food/templates/${id}`),
  scaleTemplate: (templateId: number, targetAmount: number) =>
    api.post<FoodTemplate>("/food/templates/scale", {
      template_id: templateId,
      target_amount: targetAmount,
    }),
  exportFood: (start: string, end: string) =>
    api.get<FoodExport>(`/food/export?start=${start}&end=${end}`),
};
