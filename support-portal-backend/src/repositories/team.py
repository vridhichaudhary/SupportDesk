"""
Team Repository
===============
Data access layer for Team and TeamMember models.
No business logic. Tenant-isolated by organization_id.
"""

from __future__ import annotations

import uuid
from datetime import timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from src.models import Team, TeamMember, TeamStatus


class TeamRepository:
    def get(self, db: Session, team_id: uuid.UUID, org_id: uuid.UUID) -> Optional[Team]:
        stmt = select(Team).where(
            Team.id == team_id,
            Team.organization_id == org_id,
            Team.deleted_at.is_(None),
        )
        return db.execute(stmt).scalar_one_or_none()

    def list_active(
        self,
        db: Session,
        org_id: uuid.UUID,
        department_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Team]:
        stmt = select(Team).where(
            Team.organization_id == org_id,
            Team.deleted_at.is_(None),
            Team.status != TeamStatus.DELETED,
        )
        if department_id:
            stmt = stmt.where(Team.department_id == department_id)
        stmt = stmt.order_by(Team.name).offset(skip).limit(limit)
        return list(db.execute(stmt).scalars().all())

    def count_active(
        self,
        db: Session,
        org_id: uuid.UUID,
        department_id: Optional[uuid.UUID] = None,
    ) -> int:
        from sqlalchemy import func

        stmt = select(func.count()).where(
            Team.organization_id == org_id,
            Team.deleted_at.is_(None),
            Team.status != TeamStatus.DELETED,
        )
        if department_id:
            stmt = stmt.where(Team.department_id == department_id)
        return db.execute(stmt).scalar_one()

    def get_by_name(self, db: Session, name: str, org_id: uuid.UUID) -> Optional[Team]:
        stmt = select(Team).where(
            Team.organization_id == org_id,
            Team.name == name,
            Team.deleted_at.is_(None),
        )
        return db.execute(stmt).scalar_one_or_none()

    def create(
        self,
        db: Session,
        org_id: uuid.UUID,
        name: str,
        description: Optional[str] = None,
        department_id: Optional[uuid.UUID] = None,
        avatar_url: Optional[str] = None,
        color: Optional[str] = None,
        max_capacity: int = 50,
        default_sla: Optional[int] = None,
        business_hours: Optional[dict] = None,
    ) -> Team:
        team = Team(
            id=uuid.uuid4(),
            organization_id=org_id,
            name=name,
            description=description,
            department_id=department_id,
            avatar_url=avatar_url,
            color=color,
            max_capacity=max_capacity,
            current_capacity=0,
            default_sla=default_sla,
            business_hours=business_hours,
        )
        db.add(team)
        db.flush()
        return team

    def update(
        self,
        db: Session,
        team: Team,
        name: Optional[str] = None,
        description: Optional[str] = None,
        department_id: Optional[uuid.UUID] = None,
        avatar_url: Optional[str] = None,
        color: Optional[str] = None,
        max_capacity: Optional[int] = None,
        default_sla: Optional[int] = None,
        business_hours: Optional[dict] = None,
        status: Optional[TeamStatus] = None,
    ) -> Team:
        if name is not None:
            team.name = name
        if description is not None:
            team.description = description
        if department_id is not None:
            team.department_id = department_id
        if avatar_url is not None:
            team.avatar_url = avatar_url
        if color is not None:
            team.color = color
        if max_capacity is not None:
            team.max_capacity = max_capacity
        if default_sla is not None:
            team.default_sla = default_sla
        if business_hours is not None:
            team.business_hours = business_hours
        if status is not None:
            team.status = status
        db.add(team)
        db.flush()
        return team

    def recalculate_capacity(self, db: Session, team: Team) -> Team:
        """Recounts active members and syncs current_capacity."""
        stmt = select(TeamMember).where(
            TeamMember.team_id == team.id,
        )
        count = len(list(db.execute(stmt).scalars().all()))
        team.current_capacity = count
        db.add(team)
        db.flush()
        return team

    def soft_delete(self, db: Session, team: Team) -> None:
        from datetime import datetime

        team.deleted_at = datetime.now(timezone.utc)
        team.status = TeamStatus.DELETED
        db.add(team)
        db.flush()


class TeamMemberRepository:
    def get_membership(
        self, db: Session, team_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[TeamMember]:
        stmt = select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
        return db.execute(stmt).scalar_one_or_none()

    def list_team_members(
        self, db: Session, team_id: uuid.UUID, skip: int = 0, limit: int = 200
    ) -> List[TeamMember]:
        stmt = (
            select(TeamMember)
            .where(TeamMember.team_id == team_id)
            .options(joinedload(TeamMember.user))
            .offset(skip)
            .limit(limit)
        )
        return list(db.execute(stmt).scalars().all())

    def list_user_teams(self, db: Session, user_id: uuid.UUID) -> List[TeamMember]:
        stmt = (
            select(TeamMember)
            .where(TeamMember.user_id == user_id)
            .options(joinedload(TeamMember.team))
        )
        return list(db.execute(stmt).scalars().all())

    def count_members(self, db: Session, team_id: uuid.UUID) -> int:
        from sqlalchemy import func

        stmt = select(func.count()).where(TeamMember.team_id == team_id)
        return db.execute(stmt).scalar_one()

    def add(
        self,
        db: Session,
        team_id: uuid.UUID,
        user_id: uuid.UUID,
        is_primary: bool = False,
    ) -> TeamMember:
        membership = TeamMember(
            id=uuid.uuid4(),
            team_id=team_id,
            user_id=user_id,
            is_primary=is_primary,
        )
        db.add(membership)
        db.flush()
        return membership

    def remove(self, db: Session, membership: TeamMember) -> None:
        db.delete(membership)
        db.flush()

    def set_primary(self, db: Session, team_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Sets one member as primary, clears primary flag from all others."""
        all_members = self.list_team_members(db, team_id)
        for m in all_members:
            m.is_primary = m.user_id == user_id
            db.add(m)
        db.flush()


team_repo = TeamRepository()
team_member_repo = TeamMemberRepository()
