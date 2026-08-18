"""
RBAC Pydantic Schemas
=====================
Request / Response models for the Permission & Role Management API.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ─────────────────────────────────────────────────────────────────────────────
# Permission Schemas
# ─────────────────────────────────────────────────────────────────────────────


class PermissionResponse(BaseModel):
    codename: str
    display_name: str
    module: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PermissionsListResponse(BaseModel):
    """Grouped by module for clean API / UI consumption."""

    permissions: List[PermissionResponse]
    grouped: Dict[str, List[PermissionResponse]] = {}

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# Role Schemas
# ─────────────────────────────────────────────────────────────────────────────


class RolePermissionEntry(BaseModel):
    codename: str
    display_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RoleResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    is_system: bool
    is_custom: bool
    organization_id: Optional[uuid.UUID] = None
    permissions: List[str] = []  # list of codenames
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoleCreateRequest(BaseModel):
    name: str = Field(
        ..., min_length=2, max_length=100, description="Unique name for the custom role"
    )
    description: Optional[str] = Field(None, max_length=500)
    initial_permissions: Optional[List[str]] = Field(
        default=None,
        description="Codenames of permissions to grant on creation",
    )

    @field_validator("name")
    @classmethod
    def no_system_role_names(cls, v: str) -> str:
        reserved = {"OWNER", "ADMIN", "AGENT"}
        if v.upper() in reserved:
            raise ValueError(f"'{v}' is a reserved system role name")
        return v


class RoleUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


# ─────────────────────────────────────────────────────────────────────────────
# Permission Matrix Schema
# ─────────────────────────────────────────────────────────────────────────────


class PermissionMatrixResponse(BaseModel):
    """Full role → permission mapping for the organization."""

    matrix: Dict[str, List[str]]  # role_name → [codenames]
    total_permissions: int


# ─────────────────────────────────────────────────────────────────────────────
# Role Assignment Schemas
# ─────────────────────────────────────────────────────────────────────────────


class AssignRoleRequest(BaseModel):
    role_id: uuid.UUID = Field(..., description="ID of the role to assign")


class UserPermissionsResponse(BaseModel):
    user_id: uuid.UUID
    role: str
    permissions: List[str]
    total: int


# ─────────────────────────────────────────────────────────────────────────────
# Grant / Revoke Permission Schemas
# ─────────────────────────────────────────────────────────────────────────────


class GrantPermissionRequest(BaseModel):
    codename: str = Field(
        ..., min_length=1, max_length=100, description="Permission codename to grant"
    )
