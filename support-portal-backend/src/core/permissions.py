"""
Permission Registry & Engine
============================
Central authorization brain for SupportDesk AI.

Key concepts:
- PERMISSION_REGISTRY  : typed dataclass catalogue of all 28 permissions.
- DEFAULT_ROLE_PERMISSIONS: default matrix mapping UserRole → set of codenames.
- PermissionEngine     : resolves permissions for a user via Redis cache → DB →
                         fallback to default matrix.

No business logic should contain ``if role == "Admin"``.
All authorization decisions must flow through this module.
"""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set

import redis as redis_lib
import structlog
from sqlalchemy.orm import Session

from src.models import UserRole

logger = structlog.get_logger()

# ─────────────────────────────────────────────────────────────────────────────
# Permission Dataclass
# ─────────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class PermissionDefinition:
    codename: str
    display_name: str
    module: str
    description: str = ""


# ─────────────────────────────────────────────────────────────────────────────
# Permission Registry  (28 permissions, 6 modules)
# ─────────────────────────────────────────────────────────────────────────────

PERMISSION_REGISTRY: List[PermissionDefinition] = [
    # ── Organization ──────────────────────────────────────────────────────
    PermissionDefinition(
        codename="manage_organization",
        display_name="Manage Organization",
        module="Organization",
        description="Create, update, delete, and configure the organization",
    ),
    PermissionDefinition(
        codename="view_organization",
        display_name="View Organization",
        module="Organization",
        description="View organization profile and settings",
    ),
    PermissionDefinition(
        codename="manage_departments",
        display_name="Manage Departments",
        module="Organization",
        description="Create, update, and delete organizational departments",
    ),
    # ── Users ─────────────────────────────────────────────────────────────
    PermissionDefinition(
        codename="manage_users",
        display_name="Manage Users",
        module="Users",
        description="Activate, deactivate, and update users within the organization",
    ),
    PermissionDefinition(
        codename="invite_users",
        display_name="Invite Users",
        module="Users",
        description="Send email invitations to new users",
    ),
    PermissionDefinition(
        codename="delete_users",
        display_name="Delete Users",
        module="Users",
        description="Permanently deactivate user accounts",
    ),
    PermissionDefinition(
        codename="manage_roles",
        display_name="Manage Roles",
        module="Users",
        description="Create, update, and delete custom roles",
    ),
    PermissionDefinition(
        codename="manage_permissions",
        display_name="Manage Permissions",
        module="Users",
        description="Grant and revoke permissions for roles",
    ),
    PermissionDefinition(
        codename="manage_skills",
        display_name="Manage Skills",
        module="Users",
        description="Create and assign agent skills and proficiency levels",
    ),
    PermissionDefinition(
        codename="manage_availability",
        display_name="Manage Availability",
        module="Users",
        description="Update working hours and agent availability statuses",
    ),
    PermissionDefinition(
        codename="view_agent_profiles",
        display_name="View Agent Profiles",
        module="Users",
        description="View agent details, skills, capacity, and status",
    ),
    # ── Teams ─────────────────────────────────────────────────────────────
    PermissionDefinition(
        codename="manage_teams",
        display_name="Manage Teams",
        module="Teams",
        description="Create, update, delete teams and manage team membership",
    ),
    PermissionDefinition(
        codename="view_teams",
        display_name="View Teams",
        module="Teams",
        description="View team details and member lists",
    ),
    PermissionDefinition(
        codename="manage_team_members",
        display_name="Manage Team Members",
        module="Teams",
        description="Add or remove agents from teams",
    ),
    PermissionDefinition(
        codename="view_team_statistics",
        display_name="View Team Statistics",
        module="Teams",
        description="View team capacity and aggregate metrics",
    ),
    # ── Tickets ───────────────────────────────────────────────────────────
    PermissionDefinition(
        codename="assign_tickets",
        display_name="Assign Tickets",
        module="Tickets",
        description="Assign or reassign tickets to agents and teams",
    ),
    PermissionDefinition(
        codename="create_tickets",
        display_name="Create Tickets",
        module="Tickets",
        description="Create new support tickets",
    ),
    PermissionDefinition(
        codename="reply_tickets",
        display_name="Reply to Tickets",
        module="Tickets",
        description="Send customer-facing replies on tickets",
    ),
    PermissionDefinition(
        codename="delete_tickets",
        display_name="Delete Tickets",
        module="Tickets",
        description="Permanently delete or close tickets",
    ),
    PermissionDefinition(
        codename="merge_tickets",
        display_name="Merge Tickets",
        module="Tickets",
        description="Merge duplicate tickets into a single ticket",
    ),
    # ── Customers ─────────────────────────────────────────────────────────
    PermissionDefinition(
        codename="manage_customers",
        display_name="Manage Customers",
        module="Customers",
        description="Update customer profiles, merge duplicates, and annotate records",
    ),
    PermissionDefinition(
        codename="view_customers",
        display_name="View Customers",
        module="Customers",
        description="View customer profiles, contact history, and CSAT records",
    ),
    # ── Knowledge Base ────────────────────────────────────────────────────
    PermissionDefinition(
        codename="manage_knowledge_base",
        display_name="Manage Knowledge Base",
        module="Knowledge",
        description="Create, edit, publish, and archive knowledge articles",
    ),
    PermissionDefinition(
        codename="upload_documents",
        display_name="Upload Documents",
        module="Knowledge",
        description="Upload PDF, DOCX, and Markdown documents to the knowledge base",
    ),
    PermissionDefinition(
        codename="delete_documents",
        display_name="Delete Documents",
        module="Knowledge",
        description="Delete uploaded knowledge documents and articles",
    ),
    PermissionDefinition(
        codename="view_knowledge_base",
        display_name="View Knowledge Base",
        module="Knowledge",
        description="Read published knowledge base articles",
    ),
    # ── AI ────────────────────────────────────────────────────────────────
    PermissionDefinition(
        codename="configure_ai",
        display_name="Configure AI",
        module="AI",
        description="Adjust AI confidence thresholds and auto-act toggles",
    ),
    PermissionDefinition(
        codename="view_ai_suggestions",
        display_name="View AI Suggestions",
        module="AI",
        description="Read AI-generated ticket suggestions and summaries",
    ),
    # ── Analytics ─────────────────────────────────────────────────────────
    PermissionDefinition(
        codename="view_analytics",
        display_name="View Analytics",
        module="Analytics",
        description="Access operational dashboards and performance metrics",
    ),
    # ── Settings ──────────────────────────────────────────────────────────
    PermissionDefinition(
        codename="manage_settings",
        display_name="Manage Settings",
        module="Settings",
        description="Configure SLA policies, routing rules, and org-wide settings",
    ),
    PermissionDefinition(
        codename="manage_api_keys",
        display_name="Manage API Keys",
        module="Settings",
        description="Create, rotate, and revoke Developer API keys",
    ),
    PermissionDefinition(
        codename="manage_workflow_rules",
        display_name="Manage Workflow Rules",
        module="Settings",
        description="Create and manage automated workflow trigger rules",
    ),
    # ── Security ──────────────────────────────────────────────────────────
    PermissionDefinition(
        codename="view_audit_logs",
        display_name="View Audit Logs",
        module="Security",
        description="Read the immutable audit trail of all organizational actions",
    ),
    # ── Notifications ─────────────────────────────────────────────────────
    PermissionDefinition(
        codename="manage_notifications",
        display_name="Manage Notifications",
        module="Notifications",
        description="Configure personal and organizational notification preferences",
    ),
]

