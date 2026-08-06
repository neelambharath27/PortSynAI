import uuid

from sqlalchemy import String, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Port(Base):
    __tablename__ = "ports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
    country: Mapped[str] = mapped_column(String(80), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    ships: Mapped[list["Ship"]] = relationship(back_populates="port")  # noqa: F821
