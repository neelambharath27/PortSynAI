import { api } from "./api";

export async function markAlertRead(alertId: string): Promise<void> {
  await api.put(`/alerts/${alertId}/read`);
}
