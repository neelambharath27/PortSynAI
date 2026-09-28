from pydantic import BaseModel, ConfigDict

from app.models.enums import ClearanceDecision, RiskLevel


class ClearanceDecisionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    container_id: str
    container_code: str | None = None

    risk_score: float
    risk_level: RiskLevel

    decision: ClearanceDecision
    reason: str