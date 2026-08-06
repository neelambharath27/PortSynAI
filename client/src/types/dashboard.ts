export interface DashboardCounts {
  total_containers: number;
  moving: number;
  delayed: number;
  high_risk: number;
  cleared: number;
  inspection_pending: number;
  today_shipments: number;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface ClearanceDistribution {
  approved: number;
  pending: number;
  rejected: number;
}

export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
}

export interface RecentAlert {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  message: string;
  category: "blockchain" | "inspection" | "risk" | string;
  timestamp: string;
}

export interface DashboardSummary {
  counts: DashboardCounts;
  container_traffic: TrendPoint[];
  monthly_report: TrendPoint[];
  clearance_distribution: ClearanceDistribution;
  risk_distribution: RiskDistribution;
  recent_alerts: RecentAlert[];
  recent_activity: ActivityItem[];
}
