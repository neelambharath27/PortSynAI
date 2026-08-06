from datetime import datetime

from pydantic import BaseModel


class DashboardCounts(BaseModel):
    total_containers: int
    moving: int
    delayed: int
    high_risk: int
    cleared: int
    inspection_pending: int
    today_shipments: int


class TrendPoint(BaseModel):
    label: str
    value: int


class ClearanceDistribution(BaseModel):
    approved: int
    pending: int
    rejected: int


class RiskDistribution(BaseModel):
    low: int
    medium: int
    high: int


class RecentAlertOut(BaseModel):
    id: str
    type: str
    severity: str
    message: str
    is_read: bool
    created_at: datetime


class ActivityItem(BaseModel):
    id: str
    message: str
    category: str
    timestamp: datetime


class DashboardSummary(BaseModel):
    counts: DashboardCounts
    container_traffic: list[TrendPoint]
    monthly_report: list[TrendPoint]
    clearance_distribution: ClearanceDistribution
    risk_distribution: RiskDistribution
    recent_alerts: list[RecentAlertOut]
    recent_activity: list[ActivityItem]
