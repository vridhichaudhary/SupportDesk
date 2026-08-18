"""
RBAC API Router
===============
Endpoints for Permission & Role Management.

All routes are protected by the permission engine — no hardcoded role checks.

Routes:
    GET    /rbac/permissions                          List all 28 permissions
    GET    /rbac/permissions/matrix                   Full org permission matrix
    GET    /rbac/roles                                List roles (system + custom)
    POST   /rbac/roles                                Create custom role
    GET    /rbac/roles/{role_id}                      Get role detail + permissions
    PATCH  /rbac/roles/{role_id}                      Update custom role
    DELETE /rbac/roles/{role_id}                      Delete custom role
    POST   /rbac/roles/{role_id}/permissions          Grant permission to role
    DELETE /rbac/roles/{role_id}/permissions/{code}   Revoke permission from role
    POST   /rbac/users/{user_id}/role                 Assign role to user
    DELETE /rbac/users/{user_id}/role                 Remove role from user
    GET    /rbac/users/{user_id}/permissions          Get user's resolved permissions
    GET    /rbac/users/me/permissions                 Get my resolved permissions
"""

from __future__ import annotations

import uuid
from typing import List

import redis as redis_lib
import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.core.authorization import require_permission
from src.core.dependencies import get_current_user, get_db, get_redis
from src.core.exceptions import NotFoundException
from src.core.permissions import PERMISSION_REGISTRY
from src.core.responses import ErrorResponse, SuccessResponse
from src.models import User
from src.repositories.rbac import role_permission_repo
from src.repositories.user import user_repository
from src.schemas.rbac import (
    AssignRoleRequest,
    GrantPermissionRequest,
    PermissionMatrixResponse,
    PermissionResponse,
    PermissionsListResponse,
    RoleCreateRequest,
    RoleResponse,
    RoleUpdateRequest,
    UserPermissionsResponse,
)
from src.services.rbac import rbac_service

logger = structlog.get_logger()

router = APIRouter(
    prefix="/rbac",
    tags=["Roles & Permissions"],
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
        404: {"model": ErrorResponse, "description": "Not Found"},
    },
)


# ─────────────────────────────────────────────────────────────────────────────
# Permissions
# ─────────────────────────────────────────────────────────────────────────────


@router.get(
    "/permissions",
    response_model=SuccessResponse[PermissionsListResponse],
    summary="List all system permissions",
    description="Returns all 28 permissions grouped by module. Requires manage_roles or manage_permissions.",
)
def list_permissions(
    actor: User = require_permission("manage_roles"),
) -> SuccessResponse[PermissionsListResponse]:
    perms = [
        PermissionResponse(
            codename=p.codename,
            display_name=p.display_name,
            module=p.module,
            description=p.description,
        )
        for p in PERMISSION_REGISTRY
    ]
    grouped: dict = {}
    for p in perms:
        grouped.setdefault(p.module, []).append(p)

    return SuccessResponse(data=PermissionsListResponse(permissions=perms, grouped=grouped))


@router.get(
    "/permissions/matrix",
    response_model=SuccessResponse[PermissionMatrixResponse],
    summary="Get the organization's full permission matrix",
)
def get_permission_matrix(
    actor: User = require_permission("manage_roles"),
    db: Session = Depends(get_db),
) -> SuccessResponse[PermissionMatrixResponse]:
    matrix = rbac_service.get_permission_matrix(db, actor.organization_id)
    return SuccessResponse(
        data=PermissionMatrixResponse(
            matrix=matrix,
            total_permissions=len(PERMISSION_REGISTRY),
        )
    )


# ─────────────────────────────────────────────────────────────────────────────
# Roles
# ─────────────────────────────────────────────────────────────────────────────


@router.get(
    "/roles",
    response_model=SuccessResponse[List[RoleResponse]],
    summary="List all roles (system + org custom)",
)
def list_roles(
    actor: User = require_permission("manage_roles"),
    db: Session = Depends(get_db),
) -> SuccessResponse[List[RoleResponse]]:
    roles = rbac_service.list_roles(db, actor.organization_id)
    result = []
    for role in roles:
        codenames = role_permission_repo.get_for_role(db, role.id)
        result.append(
            RoleResponse(
                id=role.id,
                name=role.name,
                description=role.description,
                is_system=role.is_system,
                is_custom=role.is_custom,
                organization_id=role.organization_id,
                permissions=codenames,
                created_at=role.created_at,
            )
        )
    return SuccessResponse(data=result)


