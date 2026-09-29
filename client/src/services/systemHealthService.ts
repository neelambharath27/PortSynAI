import { api } from "./api";

export type HealthStatus = "operational" | "degraded" | "down";

export interface HealthService {
  service: string;
  status: HealthStatus;
  response_ms?: number;
  message: string;
}

export interface SystemHealth {
  status: HealthStatus;
  timestamp: string;
  services: HealthService[];
}

export async function fetchSystemHealth(): Promise<SystemHealth> {
  const response = await api.get<SystemHealth>("/system-health");
  return response.data;
}