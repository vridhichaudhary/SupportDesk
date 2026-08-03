"""
Agent Repository
================
Data access layer for AgentProfile, Skill, AgentSkill,
AgentAvailability, and WorkingHours models.
No business logic. Tenant-isolated by organization_id where applicable.
"""
from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from src.models import (
    AgentAvailability,
    AgentProfile,
    AgentSkill,
    AgentStatus,
    ProficiencyLevel,
    Skill,
    SkillCategory,
    WorkingHours,
)


# ─────────────────────────────────────────────────────────────────────────────
# AgentProfile
# ─────────────────────────────────────────────────────────────────────────────


class AgentProfileRepository:

    def get_by_user_id(
        self, db: Session, user_id: uuid.UUID
    ) -> Optional[AgentProfile]:
        stmt = select(AgentProfile).where(AgentProfile.user_id == user_id)
        return db.execute(stmt).scalar_one_or_none()

    def create(
        self,
        db: Session,
        user_id: uuid.UUID,
        agent_code: Optional[str] = None,
        employee_id: Optional[str] = None,
        experience_level: ProficiencyLevel = ProficiencyLevel.BEGINNER,
        languages_spoken: Optional[list] = None,
        max_concurrent_tickets: int = 5,
        max_daily_tickets: int = 50,
    ) -> AgentProfile:
        profile = AgentProfile(
            id=uuid.uuid4(),
            user_id=user_id,
            agent_code=agent_code,
            employee_id=employee_id,
            experience_level=experience_level,
            languages_spoken=languages_spoken or [],
            max_concurrent_tickets=max_concurrent_tickets,
            max_daily_tickets=max_daily_tickets,
        )
        db.add(profile)
        db.flush()
        return profile

    def upsert(
        self,
        db: Session,
        user_id: uuid.UUID,
        **kwargs,
    ) -> AgentProfile:
        """Create or update the agent profile for a user."""
        profile = self.get_by_user_id(db, user_id)
        if profile is None:
            return self.create(db, user_id, **kwargs)
        for key, value in kwargs.items():
            if value is not None and hasattr(profile, key):
                setattr(profile, key, value)
        db.add(profile)
        db.flush()
        return profile

    def increment_active_tickets(self, db: Session, user_id: uuid.UUID) -> None:
        profile = self.get_by_user_id(db, user_id)
        if profile:
            profile.current_active_tickets = min(
                profile.current_active_tickets + 1, profile.max_concurrent_tickets
            )
            db.add(profile)
            db.flush()

    def decrement_active_tickets(self, db: Session, user_id: uuid.UUID) -> None:
        profile = self.get_by_user_id(db, user_id)
        if profile:
            profile.current_active_tickets = max(profile.current_active_tickets - 1, 0)
            db.add(profile)
            db.flush()


# ─────────────────────────────────────────────────────────────────────────────
# Skill
# ─────────────────────────────────────────────────────────────────────────────


class SkillRepository:

    def get(
        self, db: Session, skill_id: uuid.UUID, org_id: uuid.UUID
    ) -> Optional[Skill]:
        stmt = select(Skill).where(
            Skill.id == skill_id, Skill.organization_id == org_id
        )
        return db.execute(stmt).scalar_one_or_none()

    def get_by_name(
        self, db: Session, name: str, org_id: uuid.UUID
    ) -> Optional[Skill]:
        stmt = select(Skill).where(
            Skill.name == name, Skill.organization_id == org_id
        )
        return db.execute(stmt).scalar_one_or_none()

    def list_for_org(
        self,
        db: Session,
        org_id: uuid.UUID,
        category: Optional[SkillCategory] = None,
        skip: int = 0,
        limit: int = 200,
    ) -> List[Skill]:
        stmt = select(Skill).where(Skill.organization_id == org_id)
        if category:
            stmt = stmt.where(Skill.category == category)
        stmt = stmt.order_by(Skill.category, Skill.name).offset(skip).limit(limit)
        return list(db.execute(stmt).scalars().all())

    def create(
        self,
        db: Session,
        org_id: uuid.UUID,
        name: str,
        description: Optional[str] = None,
        category: SkillCategory = SkillCategory.OTHER,
    ) -> Skill:
        skill = Skill(
            id=uuid.uuid4(),
            organization_id=org_id,
            name=name,
            description=description,
            category=category,
        )
        db.add(skill)
        db.flush()
        return skill

    def delete(self, db: Session, skill: Skill) -> None:
        db.delete(skill)
        db.flush()


# ─────────────────────────────────────────────────────────────────────────────
# AgentSkill
# ─────────────────────────────────────────────────────────────────────────────


