import { api } from "./api";
import type { DashboardSummary } from "../types/dashboard";

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>("/dashboard/summary");
  return data;
}
