import uuid
from datetime import datetime, timezone

from sqlalchemy import String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.enums import InspectionStatus


def _uuid() -> str:
    return str(uuid.uuid4())


class Inspection(Base):
    __tablename__ = "inspections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    container_id: Mapped[str] = mapped_column(String(36), ForeignKey("containers.id"), nullable=False)
    image_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    detected_objects: Mapped[list] = mapped_column(JSON, default=list)
    inspector_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    status: Mapped[InspectionStatus] = mapped_column(default=InspectionStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