@router.post(
    "/roles",
    response_model=SuccessResponse[RoleResponse],
    status_code=201,
    summary="Create a custom role",
)
def create_role(
    payload: RoleCreateRequest,
    actor: User = require_permission("manage_roles"),
    db: Session = Depends(get_db),
    redis_client: redis_lib.Redis = Depends(get_redis),
) -> SuccessResponse[RoleResponse]:
    role = rbac_service.create_custom_role(
        db=db,
        redis_client=redis_client,
        actor=actor,
        name=payload.name,
        description=payload.description,
        initial_permissions=payload.initial_permissions,
    )
    codenames = role_permission_repo.get_for_role(db, role.id)
    return SuccessResponse(
        data=RoleResponse(
            id=role.id,
            name=role.name,
            description=role.description,
            is_system=role.is_system,
            is_custom=role.is_custom,
            organization_id=role.organization_id,
            permissions=codenames,
            created_at=role.created_at,
        )
    )


@router.get(
    "/roles/{role_id}",
    response_model=SuccessResponse[RoleResponse],
    summary="Get role details and permissions",
)
def get_role(
    role_id: uuid.UUID,
    actor: User = require_permission("manage_roles"),
    db: Session = Depends(get_db),
) -> SuccessResponse[RoleResponse]:
    role = rbac_service.get_role(db, role_id, actor.organization_id)
    codenames = role_permission_repo.get_for_role(db, role.id)
    return SuccessResponse(
        data=RoleResponse(
            id=role.id,
            name=role.name,
            description=role.description,
            is_system=role.is_system,
            is_custom=role.is_custom,
            organization_id=role.organization_id,
            permissions=codenames,
            created_at=role.created_at,
        )
    )


@router.patch(
    "/roles/{role_id}",
    response_model=SuccessResponse[RoleResponse],
    summary="Update a custom role name or description",
)
def update_role(
    role_id: uuid.UUID,
    payload: RoleUpdateRequest,
    actor: User = require_permission("manage_roles"),
    db: Session = Depends(get_db),
) -> SuccessResponse[RoleResponse]:
    role = rbac_service.update_custom_role(
        db=db,
        actor=actor,
        role_id=role_id,
        name=payload.name,
        description=payload.description,
    )
    codenames = role_permission_repo.get_for_role(db, role.id)
    return SuccessResponse(
        data=RoleResponse(
            id=role.id,
            name=role.name,
            description=role.description,
            is_system=role.is_system,
            is_custom=role.is_custom,
            organization_id=role.organization_id,
            permissions=codenames,
            created_at=role.created_at,
        )
    )


@router.delete(
    "/roles/{role_id}",
    response_model=SuccessResponse[dict],
    summary="Delete a custom role",
)
def delete_role(
    role_id: uuid.UUID,
    actor: User = require_permission("manage_roles"),
    db: Session = Depends(get_db),
    redis_client: redis_lib.Redis = Depends(get_redis),
) -> SuccessResponse[dict]:
    rbac_service.delete_custom_role(db=db, redis_client=redis_client, actor=actor, role_id=role_id)
    return SuccessResponse(data={"message": "Role deleted successfully"})


# ─────────────────────────────────────────────────────────────────────────────
# Role → Permission Management
# ─────────────────────────────────────────────────────────────────────────────


@router.post(
    "/roles/{role_id}/permissions",
    response_model=SuccessResponse[dict],
    status_code=201,
    summary="Grant a permission to a role",
)
def grant_permission(
    role_id: uuid.UUID,
    payload: GrantPermissionRequest,
    actor: User = require_permission("manage_permissions"),
    db: Session = Depends(get_db),
    redis_client: redis_lib.Redis = Depends(get_redis),
) -> SuccessResponse[dict]:
    rbac_service.grant_permission_to_role(
        db=db,
        redis_client=redis_client,
        actor=actor,
        role_id=role_id,
        codename=payload.codename,
    )
    return SuccessResponse(data={"message": f"Permission '{payload.codename}' granted to role"})


