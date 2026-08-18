"""
Departments API
===============
CRUD endpoints for managing organizational departments.
Secured by the RBAC Permission Engine.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.core.authorization import require_permission
from src.core.dependencies import get_db
from src.models import User
from src.schemas.department import (
    DepartmentCreate,
    DepartmentListResponse,
    DepartmentResponse,
    DepartmentUpdate,
)
from src.services.department import department_service

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=DepartmentListResponse, summary="List departments")
def list_departments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    actor: User = require_permission("view_organization"),
    db: Session = Depends(get_db),
):
    result = department_service.list_departments(
        db, org_id=actor.organization_id, skip=skip, limit=limit
    )
    return DepartmentListResponse(**result)


@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a department",
)
def create_department(
    body: DepartmentCreate,
    actor: User = require_permission("manage_departments"),
    db: Session = Depends(get_db),
):
    dept = department_service.create_department(
        db,
        org_id=actor.organization_id,
        actor=actor,
        name=body.name,
        description=body.description,
        color=body.color,
        manager_id=body.manager_id,
    )
    return dept


@router.get("/{department_id}", response_model=DepartmentResponse, summary="Get a department")
def get_department(
    department_id: uuid.UUID,
    actor: User = require_permission("view_organization"),
    db: Session = Depends(get_db),
):
    return department_service.get_or_404(db, department_id, actor.organization_id)


@router.patch("/{department_id}", response_model=DepartmentResponse, summary="Update a department")
def update_department(
    department_id: uuid.UUID,
    body: DepartmentUpdate,
    actor: User = require_permission("manage_departments"),
    db: Session = Depends(get_db),
):
    return department_service.update_department(
        db,
        department_id=department_id,
        org_id=actor.organization_id,
        actor=actor,
        name=body.name,
        description=body.description,
        color=body.color,
        manager_id=body.manager_id,
        status=body.status,
    )


@router.delete(
    "/{department_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a department",
)
def delete_department(
    department_id: uuid.UUID,
    actor: User = require_permission("manage_departments"),
    db: Session = Depends(get_db),
):
    department_service.delete_department(
        db,
        department_id=department_id,
        org_id=actor.organization_id,
        actor=actor,
    )
