export type ThreatLevel = "none" | "low" | "medium" | "high" | "critical";
export type InspectionStatus = "pending" | "passed" | "flagged";

export interface DetectionBox {
  label: string;
  category: string;
  confidence: number;
  threat_level: ThreatLevel;
  bbox: [number, number, number, number]; // x, y, w, h normalized 0-1
}

export interface InspectionOut {
  id: string;
  container_id: string;
  image_path: string | null;
  detected_objects: DetectionBox[];
  inspector_id: string | null;
  inspector_name: string | null;
  status: InspectionStatus;
  threat_level: ThreatLevel;
  processing_ms: number | null;
  created_at: string;
}

export interface InspectionListItem {
  id: string;
  container_id: string;
  container_code: string | null;
  status: InspectionStatus;
  threat_level: ThreatLevel;
  object_count: number;
  inspector_name: string | null;
  created_at: string;
}

export interface InspectionSummary {
  total_inspections: number;
  flagged: number;
  passed: number;
  pending: number;
  by_threat_level: Record<string, number>;
}

export interface InspectionProgress {
  type: "inspection_progress";
  inspection_id: string;
  stage: "uploading" | "preprocessing" | "running_inference" | "postprocessing" | "complete";
  progress: number;
  message: string;
  result: InspectionOut | null;
}

export const THREAT_LABELS: Record<ThreatLevel, string> = {
  none: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const THREAT_TONE: Record<
  ThreatLevel,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  none: "neutral",
  low: "success",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

export const THREAT_HEX: Record<ThreatLevel, string> = {
  none: "#94A3B8",
  low: "#10B981",
  medium: "#F59E0B",
  high: "#EF4444",
  critical: "#991B1B",
};

export const STATUS_LABELS: Record<InspectionStatus, string> = {
  pending: "Processing",
  passed: "Passed",
  flagged: "Flagged",
};

export const STATUS_TONE: Record<
  InspectionStatus,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  pending: "info",
  passed: "success",
  flagged: "danger",
};
