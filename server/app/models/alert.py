import uuid
from datetime import datetime, timezone

from sqlalchemy import String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.enums import AlertSeverity


def _uuid() -> str:
    return str(uuid.uuid4())


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    type: Mapped[str] = mapped_column(String(80), nullable=False)
    severity: Mapped[AlertSeverity] = mapped_column(default=AlertSeverity.INFO)
    container_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("containers.id"), nullable=True)
    message: Mapped[str] = mapped_column(String(255), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
