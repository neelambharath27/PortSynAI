"""add clearance decision

Revision ID: 20593ddbe26f
Revises: 20196ea1e562
Create Date: 2026-09-28 10:55:27.441749

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20593ddbe26f"
down_revision: Union[str, None] = "20196ea1e562"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add the customs clearance decision.

    Existing clearance records are initialized as HOLD so the
    new non-nullable column can be added safely.
    """

    clearance_decision = sa.Enum(
        "CLEAR",
        "INSPECT",
        "HOLD",
        name="clearancedecision",
    )

    clearance_decision.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "clearances",
        sa.Column(
            "decision",
            clearance_decision,
            nullable=True,
        ),
    )

    op.execute(
        "UPDATE clearances SET decision = 'HOLD' WHERE decision IS NULL"
    )

    op.alter_column(
        "clearances",
        "decision",
        existing_type=clearance_decision,
        nullable=False,
    )


def downgrade() -> None:
    """Remove the customs clearance decision."""

    op.drop_column(
        "clearances",
        "decision",
    )

    clearance_decision = sa.Enum(
        "CLEAR",
        "INSPECT",
        "HOLD",
        name="clearancedecision",
    )

    clearance_decision.drop(
        op.get_bind(),
        checkfirst=True,
    )