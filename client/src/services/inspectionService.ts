import { api, API_BASE_URL, tokenStorage } from "./api";
import type {
  InspectionListItem,
  InspectionOut,
  InspectionSummary,
} from "../types/inspection";

// The FastAPI static mount for uploaded images lives at the server root
// (/storage), not under the /api/v1 prefix that every other endpoint uses.
const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
export const STORAGE_BASE_URL = `${SERVER_ORIGIN}/storage`;

export function inspectionImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  return `${STORAGE_BASE_URL}/${imagePath}`;
}

export async function uploadInspectionImage(
  containerId: string,
  file: File,
): Promise<InspectionOut> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<InspectionOut>("/cargo-inspection/upload", formData, {
    params: { container_id: containerId },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchInspectionHistory(params: {
  containerId?: string;
  status?: string;
  threatLevel?: string;
  limit?: number;
}): Promise<InspectionListItem[]> {
  const { data } = await api.get<InspectionListItem[]>("/cargo-inspection/history", {
    params: {
      container_id: params.containerId,
      status: params.status,
      threat_level: params.threatLevel,
      limit: params.limit ?? 50,
    },
  });
  return data;
}

export async function fetchInspection(id: string): Promise<InspectionOut> {
  const { data } = await api.get<InspectionOut>(`/cargo-inspection/${id}`);
  return data;
}

export async function fetchInspectionSummary(): Promise<InspectionSummary> {
  const { data } = await api.get<InspectionSummary>("/cargo-inspection/stats/summary");
  return data;
}

export async function downloadInspectionReport(
  id: string,
  containerCode: string,
): Promise<void> {
  const response = await api.get(`/cargo-inspection/${id}/report`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = `inspection-${containerCode}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function buildInspectionSocketUrl(inspectionId: string): string {
  const token = tokenStorage.getAccess() ?? "";
  const wsBase = API_BASE_URL.replace(/^http/, "ws");
  return `${wsBase}/cargo-inspection/ws/${inspectionId}?token=${encodeURIComponent(token)}`;
}