class AgentSkillRepository:

    def get(
        self, db: Session, user_id: uuid.UUID, skill_id: uuid.UUID
    ) -> Optional[AgentSkill]:
        stmt = select(AgentSkill).where(
            AgentSkill.user_id == user_id,
            AgentSkill.skill_id == skill_id,
        )
        return db.execute(stmt).scalar_one_or_none()

    def list_for_agent(
        self, db: Session, user_id: uuid.UUID, active_only: bool = True
    ) -> List[AgentSkill]:
        stmt = (
            select(AgentSkill)
            .where(AgentSkill.user_id == user_id)
            .options(joinedload(AgentSkill.skill))
        )
        if active_only:
            stmt = stmt.where(AgentSkill.is_active.is_(True))
        return list(db.execute(stmt).scalars().all())

    def list_agents_with_skill(
        self,
        db: Session,
        skill_id: uuid.UUID,
        min_proficiency: Optional[ProficiencyLevel] = None,
    ) -> List[AgentSkill]:
        stmt = select(AgentSkill).where(
            AgentSkill.skill_id == skill_id,
            AgentSkill.is_active.is_(True),
        )
        return list(db.execute(stmt).scalars().all())

    def assign(
        self,
        db: Session,
        user_id: uuid.UUID,
        skill_id: uuid.UUID,
        proficiency_level: ProficiencyLevel = ProficiencyLevel.BEGINNER,
        years_of_experience: Optional[int] = None,
    ) -> AgentSkill:
        existing = self.get(db, user_id, skill_id)
        if existing:
            existing.proficiency_level = proficiency_level
            existing.years_of_experience = years_of_experience
            existing.is_active = True
            db.add(existing)
            db.flush()
            return existing

        agent_skill = AgentSkill(
            id=uuid.uuid4(),
            user_id=user_id,
            skill_id=skill_id,
            proficiency_level=proficiency_level,
            years_of_experience=years_of_experience,
        )
        db.add(agent_skill)
        db.flush()
        return agent_skill

    def remove(self, db: Session, agent_skill: AgentSkill) -> None:
        agent_skill.is_active = False
        db.add(agent_skill)
        db.flush()


# ─────────────────────────────────────────────────────────────────────────────
# AgentAvailability
# ─────────────────────────────────────────────────────────────────────────────


class AgentAvailabilityRepository:

    def get_by_user(
        self, db: Session, user_id: uuid.UUID
    ) -> Optional[AgentAvailability]:
        stmt = select(AgentAvailability).where(
            AgentAvailability.user_id == user_id
        )
        return db.execute(stmt).scalar_one_or_none()

    def upsert(
        self,
        db: Session,
        user_id: uuid.UUID,
        status: AgentStatus,
        expected_return=None,
    ) -> AgentAvailability:
        from datetime import datetime

        avail = self.get_by_user(db, user_id)
        if avail:
            avail.status = status
            avail.since = datetime.utcnow()
            avail.expected_return = expected_return
        else:
            avail = AgentAvailability(
                id=uuid.uuid4(),
                user_id=user_id,
                status=status,
                expected_return=expected_return,
            )
        db.add(avail)
        db.flush()
        return avail


# ─────────────────────────────────────────────────────────────────────────────
# WorkingHours
# ─────────────────────────────────────────────────────────────────────────────


class WorkingHoursRepository:

    def get_by_user(
        self, db: Session, user_id: uuid.UUID
    ) -> Optional[WorkingHours]:
        stmt = select(WorkingHours).where(WorkingHours.user_id == user_id)
        return db.execute(stmt).scalar_one_or_none()

    def upsert(
        self,
        db: Session,
        user_id: uuid.UUID,
        timezone: str,
        working_days: list,
        start_time: str,
        end_time: str,
        shifts: Optional[list] = None,
        lunch_break_start: Optional[str] = None,
        lunch_break_end: Optional[str] = None,
    ) -> WorkingHours:
        wh = self.get_by_user(db, user_id)
        if wh:
            wh.timezone = timezone
            wh.working_days = working_days
            wh.start_time = start_time
            wh.end_time = end_time
            wh.shifts = shifts
            wh.lunch_break_start = lunch_break_start
            wh.lunch_break_end = lunch_break_end
        else:
            wh = WorkingHours(
                id=uuid.uuid4(),
                user_id=user_id,
                timezone=timezone,
                working_days=working_days,
                start_time=start_time,
                end_time=end_time,
                shifts=shifts,
                lunch_break_start=lunch_break_start,
                lunch_break_end=lunch_break_end,
            )
        db.add(wh)
        db.flush()
        return wh


# Singletons
agent_profile_repo = AgentProfileRepository()
skill_repo = SkillRepository()
agent_skill_repo = AgentSkillRepository()
agent_availability_repo = AgentAvailabilityRepository()
working_hours_repo = WorkingHoursRepository()
