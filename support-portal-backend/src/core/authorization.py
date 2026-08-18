"""
Authorization Dependencies
==========================
Reusable FastAPI dependency factories for permission-based access control.

Usage examples in router files:

    from src.core.authorization import require_permission, require_any_permission

    @router.delete("/users/{user_id}")
    def delete_user(
        user_id: uuid.UUID,
        actor: User = require_permission("delete_users"),
        db: Session = Depends(get_db),
    ):
        ...

    @router.get("/analytics")
    def get_analytics(
        actor: User = require_any_permission("view_analytics", "manage_settings"),
    ):
        ...

Design notes:
- Every dependency calls get_current_user (authentication) first.
- If the user is authenticated but lacks the permission, raises 403 FORBIDDEN.
- If the user is not authenticated at all, raises 401 UNAUTHORIZED.
- Tenant isolation is enforced by the permission engine's scope to (user_id, org_id).
"""

from __future__ import annotations

import redis as redis_lib
from fastapi import Depends
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from src.core.dependencies import get_current_user, get_db, get_redis
from src.core.exceptions import AuthorizationException
from src.core.permissions import permission_engine
from src.models import User, UserRole

# Re-export the security scheme so other modules can import from here
security_scheme = HTTPBearer(auto_error=False)


# ─────────────────────────────────────────────────────────────────────────────
# Core Permission Dependency Factories
# ─────────────────────────────────────────────────────────────────────────────


def require_permission(codename: str):
    """
    Returns a FastAPI dependency that:
    1. Authenticates the requesting user (401 if missing/invalid token).
    2. Resolves the user's effective permissions (cache → DB → fallback).
    3. Raises 403 FORBIDDEN if the user does not hold `codename`.
    4. Returns the authenticated User on success.

    Usage:
        actor: User = Depends(require_permission("manage_users"))
    """

    def _dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        redis_client: redis_lib.Redis = Depends(get_redis),
    ) -> User:
        allowed = permission_engine.has_permission(
            db=db,
            redis_client=redis_client,
            user_id=current_user.id,
            user_role=current_user.role,
            org_id=current_user.organization_id,
            codename=codename,
        )
        if not allowed:
            raise AuthorizationException(
                f"You do not have permission to perform this action. Required: '{codename}'"
            )
        return current_user

    return Depends(_dependency)


def require_any_permission(*codenames: str):
    """
    Returns a FastAPI dependency that passes if the user holds
    AT LEAST ONE of the supplied codenames (OR logic).

    Usage:
        actor: User = Depends(require_any_permission("view_analytics", "manage_settings"))
    """

    def _dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        redis_client: redis_lib.Redis = Depends(get_redis),
    ) -> User:
        allowed = permission_engine.has_any_permission(
            db,
            redis_client,
            current_user.id,
            current_user.role,
            current_user.organization_id,
            *codenames,
        )
        if not allowed:
            needed = ", ".join(f"'{c}'" for c in codenames)
            raise AuthorizationException(
                f"You need at least one of the following permissions: {needed}"
            )
        return current_user

    return Depends(_dependency)


def require_all_permissions(*codenames: str):
    """
    Returns a FastAPI dependency that passes only if the user holds
    ALL supplied codenames (AND logic).

    Usage:
        actor: User = Depends(require_all_permissions("manage_knowledge_base", "upload_documents"))
    """

    def _dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        redis_client: redis_lib.Redis = Depends(get_redis),
    ) -> User:
        allowed = permission_engine.has_all_permissions(
            db,
            redis_client,
            current_user.id,
            current_user.role,
            current_user.organization_id,
            *codenames,
        )
        if not allowed:
            needed = ", ".join(f"'{c}'" for c in codenames)
            raise AuthorizationException(f"You need all of the following permissions: {needed}")
        return current_user

    return Depends(_dependency)


def require_role(role: UserRole):
    """
    Returns a FastAPI dependency that enforces an exact role match.
    Use sparingly — prefer permission-based checks over role checks.

    Usage:
        actor: User = Depends(require_role(UserRole.OWNER))
    """

    def _dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != role:
            raise AuthorizationException(f"This action requires the '{role.value}' role")
        return current_user

    return Depends(_dependency)


def require_owner_or_admin():
    """
    Shortcut dependency: passes if the user is OWNER or ADMIN.

    Usage:
        actor: User = Depends(require_owner_or_admin())
    """

    def _dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in (UserRole.OWNER, UserRole.ADMIN):
            raise AuthorizationException("This action requires Owner or Admin privileges")
        return current_user

    return Depends(_dependency)


# ─────────────────────────────────────────────────────────────────────────────
# Tenant Isolation Guard
# ─────────────────────────────────────────────────────────────────────────────


def assert_same_org(actor: User, target_org_id) -> None:
    """
    Service-layer helper: raises 403 if the actor's organization differs
    from the target resource's organization.

    This is the second layer of tenant isolation (first layer is DB query scoping).
    Call this in any service method that operates on a resource fetched by bare ID.

    Example:
        assert_same_org(actor, ticket.organization_id)
    """
    import uuid as uuid_mod

    target = (
        target_org_id
        if isinstance(target_org_id, uuid_mod.UUID)
        else uuid_mod.UUID(str(target_org_id))
    )
    if actor.organization_id != target:
        # Return 403 (not 404) here because the caller already has the resource —
        # returning 404 in this position would be confusing. The caller can choose
        # to raise NotFoundException instead to prevent org enumeration.
        raise AuthorizationException("You do not have access to this resource")
