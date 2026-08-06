import uuid

from sqlalchemy import String, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Manifest(Base):
    __tablename__ = "manifests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    container_id: Mapped[str] = mapped_column(String(36), ForeignKey("containers.id"), nullable=False)
    declared_goods: Mapped[str] = mapped_column(String(255), nullable=False)
    declared_weight: Mapped[float] = mapped_column(Float, default=0.0)
    hs_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    consignee: Mapped[str | None] = mapped_column(String(160), nullable=True)
    consignor: Mapped[str | None] = mapped_column(String(160), nullable=True)
