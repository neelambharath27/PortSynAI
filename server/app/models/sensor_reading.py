import uuid
from datetime import datetime, timezone

from sqlalchemy import String, ForeignKey, DateTime, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.enums import DoorStatus, MovementStatus


def _uuid() -> str:
    return str(uuid.uuid4())


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    container_id: Mapped[str] = mapped_column(String(36), ForeignKey("containers.id"), nullable=False)
    temperature: Mapped[float] = mapped_column(Float, default=0.0)
    humidity: Mapped[float] = mapped_column(Float, default=0.0)
    battery_level: Mapped[float] = mapped_column(Float, default=100.0)
    door_status: Mapped[DoorStatus] = mapped_column(default=DoorStatus.CLOSED)
    movement_status: Mapped[MovementStatus] = mapped_column(default=MovementStatus.MOVING)
    gps_valid: Mapped[bool] = mapped_column(Boolean, default=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
