"""Add ML anomaly scores to risk scores

Revision ID: 20196ea1e562
Revises: b571072e66ea
Create Date: 2026-08-25 19:15:15.118684

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20196ea1e562"
down_revision: Union[str, None] = "b571072e66ea"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add LSTM and Isolation Forest anomaly scores."""

    op.add_column(
        "risk_scores",
        sa.Column(
            "lstm_anomaly_score",
            sa.Float(),
            nullable=False,
            server_default="0.0",
        ),
    )

    op.add_column(
        "risk_scores",
        sa.Column(
            "isolation_forest_score",
            sa.Float(),
            nullable=False,
            server_default="0.0",
        ),
    )


def downgrade() -> None:
    """Remove LSTM and Isolation Forest anomaly scores."""

    op.drop_column(
        "risk_scores",
        "isolation_forest_score",
    )

    op.drop_column(
        "risk_scores",
        "lstm_anomaly_score",
    )