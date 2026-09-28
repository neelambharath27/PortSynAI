import { api } from "./api";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuditLogSummary {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  log_metadata: Record<string, unknown>;
  created_at: string;
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const response = await api.get<AdminUser[]>("/users");
  return response.data;
}

export async function fetchAdminAuditLogs(
  limit = 100,
): Promise<AuditLogSummary[]> {
  const response = await api.get<AuditLogSummary[]>(
    "/admin/system-logs",
    {
      params: { limit },
    },
  );

  return response.data;
}