# Fast lookup set — codename → PermissionDefinition
_PERMISSION_MAP: Dict[str, PermissionDefinition] = {
    p.codename: p for p in PERMISSION_REGISTRY
}

# ─────────────────────────────────────────────────────────────────────────────
# Default Permission Matrix
# ─────────────────────────────────────────────────────────────────────────────

# Codenames granted to each system role by default.
# Used both for DB seeding and as a warm fallback if no DB records exist.

_OWNER_PERMISSIONS: Set[str] = {p.codename for p in PERMISSION_REGISTRY}  # ALL 28

_ADMIN_PERMISSIONS: Set[str] = {
    "view_organization",
    "manage_users",
    "invite_users",
    "manage_teams",
    "view_teams",
    "assign_tickets",
    "create_tickets",
    "reply_tickets",
    "delete_tickets",
    "merge_tickets",
    "manage_customers",
    "view_customers",
    "manage_knowledge_base",
    "upload_documents",
    "delete_documents",
    "view_knowledge_base",
    "view_ai_suggestions",
    "view_analytics",
    "manage_settings",
    "manage_workflow_rules",
    "view_audit_logs",
    "manage_notifications",
    "manage_departments",
    "manage_team_members",
    "manage_skills",
    "manage_availability",
    "view_team_statistics",
    "view_agent_profiles",
}

