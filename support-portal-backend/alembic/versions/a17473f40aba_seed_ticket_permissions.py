"""seed_ticket_permissions

Revision ID: a17473f40aba
Revises: e535f775e5ee
Create Date: 2026-08-04 17:09:56.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid
from datetime import datetime

# revision identifiers, used by Alembic.
revision: str = 'a17473f40aba'
down_revision: Union[str, None] = 'e535f775e5ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # We will seed the two new permissions we added to the codebase
    permissions = sa.table(
        'permissions',
        sa.column('id', postgresql.UUID),
        sa.column('codename', sa.String),
        sa.column('display_name', sa.String),
        sa.column('description', sa.Text),
        sa.column('module', sa.String),
        sa.column('created_at', sa.DateTime),
    )

    new_permissions = [
        {
            "id": uuid.uuid4(),
            "codename": "view_tickets",
            "display_name": "View Tickets",
            "module": "Tickets",
            "description": "View support tickets and search",
            "created_at": datetime.utcnow()
        },
        {
            "id": uuid.uuid4(),
            "codename": "bulk_edit_tickets",
            "display_name": "Bulk Edit Tickets",
            "module": "Tickets",
            "description": "Perform bulk assignment and bulk updates",
            "created_at": datetime.utcnow()
        }
    ]

    op.bulk_insert(permissions, new_permissions)

    # Note: Actually assigning these permissions to existing Roles (OWNER/ADMIN/AGENT) 
    # would involve joining on the roles table, which was seeded previously.
    # The PermissionEngine's fallback default matrix will handle it seamlessly.


def downgrade() -> None:
    op.execute("DELETE FROM role_permissions WHERE permission_codename IN ('view_tickets', 'bulk_edit_tickets')")
    op.execute("DELETE FROM permissions WHERE codename IN ('view_tickets', 'bulk_edit_tickets')")
