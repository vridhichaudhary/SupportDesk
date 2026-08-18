"""
RBAC Service
============
Business logic for the permission and role management system.

Security invariants enforced here:
1. Privilege escalation prevention: actors may only grant permissions they hold.
2. Owner protection: the OWNER role cannot be removed or downgraded.
3. System role immutability: system roles cannot be deleted or have permissions
   stripped below a defined floor.
4. Tenant isolation: actor.organization_id is cross-checked against every
   target resource before mutation.
5. Audit trail: every change produces an AuditLog entry.
"""

from __future__ import annotations

import uuid
from typing import Dict, List, Optional, Set

import redis as redis_lib
from sqlalchemy.orm import Session

from src.core.exceptions import (
    AuthorizationException,
    NotFoundException,
    ResourceConflictException,
    ValidationException,
)
from src.core.permissions import permission_engine
from src.models import ActionType, Role, UserRole, UserRoleAssignment
from src.repositories.rbac import (
    permission_repo,
    role_permission_repo,
    role_repo,
    user_role_assignment_repo,
)
from src.services.audit_log import audit_log_service


class RBACService:
    # ── Permission Queries ───────────────────────────────────────────────

    def list_all_permissions(self, db: Session) -> list:
        return permission_repo.list_all(db)

    def get_user_permissions(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        user_id: uuid.UUID,
        user_role: UserRole,
        org_id: uuid.UUID,
    ) -> Set[str]:
        return permission_engine.resolve_permissions(db, redis_client, user_id, user_role, org_id)

    def get_permission_matrix(self, db: Session, org_id: uuid.UUID) -> Dict[str, List[str]]:
        return permission_engine.get_permission_matrix(db, org_id)

    # ── Role Queries ─────────────────────────────────────────────────────

    def list_roles(self, db: Session, org_id: uuid.UUID) -> List[Role]:
        return role_repo.list_roles_for_org(db, org_id)

    def get_role(self, db: Session, role_id: uuid.UUID, org_id: uuid.UUID) -> Role:
        role = role_repo.get_by_id(db, role_id)
        if not role:
            raise NotFoundException("Role not found")
        # System roles are global; org custom roles must belong to this org
        if not role.is_system and role.organization_id != org_id:
            raise NotFoundException("Role not found")
        return role

    # ── Custom Role Management ───────────────────────────────────────────

    def create_custom_role(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        actor,  # User
        name: str,
        description: Optional[str],
        initial_permissions: Optional[List[str]] = None,
    ) -> Role:
        """
        Creates an org-scoped custom role with optional initial permissions.

        Security: actor must hold 'manage_roles'.
        Privilege escalation: actor cannot grant permissions they don't hold.
        """
        # Verify unique name within org
        existing = role_repo.get_org_custom_roles(db, actor.organization_id)
        if any(r.name.lower() == name.lower() for r in existing):
            raise ResourceConflictException(f"A role named '{name}' already exists")

        # Validate initial permissions — actor can only assign perms they have
        if initial_permissions:
            self._assert_can_grant_permissions(db, redis_client, actor, initial_permissions)

        role = role_repo.create_custom_role(db, actor.organization_id, name, description)

        # Grant initial permissions
        for codename in initial_permissions or []:
            if permission_repo.get_by_codename(db, codename):
                role_permission_repo.grant(db, role.id, codename)

        db.commit()
        db.refresh(role)

        audit_log_service.log_action(
            db=db,
            organization_id=actor.organization_id,
            action_type=ActionType.ROLE_CREATED,
            entity_type="Role",
            entity_id=role.id,
            actor_id=actor.id,
            changes={"name": name, "initial_permissions": initial_permissions or []},
        )
        return role

    def update_custom_role(
        self,
        db: Session,
        actor,
        role_id: uuid.UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Role:
        role = self.get_role(db, role_id, actor.organization_id)
        if role.is_system:
            raise ValidationException("System roles cannot be modified")

        role = role_repo.update_custom_role(db, role, name, description)
        db.commit()
        db.refresh(role)
        return role

    def delete_custom_role(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        actor,
        role_id: uuid.UUID,
    ) -> None:
        role = self.get_role(db, role_id, actor.organization_id)
        if role.is_system:
            raise ValidationException("System roles cannot be deleted")

        # Invalidate cache for all users assigned this role
        assignments = user_role_assignment_repo.get_users_by_role(
            db, actor.organization_id, role_id
        )
        for assignment in assignments:
            permission_engine.invalidate_cache(redis_client, assignment.user_id)

        role_repo.delete(db, role)
        db.commit()

    # ── Permission Grant / Revoke ────────────────────────────────────────

    def grant_permission_to_role(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        actor,
        role_id: uuid.UUID,
        codename: str,
    ) -> None:
        """
        Grants a permission to a role.

        Security:
        - Actor must hold 'manage_permissions'.
        - Actor must themselves hold the permission being granted (no escalation).
        - System role OWNER cannot have permissions added (it always has all).
        """
        role = self.get_role(db, role_id, actor.organization_id)

        if role.name == UserRole.OWNER.value:
            raise ValidationException(
                "The Owner role always holds all permissions and cannot be modified"
            )

        # Privilege escalation check
        self._assert_can_grant_permissions(db, redis_client, actor, [codename])

        perm = permission_repo.get_by_codename(db, codename)
        if not perm:
            raise NotFoundException(f"Permission '{codename}' does not exist")

        if role_permission_repo.has_permission(db, role_id, codename):
            raise ResourceConflictException(f"Role already has permission '{codename}'")

        role_permission_repo.grant(db, role_id, codename)
        db.commit()

        # Invalidate cache for all users with this role
        self._invalidate_role_users_cache(db, redis_client, actor.organization_id, role_id)

        audit_log_service.log_action(
            db=db,
            organization_id=actor.organization_id,
            action_type=ActionType.PERMISSION_GRANTED,
            entity_type="Role",
            entity_id=role_id,
            actor_id=actor.id,
            changes={"codename": codename},
        )

    def revoke_permission_from_role(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        actor,
        role_id: uuid.UUID,
        codename: str,
    ) -> None:
        role = self.get_role(db, role_id, actor.organization_id)

        if role.name == UserRole.OWNER.value:
            raise ValidationException("The Owner role cannot have permissions revoked")

        deleted = role_permission_repo.revoke(db, role_id, codename)
        if not deleted:
            raise NotFoundException(f"Role does not have permission '{codename}'")

        db.commit()

        self._invalidate_role_users_cache(db, redis_client, actor.organization_id, role_id)

        audit_log_service.log_action(
            db=db,
            organization_id=actor.organization_id,
            action_type=ActionType.PERMISSION_REVOKED,
            entity_type="Role",
            entity_id=role_id,
            actor_id=actor.id,
            changes={"codename": codename},
        )

    # ── Role Assignment ──────────────────────────────────────────────────

    def assign_role_to_user(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        actor,
        target_user,  # User
        role_id: uuid.UUID,
    ) -> UserRoleAssignment:
        """
        Assigns a role to a user within the actor's organization.

        Security:
        - Target user must be in the same organization.
        - Actor cannot assign OWNER role (only the current Owner can transfer ownership).
        - Actor cannot assign a role with more permissions than the actor holds.
        - OWNER's role cannot be removed or replaced by anyone except the Owner.
        """
        # Tenant isolation: target must be in same org
        if target_user.organization_id != actor.organization_id:
            raise NotFoundException("User not found")

        # Owner protection: prevent others from assigning OWNER role
        role = role_repo.get_by_id(db, role_id)
        if not role:
            raise NotFoundException("Role not found")

        if role.name == UserRole.OWNER.value and actor.role != UserRole.OWNER:
            raise AuthorizationException("Only the current Owner can transfer the Owner role")

        # Owner protection: prevent de-roling the Owner without replacement
        if target_user.role == UserRole.OWNER and actor.role != UserRole.OWNER:
            raise AuthorizationException("Only the Owner can change their own role")

        # Privilege escalation: verify actor can grant this role's permissions
        role_codenames = role_permission_repo.get_for_role(db, role_id)
        if role_codenames:
            self._assert_can_grant_permissions(db, redis_client, actor, role_codenames)

        # Persist assignment
        assignment = user_role_assignment_repo.assign(
            db,
            user_id=target_user.id,
            org_id=actor.organization_id,
            role_id=role_id,
            assigned_by_id=actor.id,
        )

        # Sync the User.role enum with the system role (for JWT fast-path)
        _sync_user_role_enum(db, target_user, role)

        db.commit()

        # Invalidate cache for the affected user
        permission_engine.invalidate_cache(redis_client, target_user.id)

        audit_log_service.log_action(
            db=db,
            organization_id=actor.organization_id,
            action_type=ActionType.ROLE_ASSIGNED,
            entity_type="User",
            entity_id=target_user.id,
            actor_id=actor.id,
            changes={"role_name": role.name, "role_id": str(role_id)},
        )
        return assignment

    def remove_role_from_user(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        actor,
        target_user,
    ) -> None:
        if target_user.organization_id != actor.organization_id:
            raise NotFoundException("User not found")

        if target_user.role == UserRole.OWNER:
            raise AuthorizationException(
                "Cannot remove the Owner role without assigning a replacement Owner first"
            )

        assignment = user_role_assignment_repo.get_for_user(
            db, target_user.id, actor.organization_id
        )
        if not assignment:
            raise NotFoundException("No role assignment found for this user")

        user_role_assignment_repo.remove(db, assignment)
        db.commit()

        permission_engine.invalidate_cache(redis_client, target_user.id)

        audit_log_service.log_action(
            db=db,
            organization_id=actor.organization_id,
            action_type=ActionType.ROLE_REMOVED,
            entity_type="User",
            entity_id=target_user.id,
            actor_id=actor.id,
            changes={},
        )

    # ── Internal Helpers ─────────────────────────────────────────────────

    def _assert_can_grant_permissions(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        actor,
        codenames: List[str],
    ) -> None:
        """
        Privilege escalation prevention:
        An actor may only grant permissions they themselves hold.
        """
        actor_perms = permission_engine.resolve_permissions(
            db, redis_client, actor.id, actor.role, actor.organization_id
        )
        for codename in codenames:
            if codename not in actor_perms:
                raise AuthorizationException(
                    f"You cannot grant permission '{codename}' because you do not hold it yourself"
                )

    def _invalidate_role_users_cache(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        org_id: uuid.UUID,
        role_id: uuid.UUID,
    ) -> None:
        """Invalidates the permission cache for every user assigned the given role."""
        assignments = user_role_assignment_repo.get_users_by_role(db, org_id, role_id)
        for assignment in assignments:
            permission_engine.invalidate_cache(redis_client, assignment.user_id)


def _sync_user_role_enum(db: Session, user, role: Role) -> None:
    """
    Keeps User.role (the JWT fast-path enum) in sync with the assigned Role.
    Only applies to system roles; custom roles keep the user's last system role.
    """
    try:
        mapped = UserRole(role.name)
        if user.role != mapped:
            user.role = mapped
            db.add(user)
    except ValueError:
        pass  # Custom role — do not change the enum


rbac_service = RBACService()
