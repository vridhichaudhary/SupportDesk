"""seed_enterprise_team_permissions

Revision ID: f0aee41cb77e
Revises: 52897686fa4b
Create Date: 2026-08-03 12:53:26.832468

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f0aee41cb77e'
down_revision: Union[str, Sequence[str], None] = '52897686fa4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy.orm import Session
    from sqlalchemy import text

    bind = op.get_bind()
    session = Session(bind=bind)

    new_permissions = [
        {"codename": "manage_departments", "display_name": "Manage Departments", "module": "Organization", "description": "Create, update, and delete organizational departments"},
        {"codename": "manage_skills", "display_name": "Manage Skills", "module": "Users", "description": "Create and assign agent skills and proficiency levels"},
        {"codename": "manage_availability", "display_name": "Manage Availability", "module": "Users", "description": "Update working hours and agent availability statuses"},
        {"codename": "view_agent_profiles", "display_name": "View Agent Profiles", "module": "Users", "description": "View agent details, skills, capacity, and status"},
        {"codename": "manage_team_members", "display_name": "Manage Team Members", "module": "Teams", "description": "Add or remove agents from teams"},
        {"codename": "view_team_statistics", "display_name": "View Team Statistics", "module": "Teams", "description": "View team capacity and aggregate metrics"},
    ]

    for p in new_permissions:
        session.execute(
            text(
                "INSERT INTO permissions (id, codename, display_name, description, module) "
                "VALUES (gen_random_uuid(), :codename, :display_name, :description, :module) "
                "ON CONFLICT (codename) DO NOTHING"
            ),
            p
        )

    # Re-apply DEFAULT_ROLE_PERMISSIONS to system roles
    from src.core.permissions import DEFAULT_ROLE_PERMISSIONS
    
    roles = session.execute(text("SELECT id, name FROM roles WHERE is_system = true")).fetchall()
    role_map = {r.name: r.id for r in roles}

    for role_enum, codenames in DEFAULT_ROLE_PERMISSIONS.items():
        role_id = role_map.get(role_enum.value)
        if not role_id:
            continue
        for codename in codenames:
            session.execute(
                text(
                    "INSERT INTO role_permissions (role_id, permission_codename) "
                    "VALUES (:role_id, :codename) "
                    "ON CONFLICT (role_id, permission_codename) DO NOTHING"
                ),
                {"role_id": role_id, "codename": codename}
            )

    session.commit()


def downgrade() -> None:
    from sqlalchemy.orm import Session
    from sqlalchemy import text
    
    bind = op.get_bind()
    session = Session(bind=bind)
    
    codenames_to_remove = [
        "manage_departments", "manage_skills", "manage_availability",
        "view_agent_profiles", "manage_team_members", "view_team_statistics"
    ]
    
    for codename in codenames_to_remove:
        session.execute(
            text("DELETE FROM permissions WHERE codename = :codename"),
            {"codename": codename}
        )
    session.commit()