_AGENT_PERMISSIONS: Set[str] = {
    "view_organization",
    "view_teams",
    "create_tickets",
    "reply_tickets",
    "view_customers",
    "view_knowledge_base",
    "view_ai_suggestions",
    "manage_notifications",
    "view_agent_profiles",
}

DEFAULT_ROLE_PERMISSIONS: Dict[UserRole, Set[str]] = {
    UserRole.OWNER: _OWNER_PERMISSIONS,
    UserRole.ADMIN: _ADMIN_PERMISSIONS,
    UserRole.AGENT: _AGENT_PERMISSIONS,
}

# ─────────────────────────────────────────────────────────────────────────────
# Redis Cache Configuration
# ─────────────────────────────────────────────────────────────────────────────

_CACHE_TTL_SECONDS = 300  # 5 minutes
_CACHE_PREFIX = "rbac:perms:"


def _cache_key(user_id: uuid.UUID) -> str:
    return f"{_CACHE_PREFIX}{user_id}"


# ─────────────────────────────────────────────────────────────────────────────
# Permission Engine
# ─────────────────────────────────────────────────────────────────────────────


class PermissionEngine:
    """
    Resolves the effective permission set for a user.

    Resolution order:
    1. Redis cache  (TTL = 300s)
    2. DB: UserRoleAssignment → Role → RolePermission
    3. Fallback: DEFAULT_ROLE_PERMISSIONS[user.role]  (in-memory default matrix)

    Cache is invalidated any time a role is assigned/removed or a permission
    is granted/revoked for that user's role.
    """

    # ── Cache Operations ─────────────────────────────────────────────────

    def _read_cache(
        self, redis_client: redis_lib.Redis, user_id: uuid.UUID
    ) -> Optional[Set[str]]:
        try:
            raw = redis_client.get(_cache_key(user_id))
            if raw:
                return set(json.loads(raw))
        except Exception as exc:
            logger.warning("Permission cache read failed", error=str(exc), user_id=str(user_id))
        return None

    def _write_cache(
        self, redis_client: redis_lib.Redis, user_id: uuid.UUID, permissions: Set[str]
    ) -> None:
        try:
            redis_client.setex(
                _cache_key(user_id), _CACHE_TTL_SECONDS, json.dumps(list(permissions))
            )
        except Exception as exc:
            logger.warning("Permission cache write failed", error=str(exc), user_id=str(user_id))

    def invalidate_cache(self, redis_client: redis_lib.Redis, user_id: uuid.UUID) -> None:
        """
        Call this whenever a user's role changes or permissions on their role change.
        """
        try:
            redis_client.delete(_cache_key(user_id))
            logger.info("Permission cache invalidated", user_id=str(user_id))
        except Exception as exc:
            logger.warning(
                "Permission cache invalidation failed", error=str(exc), user_id=str(user_id)
            )

    # ── Permission Resolution ────────────────────────────────────────────

    def resolve_permissions(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        user_id: uuid.UUID,
        user_role: UserRole,
        org_id: uuid.UUID,
    ) -> Set[str]:
        """
        Returns the full effective permission set for a user.

        This is the hot path — called on every authorized request.
        Cache hit is expected > 99% of the time in steady state.
        """
        # 1. Redis cache
        cached = self._read_cache(redis_client, user_id)
        if cached is not None:
            return cached

        # 2. DB: load UserRoleAssignment → RolePermission
        permissions = self._load_from_db(db, user_id, org_id)

        if permissions is None:
            # 3. Fallback: in-memory default matrix (pre-DB-seed or demo users)
            permissions = DEFAULT_ROLE_PERMISSIONS.get(user_role, set()).copy()
            logger.debug(
                "Permission fallback to default matrix",
                user_id=str(user_id),
                role=user_role.value,
            )

        # Write back to cache
        self._write_cache(redis_client, user_id, permissions)
        return permissions

    def _load_from_db(
        self, db: Session, user_id: uuid.UUID, org_id: uuid.UUID
    ) -> Optional[Set[str]]:
        """
        Loads permissions from DB via UserRoleAssignment → Role → RolePermission.
        Returns None if no assignment exists (triggers fallback).
        """
        try:
            from sqlalchemy import select

            from src.models import RolePermission, UserRoleAssignment

            stmt = (
                select(RolePermission.permission_codename)
                .join(UserRoleAssignment, UserRoleAssignment.role_id == RolePermission.role_id)
                .where(
                    UserRoleAssignment.user_id == user_id,
                    UserRoleAssignment.organization_id == org_id,
                )
            )
            rows = db.execute(stmt).scalars().all()
            if not rows:
                return None  # No assignment found → use fallback
            return set(rows)
        except Exception as exc:
            logger.error(
                "Permission DB load failed",
                error=str(exc),
                user_id=str(user_id),
                org_id=str(org_id),
            )
            return None

    # ── Permission Checks ────────────────────────────────────────────────

    def has_permission(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        user_id: uuid.UUID,
        user_role: UserRole,
        org_id: uuid.UUID,
        codename: str,
    ) -> bool:
        """Returns True if the user holds the named permission."""
        perms = self.resolve_permissions(db, redis_client, user_id, user_role, org_id)
        return codename in perms

    def has_any_permission(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        user_id: uuid.UUID,
        user_role: UserRole,
        org_id: uuid.UUID,
        *codenames: str,
    ) -> bool:
        """Returns True if the user holds AT LEAST ONE of the named permissions."""
        perms = self.resolve_permissions(db, redis_client, user_id, user_role, org_id)
        return bool(perms.intersection(codenames))

    def has_all_permissions(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        user_id: uuid.UUID,
        user_role: UserRole,
        org_id: uuid.UUID,
        *codenames: str,
    ) -> bool:
        """Returns True if the user holds ALL of the named permissions."""
        perms = self.resolve_permissions(db, redis_client, user_id, user_role, org_id)
        return set(codenames).issubset(perms)

    def get_permission_matrix(
        self, db: Session, org_id: uuid.UUID
    ) -> Dict[str, List[str]]:
        """
        Returns a mapping of role_name → [codenames] for all roles in the org.
        Includes system roles + any org-scoped custom roles.
        """
        try:
            from sqlalchemy import select

            from src.models import Role, RolePermission

            stmt = (
                select(Role.name, RolePermission.permission_codename)
                .join(RolePermission, RolePermission.role_id == Role.id)
                .where(
                    (Role.organization_id == org_id) | (Role.is_system.is_(True))
                )
            )
            rows = db.execute(stmt).all()
            matrix: Dict[str, List[str]] = {}
            for role_name, codename in rows:
                matrix.setdefault(role_name, []).append(codename)
            return matrix
        except Exception as exc:
            logger.error("Permission matrix load failed", error=str(exc))
            # Return in-memory defaults as fallback
            return {role.value: list(perms) for role, perms in DEFAULT_ROLE_PERMISSIONS.items()}


# Singleton — imported everywhere that needs permission resolution
permission_engine = PermissionEngine()
