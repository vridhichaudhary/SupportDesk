"""
Department Repository
=====================
Data access layer for the Department model.
No business logic. Tenant-isolated by organization_id.
"""

from __future__ import annotations
from datetime import timezone

import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import Department, DepartmentStatus


class DepartmentRepository:
    def get(self, db: Session, department_id: uuid.UUID, org_id: uuid.UUID) -> Optional[Department]:
        stmt = select(Department).where(
            Department.id == department_id,
            Department.organization_id == org_id,
            Department.deleted_at.is_(None),
        )
        return db.execute(stmt).scalar_one_or_none()

    def list_active(
        self, db: Session, org_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> List[Department]:
        stmt = (
            select(Department)
            .where(
                Department.organization_id == org_id,
                Department.deleted_at.is_(None),
                Department.status != DepartmentStatus.DELETED,
            )
            .order_by(Department.name)
            .offset(skip)
            .limit(limit)
        )
        return list(db.execute(stmt).scalars().all())

    def count_active(self, db: Session, org_id: uuid.UUID) -> int:
        from sqlalchemy import func

        stmt = select(func.count()).where(
            Department.organization_id == org_id,
            Department.deleted_at.is_(None),
            Department.status != DepartmentStatus.DELETED,
        )
        return db.execute(stmt).scalar_one()

    def get_by_name(self, db: Session, name: str, org_id: uuid.UUID) -> Optional[Department]:
        stmt = select(Department).where(
            Department.organization_id == org_id,
            Department.name == name,
            Department.deleted_at.is_(None),
        )
        return db.execute(stmt).scalar_one_or_none()

    def create(
        self,
        db: Session,
        org_id: uuid.UUID,
        name: str,
        description: Optional[str] = None,
        color: Optional[str] = None,
        manager_id: Optional[uuid.UUID] = None,
    ) -> Department:
        dept = Department(
            id=uuid.uuid4(),
            organization_id=org_id,
            name=name,
            description=description,
            color=color,
            manager_id=manager_id,
        )
        db.add(dept)
        db.flush()
        return dept

    def update(
        self,
        db: Session,
        dept: Department,
        name: Optional[str] = None,
        description: Optional[str] = None,
        color: Optional[str] = None,
        manager_id: Optional[uuid.UUID] = None,
        status: Optional[DepartmentStatus] = None,
    ) -> Department:
        if name is not None:
            dept.name = name
        if description is not None:
            dept.description = description
        if color is not None:
            dept.color = color
        if manager_id is not None:
            dept.manager_id = manager_id
        if status is not None:
            dept.status = status
        db.add(dept)
        db.flush()
        return dept

    def soft_delete(self, db: Session, dept: Department) -> None:
        from datetime import datetime

        dept.deleted_at = datetime.now(timezone.utc)
        dept.status = DepartmentStatus.DELETED
        db.add(dept)
        db.flush()


department_repo = DepartmentRepository()
