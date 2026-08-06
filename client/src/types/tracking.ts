export type ContainerStatus =
  | "moving"
  | "delayed"
  | "cleared"
  | "high_risk"
  | "idle";

export interface ContainerLive {
  id: string;
  container_code: string;
  status: ContainerStatus;
  cargo_type: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  origin_port: string | null;
  destination_port: string | null;
  ship_name: string | null;
  eta: string | null;
  distance_remaining_km: number | null;
  updated_at: string;
}

export interface TrackingSnapshot {
  type: "tracking_snapshot";
  server_time: string;
  containers: ContainerLive[];
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface RouteHistory {
  container_id: string;
  container_code: string;
  waypoints: RouteWaypoint[];
  eta_predicted: string | null;
  delay_probability: number;
}

export const STATUS_LABELS: Record<ContainerStatus, string> = {
  moving: "Moving",
  delayed: "Delayed",
  cleared: "Cleared",
  high_risk: "High Risk",
  idle: "Idle",
};
