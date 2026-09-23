from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import RiskLevel


class ShapContributionOut(BaseModel):
    feature: str
    label: str
    feature_value: float
    shap_value: float
    direction: str


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

    lstm_anomaly_score: float
    isolation_forest_score: float

    final_score: float
    risk_level: RiskLevel

    computed_at: datetime

    # SHAP explanation
    shap_base_value: float | None = None
    shap_probability: float | None = None
    shap_contributions: list[ShapContributionOut] = []


class RiskAssessmentRequest(BaseModel):
    """
    Manually trigger a risk assessment for one container.
    """

    container_id: str


class RiskSnapshot(BaseModel):
    type: str = "risk_snapshot"
    server_time: datetime
    assessments: list[RiskAssessmentOut]