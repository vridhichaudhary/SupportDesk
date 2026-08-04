"""
Customers API
=============
CRUD endpoints for Customer management.
Secured by the RBAC Permission Engine.
"""
from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.core.authorization import require_permission, require_any_permission
from src.core.dependencies import get_db
from src.models import User
from src.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from src.services.customer import customer_service
from src.utils.pagination import PaginationParams, PaginatedResult

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.post(
    "",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a customer",
)
def create_customer(
    body: CustomerCreate,
    actor: User = require_permission("manage_customers"),
    db: Session = Depends(get_db),
):
    """
    Create a new customer record within the organization.
    Requires `manage_customers` permission.
    """
    return customer_service.create(db, obj_in=body, organization_id=actor.organization_id)


@router.get(
    "",
    response_model=PaginatedResult[CustomerResponse],
    summary="List customers",
)
def list_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    actor: User = require_permission("view_customers"),
    db: Session = Depends(get_db),
):
    """
    Return a paginated list of all customers in the organization.
    Requires `view_customers` permission.
    """
    from src.models import Customer
    from sqlalchemy import select, func
    from types import SimpleNamespace

    query = select(Customer).where(
        Customer.organization_id == actor.organization_id
    ).offset(skip).limit(limit)
    count_query = select(func.count()).select_from(
        select(Customer).where(Customer.organization_id == actor.organization_id).subquery()
    )
    total = db.execute(count_query).scalar_one()
    items = list(db.execute(query).scalars().all())

    pagination = SimpleNamespace(offset=skip, limit=limit)
    return PaginatedResult.create(items=items, total=total, params=pagination)


@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
    summary="Get customer",
)
def get_customer(
    customer_id: uuid.UUID,
    actor: User = require_permission("view_customers"),
    db: Session = Depends(get_db),
):
    """
    Retrieve a single customer by ID. Requires `view_customers` permission.
    """
    return customer_service.get_or_404(db, id=customer_id, organization_id=actor.organization_id)


@router.patch(
    "/{customer_id}",
    response_model=CustomerResponse,
    summary="Update customer",
)
def update_customer(
    customer_id: uuid.UUID,
    body: CustomerUpdate,
    actor: User = require_permission("manage_customers"),
    db: Session = Depends(get_db),
):
    """
    Update customer profile fields. Requires `manage_customers` permission.
    """
    return customer_service.update(
        db, id=customer_id, obj_in=body, organization_id=actor.organization_id
    )
