"""seed_document_permissions

Revision ID: 70425760340f
Revises: 7706c080ed6b
Create Date: 2026-08-05 11:19:54.136412

"""

from typing import Sequence, Union

import uuid
from datetime import datetime

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "70425760340f"
down_revision: Union[str, None] = "7706c080ed6b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    now = datetime.utcnow()
    new_permissions = [
        {
            "id": uuid.uuid4(),
            "codename": "manage_documents",
            "display_name": "Manage Documents",
            "description": "Full access to delete and retry document processing",
            "module": "Documents",
            "created_at": now,
        },
        {
            "id": uuid.uuid4(),
            "codename": "upload_documents",
            "display_name": "Upload Documents",
            "description": "Upload new documents to the intelligence pipeline",
            "module": "Documents",
            "created_at": now,
        },
        {
            "id": uuid.uuid4(),
            "codename": "view_documents",
            "display_name": "View Documents",
            "description": "Read parsed document chunks and metadata",
            "module": "Documents",
            "created_at": now,
        },
    ]

    for p in new_permissions:
        op.execute(
            f"INSERT INTO permissions (id, codename, display_name, description, module, created_at) VALUES ('{p['id']}', '{p['codename']}', '{p['display_name']}', '{p['description']}', '{p['module']}', '{p['created_at']}') ON CONFLICT (codename) DO NOTHING"
        )


def downgrade() -> None:
    op.execute(
        "DELETE FROM role_permissions WHERE permission_codename IN ('manage_documents', 'upload_documents', 'view_documents')"
    )
    op.execute(
        "DELETE FROM permissions WHERE codename IN ('manage_documents', 'upload_documents', 'view_documents')"
    )
