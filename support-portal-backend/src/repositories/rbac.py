"""
RBAC Repository
===============
Data access layer for Permissions, Roles, RolePermissions, and UserRoleAssignments.

All queries that involve cross-entity lookups are kept here.
No business logic lives in this layer.
"""
from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import Permission, Role, RolePermission, UserRole, UserRoleAssignment


class PermissionRepository:
    """Read-only access to the permission registry."""

    def list_all(self, db: Session) -> List[Permission]:
        stmt = select(Permission).order_by(Permission.module, Permission.codename)
        return list(db.execute(stmt).scalars().all())

    def get_by_codename(self, db: Session, codename: str) -> Optional[Permission]:
        stmt = select(Permission).where(Permission.codename == codename)
        return db.execute(stmt).scalar_one_or_none()


class RoleRepository:
    """CRUD for the roles table."""

    def get_system_roles(self, db: Session) -> List[Role]:
        """Returns the three immutable system roles (OWNER, ADMIN, AGENT)."""
        stmt = select(Role).where(Role.is_system.is_(True)).order_by(Role.name)
        return list(db.execute(stmt).scalars().all())

    def get_by_name_system(self, db: Session, name: str) -> Optional[Role]:
        """Fetches a system role by its name (e.g. 'OWNER')."""
        stmt = select(Role).where(Role.is_system.is_(True), Role.name == name)
        return db.execute(stmt).scalar_one_or_none()

    def get_org_custom_roles(self, db: Session, org_id: uuid.UUID) -> List[Role]:
        """Returns all custom roles scoped to the given organization."""
        stmt = (
            select(Role)
            .where(Role.organization_id == org_id, Role.is_custom.is_(True))
            .order_by(Role.name)
        )
        return list(db.execute(stmt).scalars().all())

    def list_roles_for_org(self, db: Session, org_id: uuid.UUID) -> List[Role]:
        """Returns system roles + org custom roles."""
        stmt = select(Role).where(
            (Role.is_system.is_(True)) | (Role.organization_id == org_id)
        ).order_by(Role.is_system.desc(), Role.name)
        return list(db.execute(stmt).scalars().all())

    def get_by_id(self, db: Session, role_id: uuid.UUID) -> Optional[Role]:
        stmt = select(Role).where(Role.id == role_id)
        return db.execute(stmt).scalar_one_or_none()

    def create_custom_role(
        self,
        db: Session,
        org_id: uuid.UUID,
        name: str,
        description: Optional[str] = None,
    ) -> Role:
        role = Role(
            id=uuid.uuid4(),
            organization_id=org_id,
            name=name,
            description=description,
            is_system=False,
            is_custom=True,
        )
        db.add(role)
        db.flush()
        return role

    def update_custom_role(
        self,
        db: Session,
        role: Role,
        name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Role:
        if name is not None:
            role.name = name
        if description is not None:
            role.description = description
        db.add(role)
        db.flush()
        return role

    def delete(self, db: Session, role: Role) -> None:
        db.delete(role)
        db.flush()


class RolePermissionRepository:
    """Grant / revoke permissions on a role."""

    def get_for_role(self, db: Session, role_id: uuid.UUID) -> List[str]:
        """Returns list of codenames assigned to a role."""
        stmt = select(RolePermission.permission_codename).where(
            RolePermission.role_id == role_id
        )
        return list(db.execute(stmt).scalars().all())

    def grant(self, db: Session, role_id: uuid.UUID, codename: str) -> RolePermission:
        rp = RolePermission(role_id=role_id, permission_codename=codename)
        db.add(rp)
        db.flush()
        return rp

    def revoke(self, db: Session, role_id: uuid.UUID, codename: str) -> bool:
        """Returns True if a record was deleted, False if it didn't exist."""
        stmt = select(RolePermission).where(
            RolePermission.role_id == role_id,
            RolePermission.permission_codename == codename,
        )
        rp = db.execute(stmt).scalar_one_or_none()
        if rp:
            db.delete(rp)
            db.flush()
            return True
        return False

    def has_permission(self, db: Session, role_id: uuid.UUID, codename: str) -> bool:
        stmt = select(RolePermission).where(
            RolePermission.role_id == role_id,
            RolePermission.permission_codename == codename,
        )
        return db.execute(stmt).scalar_one_or_none() is not None


class UserRoleAssignmentRepository:
    """CRUD for user ↔ role assignments."""

    def get_for_user(
        self, db: Session, user_id: uuid.UUID, org_id: uuid.UUID
    ) -> Optional[UserRoleAssignment]:
        stmt = select(UserRoleAssignment).where(
            UserRoleAssignment.user_id == user_id,
            UserRoleAssignment.organization_id == org_id,
        )
        return db.execute(stmt).scalar_one_or_none()

    def assign(
        self,
        db: Session,
        user_id: uuid.UUID,
        org_id: uuid.UUID,
        role_id: uuid.UUID,
        assigned_by_id: Optional[uuid.UUID] = None,
    ) -> UserRoleAssignment:
        """
        Creates or replaces the user's role assignment in this org.
        Upsert: if one exists, update it; otherwise insert.
        """
        existing = self.get_for_user(db, user_id, org_id)
        if existing:
            existing.role_id = role_id
            existing.assigned_by_id = assigned_by_id
            db.add(existing)
            db.flush()
            return existing

        assignment = UserRoleAssignment(
            id=uuid.uuid4(),
            user_id=user_id,
            organization_id=org_id,
            role_id=role_id,
            assigned_by_id=assigned_by_id,
        )
        db.add(assignment)
        db.flush()
        return assignment

    def remove(self, db: Session, assignment: UserRoleAssignment) -> None:
        db.delete(assignment)
        db.flush()

    def get_users_by_role(
        self, db: Session, org_id: uuid.UUID, role_id: uuid.UUID
    ) -> List[UserRoleAssignment]:
        stmt = select(UserRoleAssignment).where(
            UserRoleAssignment.organization_id == org_id,
            UserRoleAssignment.role_id == role_id,
        )
        return list(db.execute(stmt).scalars().all())


# Singletons
permission_repo = PermissionRepository()
role_repo = RoleRepository()
role_permission_repo = RolePermissionRepository()
user_role_assignment_repo = UserRoleAssignmentRepository()
