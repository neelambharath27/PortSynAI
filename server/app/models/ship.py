import uuid
from datetime import datetime

from sqlalchemy import String, ForeignKey, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import ShipStatus


def _uuid() -> str:
    return str(uuid.uuid4())


class Ship(Base):
    __tablename__ = "ships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    imo_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    port_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("ports.id"), nullable=True
    )
    status: Mapped[ShipStatus] = mapped_column(default=ShipStatus.EN_ROUTE)
    eta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, default=0)

    port: Mapped["Port"] = relationship(back_populates="ships")  # noqa: F821
    containers: Mapped[list["Container"]] = relationship(back_populates="ship")  # noqa: F821
