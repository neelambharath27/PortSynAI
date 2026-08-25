export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskFactor {
  factor: string;
  label: string;
  contribution: number;
  triggered: boolean;
  description: string;
}

export interface RiskAssessment {
  id: string;
  container_id: string;
  container_code: string | null;
  gps_score: number;
  rfid_score: number;
  sensor_score: number;
  manifest_score: number;
  yolo_score: number;
  delay_score: number;
  final_score: number;
  risk_level: RiskLevel;
  confidence: number;
  recommendation: string;
  risk_factors: RiskFactor[];
  computed_at: string;
}

export interface RiskSnapshot {
  type: "risk_snapshot";
  server_time: string;
  assessments: RiskAssessment[];
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const RISK_LEVEL_TONE: Record<
  RiskLevel,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  low: "success",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

export const RISK_LEVEL_HEX: Record<RiskLevel, string> = {
  low: "#10B981",
  medium: "#F59E0B",
  high: "#EF4444",
  critical: "#991B1B",
};

// Gauge bands per the spec: green 0-30, yellow 31-60, orange 61-80, red 81-100.
export const GAUGE_BANDS = [
  { max: 30, color: "#10B981" },
  { max: 60, color: "#F59E0B" },
  { max: 80, color: "#F97316" },
  { max: 100, color: "#EF4444" },
];

export function gaugeColorForScore(score: number): string {
  const band = GAUGE_BANDS.find((b) => score <= b.max);
  return band ? band.color : GAUGE_BANDS[GAUGE_BANDS.length - 1].color;
}
