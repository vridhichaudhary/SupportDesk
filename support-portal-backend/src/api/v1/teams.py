"""
Teams API
=========
CRUD endpoints for Teams and Team Member management.
Secured by the RBAC Permission Engine.
"""
from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.core.authorization import require_permission
from src.core.dependencies import get_db
from src.models import User
from src.schemas.team import (
    TeamCreate,
    TeamListResponse,
    TeamMemberCreate,
    TeamMemberWithUserResponse,
    TeamResponse,
    TeamUpdate,
)
from src.services.team import team_service

router = APIRouter(prefix="/teams", tags=["Teams"])


# ─────────────────────────────────────────────────────────────────────────────
# Team CRUD
# ─────────────────────────────────────────────────────────────────────────────


@router.get("", response_model=TeamListResponse, summary="List teams")
def list_teams(
    department_id: uuid.UUID = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    actor: User = require_permission("view_teams"),
    db: Session = Depends(get_db),
):
    result = team_service.list_teams(
        db,
        org_id=actor.organization_id,
        department_id=department_id,
        skip=skip,
        limit=limit,
    )
    return TeamListResponse(**result)


@router.post(
    "",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a team",
)
def create_team(
    body: TeamCreate,
    actor: User = require_permission("manage_teams"),
    db: Session = Depends(get_db),
):
    return team_service.create_team(
        db,
        org_id=actor.organization_id,
        actor=actor,
        name=body.name,
        description=body.description,
        department_id=body.department_id,
        avatar_url=body.avatar_url,
        color=body.color,
        max_capacity=body.max_capacity,
        default_sla=body.default_sla,
        business_hours=body.business_hours,
    )


@router.get("/{team_id}", response_model=TeamResponse, summary="Get a team")
def get_team(
    team_id: uuid.UUID,
    actor: User = require_permission("view_teams"),
    db: Session = Depends(get_db),
):
    return team_service.get_or_404(db, team_id, actor.organization_id)


@router.patch("/{team_id}", response_model=TeamResponse, summary="Update a team")
def update_team(
    team_id: uuid.UUID,
    body: TeamUpdate,
    actor: User = require_permission("manage_teams"),
    db: Session = Depends(get_db),
):
    return team_service.update_team(
        db,
        team_id=team_id,
        org_id=actor.organization_id,
        actor=actor,
        name=body.name,
        description=body.description,
        department_id=body.department_id,
        avatar_url=body.avatar_url,
        color=body.color,
        max_capacity=body.max_capacity,
        default_sla=body.default_sla,
        business_hours=body.business_hours,
        status=body.status,
    )


@router.delete(
    "/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a team",
)
def delete_team(
    team_id: uuid.UUID,
    actor: User = require_permission("manage_teams"),
    db: Session = Depends(get_db),
):
    team_service.delete_team(db, team_id=team_id, org_id=actor.organization_id, actor=actor)


# ─────────────────────────────────────────────────────────────────────────────
# Team Members
# ─────────────────────────────────────────────────────────────────────────────


@router.get(
    "/{team_id}/members",
    response_model=List[TeamMemberWithUserResponse],
    summary="List team members",
)
def list_team_members(
    team_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    actor: User = require_permission("view_teams"),
    db: Session = Depends(get_db),
):
    return team_service.get_team_members(db, team_id, actor.organization_id, skip=skip, limit=limit)


@router.post(
    "/{team_id}/members",
    status_code=status.HTTP_201_CREATED,
    summary="Add a member to a team",
)
def add_team_member(
    team_id: uuid.UUID,
    body: TeamMemberCreate,
    actor: User = require_permission("manage_team_members"),
    db: Session = Depends(get_db),
):
    membership = team_service.add_member(
        db,
        team_id=team_id,
        org_id=actor.organization_id,
        user_id=body.user_id,
        actor=actor,
        is_primary=body.is_primary,
    )
    return {"id": str(membership.id), "team_id": str(team_id), "user_id": str(body.user_id)}


@router.delete(
    "/{team_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a member from a team",
)
def remove_team_member(
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    actor: User = require_permission("manage_team_members"),
    db: Session = Depends(get_db),
):
    team_service.remove_member(
        db,
        team_id=team_id,
        org_id=actor.organization_id,
        user_id=user_id,
        actor=actor,
    )
