import uuid
from datetime import datetime, timezone

from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.enums import ClearanceStatus


def _uuid() -> str:
    return str(uuid.uuid4())


class Clearance(Base):
    __tablename__ = "clearances"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    container_id: Mapped[str] = mapped_column(String(36), ForeignKey("containers.id"), nullable=False)
    risk_score_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("risk_scores.id"), nullable=True)
    officer_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    status: Mapped[ClearanceStatus] = mapped_column(default=ClearanceStatus.PENDING)
    blockchain_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    transaction_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
