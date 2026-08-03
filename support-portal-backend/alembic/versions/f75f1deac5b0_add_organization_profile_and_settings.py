"""Add Organization profile and settings

Revision ID: f75f1deac5b0
Revises: 6dee3c3ed5e5
Create Date: 2026-08-02 20:04:08.683055

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "f75f1deac5b0"
down_revision: Union[str, Sequence[str], None] = "6dee3c3ed5e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create Enum manually
    organization_status = postgresql.ENUM("ACTIVE", "SUSPENDED", name="organizationstatus")
    organization_status.create(op.get_bind())

    op.add_column(
        "organizations",
        sa.Column(
            "status",
            sa.Enum("ACTIVE", "SUSPENDED", name="organizationstatus"),
            server_default="ACTIVE",
            nullable=False,
        ),
    )
    op.add_column(
        "organizations",
        sa.Column("timezone", sa.String(length=50), server_default="UTC", nullable=False),
    )
    op.add_column("organizations", sa.Column("support_email", sa.String(length=255), nullable=True))
    op.add_column("organizations", sa.Column("support_phone", sa.String(length=50), nullable=True))
    op.add_column("organizations", sa.Column("website", sa.String(length=255), nullable=True))
    op.add_column("organizations", sa.Column("address", sa.Text(), nullable=True))
    op.add_column("organizations", sa.Column("logo_url", sa.String(length=1024), nullable=True))
    op.add_column(
        "organizations",
        sa.Column(
            "settings", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("organizations", "settings")
    op.drop_column("organizations", "logo_url")
    op.drop_column("organizations", "address")
    op.drop_column("organizations", "website")
    op.drop_column("organizations", "support_phone")
    op.drop_column("organizations", "support_email")
    op.drop_column("organizations", "timezone")
    op.drop_column("organizations", "status")

    # Drop Enum manually
    organization_status = postgresql.ENUM("ACTIVE", "SUSPENDED", name="organizationstatus")
    organization_status.drop(op.get_bind())
    # ### end Alembic commands ###
