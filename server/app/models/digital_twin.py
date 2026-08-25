from datetime import datetime, timezone

from sqlalchemy import String, Float, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.enums import ConnectivityStatus, DoorStatus, TwinRiskLevel


class DigitalTwin(Base):
    """Persisted latest-known state of a container's Digital Twin.

    This is the durable side of the twin: the in-memory simulator
    (`app.services.digital_twin_service`) ticks every second and keeps this
    row up to date so a REST client always sees a recent snapshot even if it
    never opens the WebSocket. Live, sub-second updates are pushed over
    `/ws/digital-twin/{container_id}` and are not all persisted individually.
    """

    __tablename__ = "digital_twins"

    container_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("containers.id"), primary_key=True
    )

    temperature: Mapped[float] = mapped_column(Float, default=24.0)
    humidity: Mapped[float] = mapped_column(Float, default=55.0)
    battery: Mapped[float] = mapped_column(Float, default=95.0)
    speed: Mapped[float] = mapped_column(Float, default=15.0)

    latitude: Mapped[float] = mapped_column(Float, default=0.0)
    longitude: Mapped[float] = mapped_column(Float, default=0.0)

    door_status: Mapped[DoorStatus] = mapped_column(default=DoorStatus.CLOSED)
    gps_status: Mapped[ConnectivityStatus] = mapped_column(
        default=ConnectivityStatus.CONNECTED
    )
    rfid_status: Mapped[ConnectivityStatus] = mapped_column(
        default=ConnectivityStatus.CONNECTED
    )

    health_score: Mapped[float] = mapped_column(Float, default=100.0)
    risk_level: Mapped[TwinRiskLevel] = mapped_column(default=TwinRiskLevel.LOW)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
