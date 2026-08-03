"""
Agents API
==========
Endpoints for Agent Profile, Skills, Availability, Working Hours,
and Presence (Heartbeat).
All endpoints are tenant-scoped and RBAC-secured.
"""
from __future__ import annotations

import uuid
from typing import Dict, List

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.core.authorization import require_any_permission, require_permission
from src.core.dependencies import get_db, get_redis
from src.core.exceptions import NotFoundException
from src.models import User
from src.repositories.user import user_repository
from src.schemas.agent import (
    AgentProfileResponse,
    AgentProfileUpdate,
    AgentSkillAssign,
    AgentSkillResponse,
    AvailabilityResponse,
    AvailabilityUpdate,
    HeartbeatRequest,
    PresenceResponse,
    SkillCreate,
    SkillResponse,
    TeamPresenceResponse,
    WorkingHoursResponse,
    WorkingHoursUpdate,
)
from src.services.agent import agent_service

router = APIRouter(prefix="/agents", tags=["Agents"])


# ─────────────────────────────────────────────────────────────────────────────
# Skills (org-level)
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/skills", response_model=List[SkillResponse], summary="List org skills")
def list_skills(
    category: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    actor: User = require_permission("view_agent_profiles"),
    db: Session = Depends(get_db),
):
    from src.models import SkillCategory

    cat = SkillCategory(category) if category else None
    return agent_service.list_org_skills(db, actor.organization_id, category=cat, skip=skip, limit=limit)


@router.post(
    "/skills",
    response_model=SkillResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an org skill",
)
def create_skill(
    body: SkillCreate,
    actor: User = require_permission("manage_skills"),
    db: Session = Depends(get_db),
):
    return agent_service.create_skill(
        db,
        org_id=actor.organization_id,
        actor=actor,
        name=body.name,
        description=body.description,
        category=body.category,
    )


@router.delete(
    "/skills/{skill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an org skill",
)
def delete_skill(
    skill_id: uuid.UUID,
    actor: User = require_permission("manage_skills"),
    db: Session = Depends(get_db),
):
    agent_service.delete_skill(db, skill_id=skill_id, org_id=actor.organization_id, actor=actor)


# ─────────────────────────────────────────────────────────────────────────────
# My Agent Routes (self)
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/me/profile", response_model=AgentProfileResponse, summary="Get my agent profile")
def get_my_profile(
    actor: User = require_permission("view_agent_profiles"),
    db: Session = Depends(get_db),
):
    profile = agent_service.get_profile(db, actor.id)
    if not profile:
        raise NotFoundException("Agent profile not found. Contact your admin.")
    return profile


@router.patch("/me/profile", response_model=AgentProfileResponse, summary="Update my agent profile")
def update_my_profile(
    body: AgentProfileUpdate,
    actor: User = require_permission("view_agent_profiles"),
    db: Session = Depends(get_db),
):
    return agent_service.upsert_profile(
        db,
        user_id=actor.id,
        org_id=actor.organization_id,
        actor=actor,
        **body.model_dump(exclude_none=True),
    )


@router.post("/me/heartbeat", response_model=PresenceResponse, summary="Send presence heartbeat")
def heartbeat(
    body: HeartbeatRequest,
    actor: User = require_permission("view_agent_profiles"),
    db: Session = Depends(get_db),
    redis=Depends(get_redis),
):
    data = agent_service.heartbeat(
        db, redis, actor.id, actor.organization_id, device_info=body.device_info
    )
    return PresenceResponse(**data)


@router.get("/me/availability", response_model=AvailabilityResponse, summary="Get my availability")
def get_my_availability(
    actor: User = require_permission("view_agent_profiles"),
    db: Session = Depends(get_db),
):
    avail = agent_service.get_availability(db, actor.id)
    if not avail:
        raise NotFoundException("No availability record yet. Update it first.")
    return avail


@router.put("/me/availability", response_model=AvailabilityResponse, summary="Set my availability")
def set_my_availability(
    body: AvailabilityUpdate,
    actor: User = require_permission("manage_availability"),
    db: Session = Depends(get_db),
    redis=Depends(get_redis),
):
    return agent_service.set_availability(
        db,
        redis,
        user_id=actor.id,
        org_id=actor.organization_id,
        status=body.status,
        expected_return=body.expected_return,
    )


@router.get("/me/working-hours", response_model=WorkingHoursResponse, summary="Get my working hours")
def get_my_working_hours(
    actor: User = require_permission("view_agent_profiles"),
    db: Session = Depends(get_db),
):
    wh = agent_service.get_working_hours(db, actor.id)
    if not wh:
        raise NotFoundException("No working hours set yet.")
    return wh