@router.delete(
    "/roles/{role_id}/permissions/{codename}",
    response_model=SuccessResponse[dict],
    summary="Revoke a permission from a role",
)
def revoke_permission(
    role_id: uuid.UUID,
    codename: str,
    actor: User = require_permission("manage_permissions"),
    db: Session = Depends(get_db),
    redis_client: redis_lib.Redis = Depends(get_redis),
) -> SuccessResponse[dict]:
    rbac_service.revoke_permission_from_role(
        db=db,
        redis_client=redis_client,
        actor=actor,
        role_id=role_id,
        codename=codename,
    )
    return SuccessResponse(data={"message": f"Permission '{codename}' revoked from role"})


# ─────────────────────────────────────────────────────────────────────────────
# User → Role Assignment
# ─────────────────────────────────────────────────────────────────────────────


@router.post(
    "/users/{user_id}/role",
    response_model=SuccessResponse[dict],
    status_code=201,
    summary="Assign a role to a user",
)
def assign_role(
    user_id: uuid.UUID,
    payload: AssignRoleRequest,
    actor: User = require_permission("manage_roles"),
    db: Session = Depends(get_db),
    redis_client: redis_lib.Redis = Depends(get_redis),
) -> SuccessResponse[dict]:
    target_user = user_repository.get_by_id(db, user_id)
    if not target_user or target_user.organization_id != actor.organization_id:
        raise NotFoundException("User not found")

    assignment = rbac_service.assign_role_to_user(
        db=db,
        redis_client=redis_client,
        actor=actor,
        target_user=target_user,
        role_id=payload.role_id,
    )
    return SuccessResponse(
        data={
            "message": "Role assigned successfully",
            "user_id": str(user_id),
            "assignment_id": str(assignment.id),
        }
    )


@router.delete(
    "/users/{user_id}/role",
    response_model=SuccessResponse[dict],
    summary="Remove role assignment from a user",
)
def remove_role(
    user_id: uuid.UUID,
    actor: User = require_permission("manage_roles"),
    db: Session = Depends(get_db),
    redis_client: redis_lib.Redis = Depends(get_redis),
) -> SuccessResponse[dict]:
    target_user = user_repository.get_by_id(db, user_id)
    if not target_user or target_user.organization_id != actor.organization_id:
        raise NotFoundException("User not found")

    rbac_service.remove_role_from_user(
        db=db, redis_client=redis_client, actor=actor, target_user=target_user
    )
    return SuccessResponse(data={"message": "Role removed from user"})


# ─────────────────────────────────────────────────────────────────────────────
# User Permissions View
# ─────────────────────────────────────────────────────────────────────────────


@router.get(
    "/users/me/permissions",
    response_model=SuccessResponse[UserPermissionsResponse],
    summary="Get my resolved permissions",
    description="Returns the caller's effective permission set (cache-backed).",
)
def get_my_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client: redis_lib.Redis = Depends(get_redis),
) -> SuccessResponse[UserPermissionsResponse]:
    perms = rbac_service.get_user_permissions(
        db, redis_client, current_user.id, current_user.role, current_user.organization_id
    )
    sorted_perms = sorted(perms)
    return SuccessResponse(
        data=UserPermissionsResponse(
            user_id=current_user.id,
            role=current_user.role.value,
            permissions=sorted_perms,
            total=len(sorted_perms),
        )
    )


@router.get(
    "/users/{user_id}/permissions",
    response_model=SuccessResponse[UserPermissionsResponse],
    summary="Get a specific user's resolved permissions",
)
def get_user_permissions(
    user_id: uuid.UUID,
    actor: User = require_permission("manage_users"),
    db: Session = Depends(get_db),
    redis_client: redis_lib.Redis = Depends(get_redis),
) -> SuccessResponse[UserPermissionsResponse]:
    target_user = user_repository.get_by_id(db, user_id)
    # Return 404 (not 403) to prevent organization boundary enumeration
    if not target_user or target_user.organization_id != actor.organization_id:
        raise NotFoundException("User not found")

    perms = rbac_service.get_user_permissions(
        db, redis_client, target_user.id, target_user.role, target_user.organization_id
    )
    sorted_perms = sorted(perms)
    return SuccessResponse(
        data=UserPermissionsResponse(
            user_id=target_user.id,
            role=target_user.role.value,
            permissions=sorted_perms,
            total=len(sorted_perms),
        )
    )
