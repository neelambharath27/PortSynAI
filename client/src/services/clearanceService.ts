import { api } from "./api";

export interface ClearanceDecision {
  container_id: string;
  container_code: string;
  risk_score: number;
  risk_level: string;
  decision: "clear" | "inspect" | "hold";
  reason: string;
}

export interface ClearanceRecord extends ClearanceDecision {
  status: "pending" | "approved" | "rejected";
  transaction_id: string | null;
  blockchain_hash: string | null;
  officer_id: string | null;
  timestamp: string | null;
  audit_action: string | null;
  audit_timestamp: string | null;
}

export interface LiveContainer {
  id: string;
  container_code: string;
}

export async function fetchClearanceDecision(
  containerId: string,
): Promise<ClearanceDecision> {
  const response = await api.get<ClearanceDecision>(
    `/clearance-decision/${containerId}`,
  );

  return response.data;
}

export async function fetchClearanceRecord(
  containerId: string,
): Promise<ClearanceRecord> {
  const response = await api.get<ClearanceRecord>(
    `/clearance-decision/${containerId}/record`,
  );

  return response.data;
}

export async function createClearanceDecision(
  containerId: string,
): Promise<ClearanceDecision> {
  const response = await api.post<ClearanceDecision>(
    `/clearance-decision/${containerId}/create`,
  );

  return response.data;
}

export async function approveClearance(
  containerId: string,
): Promise<ClearanceDecision> {
  const response = await api.post<ClearanceDecision>(
    `/clearance-decision/${containerId}/approve`,
  );

  return response.data;
}

export async function rejectClearance(
  containerId: string,
): Promise<ClearanceDecision> {
  const response = await api.post<ClearanceDecision>(
    `/clearance-decision/${containerId}/reject`,
  );

  return response.data;
}

export async function fetchLiveContainers(): Promise<LiveContainer[]> {
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
      (item: LiveContainer) => item.id && item.container_code,
    );
}