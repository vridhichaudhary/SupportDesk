"""
Department Service
==================
Business logic for Department management.
Enforces tenant isolation, name uniqueness, and audit logging.
"""
from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy.orm import Session

from src.core.exceptions import ConflictException, NotFoundException
from src.models import ActionType, Department, DepartmentStatus, User
from src.repositories.department import DepartmentRepository, department_repo
from src.services.audit_log import audit_log_service


class DepartmentService:

    def __init__(self, repo: DepartmentRepository) -> None:
        self.repo = repo

    # ─────────────────────────────────────────────────────────────────────
    # Read
    # ─────────────────────────────────────────────────────────────────────

    def get_or_404(
        self, db: Session, department_id: uuid.UUID, org_id: uuid.UUID
    ) -> Department:
        dept = self.repo.get(db, department_id, org_id)
        if not dept:
            raise NotFoundException("Department not found")
        return dept

    def list_departments(
        self,
        db: Session,
        org_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> dict:
        items = self.repo.list_active(db, org_id, skip=skip, limit=limit)
        total = self.repo.count_active(db, org_id)
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    # ─────────────────────────────────────────────────────────────────────
    # Create
    # ─────────────────────────────────────────────────────────────────────

    def create_department(
        self,
        db: Session,
        org_id: uuid.UUID,
        actor: User,
        name: str,
        description: Optional[str] = None,
        color: Optional[str] = None,
        manager_id: Optional[uuid.UUID] = None,
    ) -> Department:
        # Uniqueness check within org
        if self.repo.get_by_name(db, name, org_id):
            raise ConflictException(f"Department '{name}' already exists")

        dept = self.repo.create(
            db,
            org_id=org_id,
            name=name,
            description=description,
            color=color,
            manager_id=manager_id,
        )
        db.commit()
        db.refresh(dept)

        audit_log_service.log_action(
            db=db,
            organization_id=org_id,
            actor_id=actor.id,
            action_type=ActionType.CREATE,
            entity_type="Department",
            entity_id=dept.id,
            changes={"name": name, "description": description, "color": color},
        )
        return dept

    # ─────────────────────────────────────────────────────────────────────
    # Update
    # ─────────────────────────────────────────────────────────────────────

    def update_department(
        self,
        db: Session,
        department_id: uuid.UUID,
        org_id: uuid.UUID,
        actor: User,
        name: Optional[str] = None,
        description: Optional[str] = None,
        color: Optional[str] = None,
        manager_id: Optional[uuid.UUID] = None,
        status: Optional[DepartmentStatus] = None,
    ) -> Department:
        dept = self.get_or_404(db, department_id, org_id)

        # Uniqueness check if renaming
        if name and name != dept.name:
            if self.repo.get_by_name(db, name, org_id):
                raise ConflictException(f"Department '{name}' already exists")

        changes: dict = {}
        if name is not None:
            changes["name"] = {"old": dept.name, "new": name}
        if status is not None:
            changes["status"] = {"old": dept.status.value, "new": status.value}

        dept = self.repo.update(
            db,
            dept,
            name=name,
            description=description,
            color=color,
            manager_id=manager_id,
            status=status,
        )
        db.commit()
        db.refresh(dept)

        audit_log_service.log_action(
            db=db,
            organization_id=org_id,
            actor_id=actor.id,
            action_type=ActionType.UPDATE,
            entity_type="Department",
            entity_id=dept.id,
            changes=changes,
        )
        return dept

    # ─────────────────────────────────────────────────────────────────────
    # Delete
    # ─────────────────────────────────────────────────────────────────────

    def delete_department(
        self,
        db: Session,
        department_id: uuid.UUID,
        org_id: uuid.UUID,
        actor: User,
    ) -> None:
        dept = self.get_or_404(db, department_id, org_id)
        self.repo.soft_delete(db, dept)
        db.commit()

        audit_log_service.log_action(
            db=db,
            organization_id=org_id,
            actor_id=actor.id,
            action_type=ActionType.DELETE,
            entity_type="Department",
            entity_id=department_id,
            changes={"name": dept.name},
        )


department_service = DepartmentService(department_repo)
