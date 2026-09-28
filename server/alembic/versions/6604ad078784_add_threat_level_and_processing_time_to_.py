"""add threat level and processing time to inspections

Revision ID: 6604ad078784
Revises: 20593ddbe26f
Create Date: 2026-09-28 11:41:13.442426

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6604ad078784"
down_revision: Union[str, None] = "20593ddbe26f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing inspection records receive the safe defaults:
    # threat_level = NONE
    # processing_ms = NULL

    op.add_column(
        "inspections",
        sa.Column(
            "threat_level",
            sa.Enum(
                "NONE",
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL",
                name="threatlevel",
            ),
            nullable=True,
        ),
    )

    op.add_column(
        "inspections",
        sa.Column(
            "processing_ms",
            sa.Float(),
            nullable=True,
        ),
    )

    # Backfill existing inspection records.
    op.execute(
        """
        UPDATE inspections
        SET threat_level = 'NONE'
        WHERE threat_level IS NULL
        """
    )

    # Make threat_level mandatory after backfill.
    op.alter_column(
        "inspections",
        "threat_level",
        existing_type=sa.Enum(
            "NONE",
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL",
            name="threatlevel",
        ),
        nullable=False,
    )


def downgrade() -> None:
    op.drop_column("inspections", "processing_ms")
    op.drop_column("inspections", "threat_level")

    sa.Enum(
        "NONE",
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
        name="threatlevel",
    ).drop(op.get_bind(), checkfirst=True)