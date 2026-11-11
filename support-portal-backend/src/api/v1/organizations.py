import uuid

import structlog
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.core.authorization import require_permission
from src.core.dependencies import get_db
from src.core.responses import ErrorResponse, PaginatedResponse, PaginationMeta, SuccessResponse
from src.models import Organization as OrgModel
from src.models import User
from src.repositories.audit_log import audit_log_repository
from src.schemas.audit_log import AuditLogResponse
from src.schemas.organization import (
    DashboardSummaryResponse,
    OrganizationCreate,
    OrganizationResponse,
    OrganizationSettings,
    OrganizationUpdate,
)
from src.services.organization import organization_service
from src.utils.pagination import PaginationParams

logger = structlog.get_logger()

router = APIRouter(
    prefix="/organizations",
    tags=["Organizations"],
    responses={
        404: {"model": ErrorResponse, "description": "Organization not found"},
        422: {"model": ErrorResponse, "description": "Validation Error"},
    },
)


# ── Create ─────────────────────────────────────────────────────────────────
@router.post(
    "",
    response_model=SuccessResponse[OrganizationResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Organization",
    description=(
        "Creates a brand-new tenant Organization in SupportDesk AI. "
        "Requires 'manage_organization' permission. Public registration occurs via /auth/signup."
    ),
)
def create_organization(
    payload: OrganizationCreate,
    actor: User = require_permission("manage_organization"),
    db: Session = Depends(get_db),
) -> SuccessResponse[OrganizationResponse]:
    logger.info("Creating organization", name=payload.name, actor_id=str(actor.id))
    org = organization_service.create_organization(db, obj_in=payload)
    return SuccessResponse(data=OrganizationResponse.model_validate(org))


# ── List (admin / cross-tenant isolation) ──────────────────────────────────
@router.get(
    "",
    response_model=PaginatedResponse[OrganizationResponse],
    summary="List all Organizations (Admin only)",
    description=(
        "Returns a paginated list of organizations belonging to the authenticated tenant. "
        "Requires 'manage_organization' permission."
    ),
)
def list_organizations(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    actor: User = require_permission("manage_organization"),
    db: Session = Depends(get_db),
) -> PaginatedResponse[OrganizationResponse]:
    total = db.execute(
        select(func.count())
        .select_from(OrgModel)
        .where(OrgModel.id == actor.organization_id, OrgModel.deleted_at.is_(None))
    ).scalar_one()

    orgs = (
        db.execute(
            select(OrgModel)
            .where(OrgModel.id == actor.organization_id, OrgModel.deleted_at.is_(None))
            .offset(offset)
            .limit(limit)
            .order_by(OrgModel.created_at.desc())
        )
        .scalars()
        .all()
    )

    return PaginatedResponse(
        data=[OrganizationResponse.model_validate(o) for o in orgs],
        meta=PaginationMeta(
            total=total,
            offset=offset,
            limit=limit,
            has_next=(offset + limit) < total,
        ),
    )


# ── Get single ─────────────────────────────────────────────────────────────
@router.get(
    "/{org_id}",
    response_model=SuccessResponse[OrganizationResponse],
    summary="Get Organization Profile",
)
def get_organization(
    org_id: uuid.UUID,
    actor: User = require_permission("view_organization"),
    db: Session = Depends(get_db),
) -> SuccessResponse[OrganizationResponse]:
    org = organization_service.get_or_404(db, id=org_id, organization_id=actor.organization_id)
    return SuccessResponse(data=OrganizationResponse.model_validate(org))


# ── Update profile ─────────────────────────────────────────────────────────
@router.patch(
    "/{org_id}",
    response_model=SuccessResponse[OrganizationResponse],
    summary="Update Organization Profile",
)
def update_organization(
    org_id: uuid.UUID,
    payload: OrganizationUpdate,
    actor: User = require_permission("manage_organization"),
    db: Session = Depends(get_db),
) -> SuccessResponse[OrganizationResponse]:
    logger.info("Updating organization", org_id=str(org_id), actor_id=str(actor.id))
    org = organization_service.update(
        db, id=org_id, obj_in=payload, organization_id=actor.organization_id
    )
    return SuccessResponse(data=OrganizationResponse.model_validate(org))


# ── Update settings ────────────────────────────────────────────────────────
@router.patch(
    "/{org_id}/settings",
    response_model=SuccessResponse[OrganizationResponse],
    summary="Update Organization Settings",
    description=(
        "Merges the supplied settings into the existing JSONB settings blob. "
        "Fields not included in the request are left unchanged."
    ),
)
def update_organization_settings(
    org_id: uuid.UUID,
    payload: OrganizationSettings,
    actor: User = require_permission("manage_organization"),
    db: Session = Depends(get_db),
) -> SuccessResponse[OrganizationResponse]:
    logger.info("Updating organization settings", org_id=str(org_id), actor_id=str(actor.id))
    org = organization_service.update_settings(
        db, id=org_id, settings_in=payload, organization_id=actor.organization_id
    )
    return SuccessResponse(data=OrganizationResponse.model_validate(org))


# ── Dashboard ──────────────────────────────────────────────────────────────
@router.get(
    "/{org_id}/dashboard",
    response_model=SuccessResponse[DashboardSummaryResponse],
    summary="Get Organization Dashboard Summary",
)
def get_organization_dashboard(
    org_id: uuid.UUID,
    actor: User = require_permission("view_organization"),
    db: Session = Depends(get_db),
) -> SuccessResponse[DashboardSummaryResponse]:
    summary = organization_service.get_dashboard_summary(
        db, id=org_id, organization_id=actor.organization_id
    )
    return SuccessResponse(data=DashboardSummaryResponse(**summary))


# ── Activity Timeline ──────────────────────────────────────────────────────
@router.get(
    "/{org_id}/timeline",
    response_model=PaginatedResponse[AuditLogResponse],
    summary="Get Organization Activity Timeline",
    description="Returns paginated audit log events for this organization.",
)
def get_organization_timeline(
    org_id: uuid.UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    actor: User = require_permission("view_organization"),
    db: Session = Depends(get_db),
) -> PaginatedResponse[AuditLogResponse]:
    organization_service.get_or_404(db, id=org_id, organization_id=actor.organization_id)

    pagination = PaginationParams(offset=offset, limit=limit)
    result = audit_log_repository.get_multi(
        db,
        organization_id=org_id,
        pagination=pagination,
        sort_by="created_at",
        sort_order="desc",
    )

    return PaginatedResponse(
        data=[AuditLogResponse.model_validate(log) for log in result.items],
        meta=PaginationMeta(
            total=result.total,
            offset=result.offset,
            limit=result.limit,
            has_next=result.has_next,
        ),
    )


# ── Soft Delete ────────────────────────────────────────────────────────────
@router.delete(
    "/{org_id}",
    response_model=SuccessResponse[dict],
    summary="Soft Delete an Organization",
    description=(
        "Soft-deletes the organization by setting deleted_at. "
        "Data is retained in the database but the org becomes inaccessible via the API."
    ),
)
def delete_organization(
    org_id: uuid.UUID,
    actor: User = require_permission("manage_organization"),
    db: Session = Depends(get_db),
) -> SuccessResponse[dict]:
    logger.warning("Soft-deleting organization", org_id=str(org_id), actor_id=str(actor.id))
    organization_service.delete(db, id=org_id, organization_id=actor.organization_id)
    return SuccessResponse(data={"deleted": True, "organization_id": str(org_id)})
