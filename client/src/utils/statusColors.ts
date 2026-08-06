import type { ContainerStatus } from "../types/tracking";

export const STATUS_HEX: Record<ContainerStatus, string> = {
  moving: "#22D3EE",
  delayed: "#F59E0B",
  cleared: "#10B981",
  high_risk: "#EF4444",
  idle: "#94A3B8",
};

export const STATUS_TONE: Record<
  ContainerStatus,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  moving: "info",
  delayed: "warning",
  cleared: "success",
  high_risk: "danger",
  idle: "neutral",
};
