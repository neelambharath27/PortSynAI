import { api } from "./api";

export interface AnomalySensor {
  temperature: number;
  humidity: number;
  battery_level: number;
  gps_valid: boolean;
  door_status: string;
  movement_status: string;
  recorded_at: string;
}

export interface AnomalyResult {
  container_id: string;
  container_code: string;
  is_anomaly: boolean;
  anomaly_score: number;
  confidence: number;
  risk_level: string;
  anomaly_type: string | null;
  sensor: AnomalySensor;
  stored_anomaly_id: string | null;
}

export interface RecentAnomaly {
  id: string;
  container_id: string;
  container_code: string;
  anomaly_type: string;
  confidence: number;
  risk_level: string;
  detected_at: string;
  resolved: boolean;
}

export interface AnomalyContainer {
  id: string;
  container_code: string;
}

export async function detectContainerAnomaly(
  containerId: string,
): Promise<AnomalyResult> {
  const response = await api.get<AnomalyResult>(
    `/anomaly-detection/${containerId}`,
  );

  return response.data;
}

export async function fetchRecentAnomalies(
  limit = 10,
): Promise<RecentAnomaly[]> {
  const response = await api.get<RecentAnomaly[]>(
    `/anomaly-detection/history/recent?limit=${limit}`,
  );

  return response.data;
}

export async function fetchAnomalyContainers(): Promise<
  AnomalyContainer[]
> {
  const response = await api.get("/tracking/live");

  const payload = response.data;

  const rows = Array.isArray(payload)
    ? payload
    : payload?.items ??
      payload?.data ??
      payload?.containers ??
      [];

  return rows
    .map((item: any) => ({
      id: item.container_id ?? item.id ?? "",
      container_code:
        item.container_code ??
        item.containerCode ??
        item.code ??
        "",
    }))
    .filter(
      (item: AnomalyContainer) =>
        item.id && item.container_code,
    );
}