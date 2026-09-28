import { api } from "./api";

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  log_metadata: Record<string, unknown>;
  created_at: string;
}

export async function fetchAuditLogs(
  limit = 100,
): Promise<AuditLog[]> {
  const { data } = await api.get<AuditLog[]>(
    "/admin/system-logs",
    {
      params: { limit },
    },
  );

  return data;
}