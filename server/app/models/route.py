import uuid
from datetime import datetime

from sqlalchemy import String, ForeignKey, DateTime, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    container_id: Mapped[str] = mapped_column(String(36), ForeignKey("containers.id"), nullable=False)
    waypoints: Mapped[list] = mapped_column(JSON, default=list)
    predicted_route: Mapped[list] = mapped_column(JSON, default=list)
    eta_actual: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    eta_predicted: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delay_probability: Mapped[float] = mapped_column(Float, default=0.0)
