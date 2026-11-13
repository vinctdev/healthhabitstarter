import { useQuery } from "@tanstack/react-query";
import { streaksApi } from "../api/streaks";

export function useStreak() {
  return useQuery({
    queryKey: ["streak"],
    queryFn: streaksApi.get,
    staleTime: 60_000,
  });
}
