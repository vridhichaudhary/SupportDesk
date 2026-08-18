"""
Agent Service
=============
Business logic for AgentProfile, Skills, Availability, and WorkingHours.
Wraps repositories with validation, audit logging, and Presence Engine integration.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Dict, List, Optional

import redis as redis_lib
from sqlalchemy.orm import Session

from src.core.exceptions import ConflictException, NotFoundException
from src.core.presence import presence_engine
from src.models import (
    ActionType,
    AgentAvailability,
    AgentProfile,
    AgentSkill,
    AgentStatus,
    ProficiencyLevel,
    Skill,
    SkillCategory,
    User,
    WorkingHours,
)
from src.repositories.agent import (
    AgentAvailabilityRepository,
    AgentProfileRepository,
    AgentSkillRepository,
    SkillRepository,
    WorkingHoursRepository,
    agent_availability_repo,
    agent_profile_repo,
    agent_skill_repo,
    skill_repo,
    working_hours_repo,
)
from src.services.audit_log import audit_log_service


class AgentService:
    def __init__(
        self,
        profile_repo: AgentProfileRepository,
        _skill_repo: SkillRepository,
        agent_skill_repo_: AgentSkillRepository,
        availability_repo: AgentAvailabilityRepository,
        wh_repo: WorkingHoursRepository,
    ) -> None:
        self.profile_repo = profile_repo
        self.skill_repo = _skill_repo
        self.agent_skill_repo = agent_skill_repo_
        self.availability_repo = availability_repo
        self.wh_repo = wh_repo

    # ─────────────────────────────────────────────────────────────────────
    # Agent Profile
    # ─────────────────────────────────────────────────────────────────────

    def get_profile(self, db: Session, user_id: uuid.UUID) -> Optional[AgentProfile]:
        return self.profile_repo.get_by_user_id(db, user_id)

    def upsert_profile(
        self,
        db: Session,
        user_id: uuid.UUID,
        org_id: uuid.UUID,
        actor: User,
        agent_code: Optional[str] = None,
        employee_id: Optional[str] = None,
        experience_level: Optional[ProficiencyLevel] = None,
        languages_spoken: Optional[list] = None,
        max_concurrent_tickets: Optional[int] = None,
        max_daily_tickets: Optional[int] = None,
    ) -> AgentProfile:
        kwargs = {}
        if agent_code is not None:
            kwargs["agent_code"] = agent_code
        if employee_id is not None:
            kwargs["employee_id"] = employee_id
        if experience_level is not None:
            kwargs["experience_level"] = experience_level
        if languages_spoken is not None:
            kwargs["languages_spoken"] = languages_spoken
        if max_concurrent_tickets is not None:
            kwargs["max_concurrent_tickets"] = max_concurrent_tickets
        if max_daily_tickets is not None:
            kwargs["max_daily_tickets"] = max_daily_tickets

        profile = self.profile_repo.upsert(db, user_id, **kwargs)
        db.commit()
        db.refresh(profile)

        audit_log_service.log_action(
            db=db,
            organization_id=org_id,
            actor_id=actor.id,
            action_type=ActionType.UPDATE,
            entity_type="AgentProfile",
            entity_id=user_id,
            changes=kwargs,
        )
        return profile

    # ─────────────────────────────────────────────────────────────────────
    # Skills
    # ─────────────────────────────────────────────────────────────────────

    def list_org_skills(
        self,
        db: Session,
        org_id: uuid.UUID,
        category: Optional[SkillCategory] = None,
        skip: int = 0,
        limit: int = 200,
    ) -> List[Skill]:
        return self.skill_repo.list_for_org(db, org_id, category=category, skip=skip, limit=limit)

    def create_skill(
        self,
        db: Session,
        org_id: uuid.UUID,
        actor: User,
        name: str,
        description: Optional[str] = None,
        category: SkillCategory = SkillCategory.OTHER,
    ) -> Skill:
        if self.skill_repo.get_by_name(db, name, org_id):
            raise ConflictException(f"Skill '{name}' already exists")

        skill = self.skill_repo.create(db, org_id, name, description, category)
        db.commit()
        db.refresh(skill)

        audit_log_service.log_action(
            db=db,
            organization_id=org_id,
            actor_id=actor.id,
            action_type=ActionType.CREATE,
            entity_type="Skill",
            entity_id=skill.id,
            changes={"name": name, "category": category.value},
        )
        return skill

    def delete_skill(
        self,
        db: Session,
        skill_id: uuid.UUID,
        org_id: uuid.UUID,
        actor: User,
    ) -> None:
        skill = self.skill_repo.get(db, skill_id, org_id)
        if not skill:
            raise NotFoundException("Skill not found")
        self.skill_repo.delete(db, skill)
        db.commit()

        audit_log_service.log_action(
            db=db,
            organization_id=org_id,
            actor_id=actor.id,
            action_type=ActionType.DELETE,
            entity_type="Skill",
            entity_id=skill_id,
            changes={"name": skill.name},
        )

    def get_agent_skills(self, db: Session, user_id: uuid.UUID) -> List[AgentSkill]:
        return self.agent_skill_repo.list_for_agent(db, user_id)

    def assign_skill(
        self,
        db: Session,
        user_id: uuid.UUID,
        skill_id: uuid.UUID,
        org_id: uuid.UUID,
        actor: User,
        proficiency_level: ProficiencyLevel = ProficiencyLevel.BEGINNER,
        years_of_experience: Optional[int] = None,
    ) -> AgentSkill:
        # Verify skill belongs to org
        skill = self.skill_repo.get(db, skill_id, org_id)
        if not skill:
            raise NotFoundException("Skill not found in this organization")

        agent_skill = self.agent_skill_repo.assign(
            db,
            user_id=user_id,
            skill_id=skill_id,
            proficiency_level=proficiency_level,
            years_of_experience=years_of_experience,
        )
        db.commit()
        db.refresh(agent_skill)

        audit_log_service.log_action(
            db=db,
            organization_id=org_id,
            actor_id=actor.id,
            action_type=ActionType.UPDATE,
            entity_type="AgentSkill",
            entity_id=user_id,
            changes={
                "skill_id": str(skill_id),
                "proficiency": proficiency_level.value,
            },
        )
        return agent_skill

    def remove_skill(
        self,
        db: Session,
        user_id: uuid.UUID,
        skill_id: uuid.UUID,
        org_id: uuid.UUID,
        actor: User,
    ) -> None:
        agent_skill = self.agent_skill_repo.get(db, user_id, skill_id)
        if not agent_skill:
            raise NotFoundException("Agent does not have this skill")
        self.agent_skill_repo.remove(db, agent_skill)
        db.commit()

    # ─────────────────────────────────────────────────────────────────────
    # Availability
    # ─────────────────────────────────────────────────────────────────────

    def get_availability(self, db: Session, user_id: uuid.UUID) -> Optional[AgentAvailability]:
        return self.availability_repo.get_by_user(db, user_id)

    def set_availability(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        user_id: uuid.UUID,
        org_id: uuid.UUID,
        status: AgentStatus,
        expected_return: Optional[datetime] = None,
    ) -> AgentAvailability:
        avail = self.availability_repo.upsert(db, user_id, status, expected_return=expected_return)
        db.commit()
        db.refresh(avail)

        # Sync to Presence Engine (Redis)
        presence_engine.set_status(
            redis_client, user_id, org_id, status, expected_return=expected_return
        )
        return avail

    # ─────────────────────────────────────────────────────────────────────
    # Heartbeat (called by frontend polling)
    # ─────────────────────────────────────────────────────────────────────

    def heartbeat(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
        user_id: uuid.UUID,
        org_id: uuid.UUID,
        device_info: Optional[str] = None,
    ) -> Dict:
        # Update Redis presence (TTL refresh)
        presence_engine.heartbeat(redis_client, user_id, org_id, device_info=device_info)
        # Return current status
        return presence_engine.get_status(redis_client, user_id)

    # ─────────────────────────────────────────────────────────────────────
    # Working Hours
    # ─────────────────────────────────────────────────────────────────────

    def get_working_hours(self, db: Session, user_id: uuid.UUID) -> Optional[WorkingHours]:
        return self.wh_repo.get_by_user(db, user_id)

    def upsert_working_hours(
        self,
        db: Session,
        user_id: uuid.UUID,
        org_id: uuid.UUID,
        actor: User,
        timezone: str,
        working_days: list,
        start_time: str,
        end_time: str,
        shifts: Optional[list] = None,
        lunch_break_start: Optional[str] = None,
        lunch_break_end: Optional[str] = None,
    ) -> WorkingHours:
        wh = self.wh_repo.upsert(
            db,
            user_id=user_id,
            timezone=timezone,
            working_days=working_days,
            start_time=start_time,
            end_time=end_time,
            shifts=shifts,
            lunch_break_start=lunch_break_start,
            lunch_break_end=lunch_break_end,
        )
        db.commit()
        db.refresh(wh)

        audit_log_service.log_action(
            db=db,
            organization_id=org_id,
            actor_id=actor.id,
            action_type=ActionType.UPDATE,
            entity_type="WorkingHours",
            entity_id=user_id,
            changes={"timezone": timezone, "working_days": working_days},
        )
        return wh

    # ─────────────────────────────────────────────────────────────────────
    # Presence (bulk)
    # ─────────────────────────────────────────────────────────────────────

    def get_team_presence(
        self,
        redis_client: redis_lib.Redis,
        user_ids: List[uuid.UUID],
    ) -> Dict:
        return presence_engine.get_org_presence(redis_client, user_ids)


agent_service = AgentService(
    agent_profile_repo,
    skill_repo,
    agent_skill_repo,
    agent_availability_repo,
    working_hours_repo,
)
