from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import RiskLevel


class RiskFactor(BaseModel):
    factor: str
    label: str
    contribution: float  # signed points contributed to the final 0-100 score
    triggered: bool
    description: str


class RiskAssessmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    container_id: str
    container_code: str | None = None
    gps_score: float
    rfid_score: float
    sensor_score: float
    manifest_score: float
    yolo_score: float
    delay_score: float
    final_score: float
    risk_level: RiskLevel
    confidence: float
    recommendation: str
    risk_factors: list[RiskFactor]
    computed_at: datetime


class RiskAssessmentRequest(BaseModel):
    """Manually trigger a (re)assessment for one container. All fields are
    optional overrides — omitted ones fall back to the container's live
    sensor/tracking/inspection data, same as the automatic background
    scoring loop uses."""

    container_id: str


class RiskSnapshot(BaseModel):
    type: str = "risk_snapshot"
    server_time: datetime
    assessments: list[RiskAssessmentOut]
