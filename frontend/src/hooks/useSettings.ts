import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "../api/settings";
import type { UserSettings } from "../types";
import { getDayStartHour, setDayStartHour } from "../utils/date";

const DEFAULTS: UserSettings = {
  wake_hour: 8,
  sleep_hour: 24,
  calorie_goal: 2000,
  day_start_hour: getDayStartHour(),
  sport_reasons: null,
  sport_goal: null,
};

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const settings = await settingsApi.get();
      setDayStartHour(settings.day_start_hour);
      return settings;
    },
    staleTime: 300_000,
    placeholderData: DEFAULTS,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.update,
    onSuccess: (data) => {
      const boundaryChanged = data.day_start_hour !== getDayStartHour();
      setDayStartHour(data.day_start_hour);
      qc.setQueryData(["settings"], data);
      // "Today" may now be a different date, so refetch all date-based data.
      if (boundaryChanged) void qc.invalidateQueries();
    },
  });
}
