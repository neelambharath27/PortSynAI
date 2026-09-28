import { api } from "./api";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  container_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function fetchAlerts(unreadOnly = false): Promise<Alert[]> {
  const response = await api.get<Alert[]>("/alerts", {
    params: unreadOnly ? { unread_only: true } : undefined,
  });

  return response.data;
}

export async function markAlertRead(alertId: string): Promise<Alert> {
  const response = await api.put<Alert>(`/alerts/${alertId}/read`);
  return response.data;
}