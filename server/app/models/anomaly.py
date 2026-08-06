import uuid
from datetime import datetime, timezone

from sqlalchemy import String, ForeignKey, DateTime, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.enums import AnomalyType, RiskLevel


def _uuid() -> str:
    return str(uuid.uuid4())


class Anomaly(Base):
    __tablename__ = "anomalies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    container_id: Mapped[str] = mapped_column(String(36), ForeignKey("containers.id"), nullable=False)
    anomaly_type: Mapped[AnomalyType] = mapped_column(nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    risk_level: Mapped[RiskLevel] = mapped_column(default=RiskLevel.LOW)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
