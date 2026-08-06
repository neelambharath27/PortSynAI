import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Float, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import ContainerStatus


def _uuid() -> str:
    return str(uuid.uuid4())


class Container(Base):
    __tablename__ = "containers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    container_code: Mapped[str] = mapped_column(String(24), unique=True, nullable=False)
    ship_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("ships.id"), nullable=True)
    origin_port_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("ports.id"), nullable=True)
    destination_port_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("ports.id"), nullable=True)

    current_lat: Mapped[float] = mapped_column(Float, default=0.0)
    current_lng: Mapped[float] = mapped_column(Float, default=0.0)
    speed: Mapped[float] = mapped_column(Float, default=0.0)
    heading: Mapped[float] = mapped_column(Float, default=0.0)

    status: Mapped[ContainerStatus] = mapped_column(default=ContainerStatus.MOVING)
    cargo_type: Mapped[str] = mapped_column(String(80), default="General")
    weight_kg: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    ship: Mapped["Ship"] = relationship(back_populates="containers")  # noqa: F821
