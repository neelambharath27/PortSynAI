import uuid
from datetime import datetime, timezone

from sqlalchemy import String, ForeignKey, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.enums import RiskLevel


def _uuid() -> str:
    return str(uuid.uuid4())


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=_uuid,
    )

    container_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("containers.id"),
        nullable=False,
    )

    gps_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )

    rfid_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )

    sensor_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )

    manifest_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )

    yolo_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )

    # LSTM future sensor-state anomaly score
    lstm_anomaly_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )

    # Isolation Forest telemetry anomaly score
    isolation_forest_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )

    final_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )

    risk_level: Mapped[RiskLevel] = mapped_column(
        default=RiskLevel.LOW,
    )

    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )