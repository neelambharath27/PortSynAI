import { api, API_BASE_URL, tokenStorage } from "./api";
import type { RiskAssessment, RiskLevel, RiskSnapshot } from "../types/risk";

export async function fetchRiskAssessments(params?: {
  riskLevel?: RiskLevel;
  limit?: number;
}): Promise<RiskAssessment[]> {
  const { data } = await api.get<RiskAssessment[]>("/risk-assessment", {
    params: { risk_level: params?.riskLevel, limit: params?.limit ?? 100 },
  });
  return data;
}

export async function fetchContainerRiskAssessment(containerId: string): Promise<RiskAssessment> {
  const { data } = await api.get<RiskAssessment>(`/risk-assessment/${containerId}`);
  return data;
}

export async function triggerRiskAssessment(containerId: string): Promise<RiskAssessment> {
  const { data } = await api.post<RiskAssessment>("/risk-assessment", {
    container_id: containerId,
  });
  return data;
}

export function buildRiskSocketUrl(): string {
  const token = tokenStorage.getAccess() ?? "";
  const wsBase = API_BASE_URL.replace(/^http/, "ws");
  return `${wsBase}/risk-assessment/ws?token=${encodeURIComponent(token)}`;
}

export type { RiskSnapshot };
