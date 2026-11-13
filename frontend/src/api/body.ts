import { api } from "./client";
import type {
  BodyProfile,
  BodyProfileCreate,
  BodyProfileUpdate,
  BodyMeasurement,
  BodyMeasurementCreate,
  BodyMeasurementUpdate,
} from "../types";

export const bodyApi = {
  getProfile: () => api.get<BodyProfile>("/body/profile"),
  createProfile: (data: BodyProfileCreate) => api.post<BodyProfile>("/body/profile", data),
  updateProfile: (data: BodyProfileUpdate) => api.patch<BodyProfile>("/body/profile", data),
  getMeasurements: () => api.get<BodyMeasurement[]>("/body/measurements"),
  createMeasurement: (data: BodyMeasurementCreate) =>
    api.post<BodyMeasurement>("/body/measurements", data),
  updateMeasurement: (id: number, data: BodyMeasurementUpdate) =>
    api.patch<BodyMeasurement>(`/body/measurements/${id}`, data),
  deleteMeasurement: (id: number) => api.delete<void>(`/body/measurements/${id}`),
};