@router.put("/me/working-hours", response_model=WorkingHoursResponse, summary="Update my working hours")
def update_my_working_hours(
    body: WorkingHoursUpdate,
    actor: User = require_permission("manage_availability"),
    db: Session = Depends(get_db),
):
    return agent_service.upsert_working_hours(
        db,
        user_id=actor.id,
        org_id=actor.organization_id,
        actor=actor,
        **body.model_dump(),
    )


@router.get(
    "/me/skills",
    response_model=List[AgentSkillResponse],
    summary="List my skills",
)
def list_my_skills(
    actor: User = require_permission("view_agent_profiles"),
    db: Session = Depends(get_db),
):
    return agent_service.get_agent_skills(db, actor.id)


@router.post(
    "/me/skills",
    response_model=AgentSkillResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign a skill to myself",
)
def assign_my_skill(
    body: AgentSkillAssign,
    actor: User = require_permission("manage_skills"),
    db: Session = Depends(get_db),
):
    return agent_service.assign_skill(
        db,
        user_id=actor.id,
        skill_id=body.skill_id,
        org_id=actor.organization_id,
        actor=actor,
        proficiency_level=body.proficiency_level,
        years_of_experience=body.years_of_experience,
    )


@router.delete(
    "/me/skills/{skill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a skill from myself",
)
def remove_my_skill(
    skill_id: uuid.UUID,
    actor: User = require_permission("manage_skills"),
    db: Session = Depends(get_db),
):
    agent_service.remove_skill(db, actor.id, skill_id, actor.organization_id, actor)


# ─────────────────────────────────────────────────────────────────────────────
# Admin Routes (manage another agent)
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/{agent_id}/profile", response_model=AgentProfileResponse, summary="Get agent profile")
def get_agent_profile(
    agent_id: uuid.UUID,
    actor: User = require_permission("view_agent_profiles"),
    db: Session = Depends(get_db),
):
    # Verify agent belongs to org
    user = user_repository.get_by_id(db, agent_id)
    if not user or user.organization_id != actor.organization_id:
        raise NotFoundException("Agent not found")
    profile = agent_service.get_profile(db, agent_id)
    if not profile:
        raise NotFoundException("Agent profile not found")
    return profile


@router.patch("/{agent_id}/profile", response_model=AgentProfileResponse, summary="Update agent profile")
def update_agent_profile(
    agent_id: uuid.UUID,
    body: AgentProfileUpdate,
    actor: User = require_permission("manage_users"),
    db: Session = Depends(get_db),
):
    user = user_repository.get_by_id(db, agent_id)
    if not user or user.organization_id != actor.organization_id:
        raise NotFoundException("Agent not found")

    return agent_service.upsert_profile(
        db,
        user_id=agent_id,
        org_id=actor.organization_id,
        actor=actor,
        **body.model_dump(exclude_none=True),
    )


@router.get(
    "/{agent_id}/skills",
    response_model=List[AgentSkillResponse],
    summary="Get agent skills",
)
def get_agent_skills(
    agent_id: uuid.UUID,
    actor: User = require_permission("view_agent_profiles"),
    db: Session = Depends(get_db),
):
    user = user_repository.get_by_id(db, agent_id)
    if not user or user.organization_id != actor.organization_id:
        raise NotFoundException("Agent not found")
    return agent_service.get_agent_skills(db, agent_id)


@router.get(
    "/{agent_id}/availability",
    response_model=AvailabilityResponse,
    summary="Get agent availability",
)
def get_agent_availability(
    agent_id: uuid.UUID,
    actor: User = require_permission("view_agent_profiles"),
    db: Session = Depends(get_db),
):
    user = user_repository.get_by_id(db, agent_id)
    if not user or user.organization_id != actor.organization_id:
        raise NotFoundException("Agent not found")
    avail = agent_service.get_availability(db, agent_id)
    if not avail:
        raise NotFoundException("No availability record for this agent")
    return avail


@router.get(
    "/presence/team",
    response_model=TeamPresenceResponse,
    summary="Get bulk presence for user IDs",
)
def get_team_presence(
    user_ids: str = Query(..., description="Comma-separated list of user UUIDs"),
    actor: User = require_permission("view_team_statistics"),
    redis=Depends(get_redis),
):
    ids = [uuid.UUID(uid.strip()) for uid in user_ids.split(",") if uid.strip()]
    presence_data = agent_service.get_team_presence(redis, ids)
    return TeamPresenceResponse(presence={k: PresenceResponse(**v) for k, v in presence_data.items()})
