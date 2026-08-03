"""
Team Service
============
Business logic for Team and TeamMember management.
Enforces tenant isolation, capacity limits, uniqueness, and audit logging.
"""
from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy.orm import Session

from src.core.exceptions import ConflictException, NotFoundException, ValidationException
from src.models import ActionType, Team, TeamMember, TeamStatus, User
from src.repositories.team import (
    TeamMemberRepository,
    TeamRepository,
    team_member_repo,
    team_repo,
)
from src.services.audit_log import audit_log_service


class TeamService:

    def __init__(
        self,
        repo: TeamRepository,
        member_repo: TeamMemberRepository,
    ) -> None:
        self.repo = repo
        self.member_repo = member_repo

    # ─────────────────────────────────────────────────────────────────────
    # Read
    # ─────────────────────────────────────────────────────────────────────

    def get_or_404(
        self, db: Session, team_id: uuid.UUID, org_id: uuid.UUID
    ) -> Team:
        team = self.repo.get(db, team_id, org_id)
        if not team:
            raise NotFoundException("Team not found")
        return team

    def list_teams(
        self,
        db: Session,
        org_id: uuid.UUID,
        department_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> dict:
        items = self.repo.list_active(db, org_id, department_id=department_id, skip=skip, limit=limit)
        total = self.repo.count_active(db, org_id, department_id=department_id)
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    def get_team_members(
        self, db: Session, team_id: uuid.UUID, org_id: uuid.UUID, skip: int = 0, limit: int = 200
    ) -> List[TeamMember]:
        self.get_or_404(db, team_id, org_id)
        return self.member_repo.list_team_members(db, team_id, skip=skip, limit=limit)

    # ─────────────────────────────────────────────────────────────────────
    # Create
    # ─────────────────────────────────────────────────────────────────────

    def create_team(
        self,
        db: Session,
        org_id: uuid.UUID,
        actor: User,
        name: str,
        description: Optional[str] = None,
        department_id: Optional[uuid.UUID] = None,
        avatar_url: Optional[str] = None,
        color: Optional[str] = None,
        max_capacity: int = 50,
        default_sla: Optional[int] = None,
        business_hours: Optional[dict] = None,
    ) -> Team:
        if self.repo.get_by_name(db, name, org_id):
            raise ConflictException(f"Team '{name}' already exists")

        team = self.repo.create(
            db,
            org_id=org_id,
            name=name,
            description=description,
            department_id=department_id,
            avatar_url=avatar_url,
            color=color,
            max_capacity=max_capacity,
            default_sla=default_sla,
            business_hours=business_hours,
        )
        db.commit()
        db.refresh(team)

        audit_log_service.log_action(
            db=db,
            organization_id=org_id,
            actor_id=actor.id,
            action_type=ActionType.CREATE,
            entity_type="Team",
            entity_id=team.id,
            changes={"name": name, "department_id": str(department_id) if department_id else None},
        )
        return team

    # ─────────────────────────────────────────────────────────────────────
    # Update
    # ─────────────────────────────────────────────────────────────────────

    def update_team(
        self,
        db: Session,
        team_id: uuid.UUID,
        org_id: uuid.UUID,
        actor: User,
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
        team = self.get_or_404(db, team_id, org_id)

        if name and name != team.name:
            if self.repo.get_by_name(db, name, org_id):
                raise ConflictException(f"Team '{name}' already exists")

        changes: dict = {}
        if name is not None:
            changes["name"] = {"old": team.name, "new": name}
        if status is not None:
            changes["status"] = {"old": team.status.value, "new": status.value}

        team = self.repo.update(
            db,
            team,
            name=name,
            description=description,
            department_id=department_id,
            avatar_url=avatar_url,
            color=color,
            max_capacity=max_capacity,
            default_sla=default_sla,
            business_hours=business_hours,
            status=status,
        )
        db.commit()
        db.refresh(team)

        audit_log_service.log_action(
            db=db,
            organization_id=org_id,
            actor_id=actor.id,
            action_type=ActionType.UPDATE,
            entity_type="Team",
            entity_id=team.id,
            changes=changes,
        )
        return team

    def delete_team(
        self,
        db: Session,
        team_id: uuid.UUID,
        org_id: uuid.UUID,
        actor: User,
    ) -> None:
        team = self.get_or_404(db, team_id, org_id)
        self.repo.soft_delete(db, team)
        db.commit()

        audit_log_service.log_action(
            db=db,
            organization_id=org_id,
            actor_id=actor.id,
            action_type=ActionType.DELETE,
            entity_type="Team",
            entity_id=team_id,
            changes={"name": team.name},
        )

    # ─────────────────────────────────────────────────────────────────────
    # Member Management
    # ─────────────────────────────────────────────────────────────────────

    def add_member(
        self,
        db: Session,
        team_id: uuid.UUID,
        org_id: uuid.UUID,
        user_id: uuid.UUID,
        actor: User,
        is_primary: bool = False,
    ) -> TeamMember:
        team = self.get_or_404(db, team_id, org_id)

        # Capacity check
        current_count = self.member_repo.count_members(db, team_id)
        if current_count >= team.max_capacity:
            raise ValidationException(
                f"Team '{team.name}' is at max capacity ({team.max_capacity} members)"
            )

        # Duplicate check
        if self.member_repo.get_membership(db, team_id, user_id):
            raise ConflictException("User is already a member of this team")

        membership = self.member_repo.add(db, team_id, user_id, is_primary=is_primary)
        self.repo.recalculate_capacity(db, team)
        db.commit()
        db.refresh(membership)

        audit_log_service.log_action(
            db=db,
            organization_id=org_id,
            actor_id=actor.id,
            action_type=ActionType.UPDATE,
            entity_type="TeamMember",
            entity_id=team_id,
            changes={"added_user": str(user_id)},
        )
        return membership

    def remove_member(
        self,
        db: Session,
        team_id: uuid.UUID,
        org_id: uuid.UUID,
        user_id: uuid.UUID,
        actor: User,
    ) -> None:
        team = self.get_or_404(db, team_id, org_id)
        membership = self.member_repo.get_membership(db, team_id, user_id)
        if not membership:
            raise NotFoundException("User is not a member of this team")

        self.member_repo.remove(db, membership)
        self.repo.recalculate_capacity(db, team)
        db.commit()

        audit_log_service.log_action(
            db=db,
            organization_id=org_id,
            actor_id=actor.id,
            action_type=ActionType.UPDATE,
            entity_type="TeamMember",
            entity_id=team_id,
            changes={"removed_user": str(user_id)},
        )


team_service = TeamService(team_repo, team_member_repo)
