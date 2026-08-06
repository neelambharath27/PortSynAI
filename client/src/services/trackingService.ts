import { api, API_BASE_URL, tokenStorage } from "./api";
import type { RouteHistory, TrackingSnapshot } from "../types/tracking";

export async function fetchLiveSnapshot(): Promise<TrackingSnapshot> {
  const { data } = await api.get<TrackingSnapshot>("/tracking/live");
  return data;
}

export async function fetchRouteHistory(
  containerId: string,
): Promise<RouteHistory> {
  const { data } = await api.get<RouteHistory>(
    `/tracking/${containerId}/history`,
  );
  return data;
}

export function buildTrackingSocketUrl(): string {
  const token = tokenStorage.getAccess() ?? "";
  const wsBase = API_BASE_URL.replace(/^http/, "ws");
  return `${wsBase}/tracking/ws?token=${encodeURIComponent(token)}`;
}
