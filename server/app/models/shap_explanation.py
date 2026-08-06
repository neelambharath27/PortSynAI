import uuid

from sqlalchemy import String, ForeignKey, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class ShapExplanation(Base):
    __tablename__ = "shap_explanations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    risk_score_id: Mapped[str] = mapped_column(String(36), ForeignKey("risk_scores.id"), nullable=False)
    feature_name: Mapped[str] = mapped_column(String(80), nullable=False)
    contribution_value: Mapped[float] = mapped_column(Float, default=0.0)
    rank: Mapped[int] = mapped_column(Integer, default=0)
