import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bodyApi } from "../api/body";
import type { BodyProfileUpdate, BodyMeasurementUpdate } from "../types";

const BODY_KEY = "body";

export function useBodyProfile() {
  return useQuery({
    queryKey: [BODY_KEY, "profile"],
    queryFn: bodyApi.getProfile,
  });
}

export function useCreateBodyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bodyApi.createProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: [BODY_KEY] }),
  });
}

export function useUpdateBodyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BodyProfileUpdate) => bodyApi.updateProfile(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [BODY_KEY] }),
  });
}

export function useBodyMeasurements() {
  return useQuery({
    queryKey: [BODY_KEY, "measurements"],
    queryFn: bodyApi.getMeasurements,
  });
}

export function useCreateBodyMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bodyApi.createMeasurement,
    onSuccess: () => qc.invalidateQueries({ queryKey: [BODY_KEY] }),
  });
}

export function useUpdateBodyMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & BodyMeasurementUpdate) =>
      bodyApi.updateMeasurement(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [BODY_KEY] }),
  });
}

export function useDeleteBodyMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bodyApi.deleteMeasurement,
    onSuccess: () => qc.invalidateQueries({ queryKey: [BODY_KEY] }),
  });
}
