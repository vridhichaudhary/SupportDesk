"""
Tickets API
===========
Core ticket lifecycle endpoints for the SupportDesk Enterprise Ticket Engine.
All endpoints are tenant-isolated and secured by the RBAC Permission Engine.
"""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.core.authorization import require_permission
from src.core.dependencies import get_db
from src.core.exceptions import ValidationException
from src.models import Customer, User, UserRole
from src.repositories.thread import thread_repository
from src.schemas.ticket import (
    BulkAssignRequest,
    BulkStatusRequest,
    TicketAssign,
    TicketCreate,
    TicketDetailResponse,
    TicketMergeRequest,
    TicketReplyRequest,
    TicketResponse,
    TicketStatusUpdate,
    TicketUpdate,
)
from src.services.ticket import ticket_service
from src.utils.pagination import PaginatedResult

router = APIRouter(prefix="/tickets", tags=["Tickets"])


# ─────────────────────────────────────────────────────────────────────────────
# CRUD
# ─────────────────────────────────────────────────────────────────────────────


@router.post(
    "",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a ticket",
)
def create_ticket(
    body: TicketCreate,
    actor: User = require_permission("create_tickets"),
    db: Session = Depends(get_db),
):
    """
    Create a new support ticket. Auto-generates a ticket number.
    Requires `create_tickets` permission.
    """
    # Auto-generate ticket number if not provided
    if not body.ticket_number:
        body.ticket_number = ticket_service.repository.generate_ticket_number(
            db, actor.organization_id
        )

    if actor.role == UserRole.CUSTOMER:
        customer = db.query(Customer).filter(Customer.email == actor.email).first()
        if not customer:
            raise HTTPException(status_code=403, detail="Customer record not found")
        body.customer_id = customer.id

    return ticket_service.create_ticket(
        db, obj_in=body, organization_id=actor.organization_id, actor_id=actor.id
    )


@router.get(
    "",
    response_model=PaginatedResult[TicketResponse],
    summary="List / search tickets",
)
def list_tickets(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    q: Optional[str] = Query(
        None, description="Free-text search on subject, ticket number, customer email"
    ),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    category_filter: Optional[str] = Query(None, alias="category"),
    assigned_user_id: Optional[uuid.UUID] = None,
    assigned_team_id: Optional[uuid.UUID] = None,
    actor: User = require_permission("view_tickets"),
    db: Session = Depends(get_db),
):
    """
    Paginated ticket list with free-text search and column filters.
    Requires `view_tickets` permission.
    """
    from types import SimpleNamespace

    filters: dict = {}
    if status_filter:
        filters["status"] = status_filter
    if priority_filter:
        filters["priority"] = priority_filter
    if category_filter:
        filters["category"] = category_filter
    if assigned_user_id:
        filters["assigned_user_id"] = assigned_user_id
    if assigned_team_id:
        filters["assigned_team_id"] = assigned_team_id

    if actor.role == UserRole.CUSTOMER:
        customer = db.query(Customer).filter(Customer.email == actor.email).first()
        if not customer:
            return PaginatedResult(items=[], total=0, page=1, size=limit, pages=1)
        filters["customer_id"] = customer.id

    pagination = SimpleNamespace(offset=skip, limit=limit)
    return ticket_service.repository.search(
        db, actor.organization_id, pagination, query=q, filters=filters
    )


@router.get(
    "/{ticket_id:uuid}",
    response_model=TicketDetailResponse,
    summary="Get ticket detail",
)
def get_ticket(
    ticket_id: uuid.UUID,
    actor: User = require_permission("view_tickets"),
    db: Session = Depends(get_db),
):
    """
    Retrieve a single ticket with its full conversation thread and timeline.
    Requires `view_tickets` permission.
    """
    ticket = ticket_service.get_or_404(db, ticket_id, actor.organization_id)

    if actor.role == UserRole.CUSTOMER:
        customer = db.query(Customer).filter(Customer.email == actor.email).first()
        if not customer or ticket.customer_id != customer.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this ticket")

    # Attach threads. Agents/admins see internal notes; customers wouldn't.
    include_internal = True
    ticket.threads = thread_repository.get_for_ticket(
        db, ticket_id, include_internal=include_internal
    )
    return ticket


@router.patch(
    "/{ticket_id:uuid}",
    response_model=TicketResponse,
    summary="Update ticket metadata",
)
def update_ticket(
    ticket_id: uuid.UUID,
    body: TicketUpdate,
    actor: User = require_permission("reply_tickets"),
    db: Session = Depends(get_db),
):
    """
    Update ticket subject, category, or priority.
    Requires `reply_tickets` permission.
    """
    return ticket_service.update(
        db, id=ticket_id, obj_in=body, organization_id=actor.organization_id
    )


@router.delete(
    "/{ticket_id:uuid}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete (soft) a ticket",
)
def delete_ticket(
    ticket_id: uuid.UUID,
    actor: User = require_permission("delete_tickets"),
    db: Session = Depends(get_db),
):
    """
    Soft-deletes a ticket. Requires `delete_tickets` permission.
    """
    ticket_service.delete(db, id=ticket_id, organization_id=actor.organization_id)


# ─────────────────────────────────────────────────────────────────────────────
# Lifecycle Actions
# ─────────────────────────────────────────────────────────────────────────────


@router.post(
    "/{ticket_id:uuid}/assign",
    response_model=TicketResponse,
    summary="Assign a ticket",
)
def assign_ticket(
    ticket_id: uuid.UUID,
    body: TicketAssign,
    actor: User = require_permission("assign_tickets"),
    db: Session = Depends(get_db),
):
    """
    Assign (or re-assign) a ticket to an agent and/or team.
    Auto-transitions status to ASSIGNED if ticket is in NEW or OPEN state.
    Requires `assign_tickets` permission.
    """
    return ticket_service.assign_ticket(
        db,
        ticket_id=ticket_id,
        org_id=actor.organization_id,
        actor_id=actor.id,
        assigned_user_id=body.assigned_user_id,
        assigned_team_id=body.assigned_team_id,
    )


@router.post(
    "/{ticket_id:uuid}/status",
    response_model=TicketResponse,
    summary="Update ticket status",
)
def update_ticket_status(
    ticket_id: uuid.UUID,
    body: TicketStatusUpdate,
    actor: User = require_permission("reply_tickets"),
    db: Session = Depends(get_db),
):
    """
    Transition a ticket's status. Invalid transitions (e.g., CANCELLED → OPEN) return 422.
    Requires `reply_tickets` permission.
    """
    try:
        return ticket_service.update_status(
            db,
            ticket_id=ticket_id,
            org_id=actor.organization_id,
            actor_id=actor.id,
            new_status=body.status,
        )
    except ValidationException as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e


@router.post(
    "/{ticket_id:uuid}/reply",
    response_model=TicketResponse,
    summary="Reply to a ticket",
)
def reply_to_ticket(
    ticket_id: uuid.UUID,
    body: TicketReplyRequest,
    actor: User = require_permission("reply_tickets"),
    db: Session = Depends(get_db),
):
    """
    Send an agent reply or add an internal note.
    Set `is_internal: true` for notes only visible to agents.
    Requires `reply_tickets` permission.
    """
    ticket = ticket_service.get_or_404(db, ticket_id, actor.organization_id)

    if actor.role == UserRole.CUSTOMER:
        customer = db.query(Customer).filter(Customer.email == actor.email).first()
        if not customer or ticket.customer_id != customer.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this ticket")

    is_internal = body.is_internal
    if actor.role == UserRole.CUSTOMER:
        is_internal = False  # Customers can never send internal notes

    return ticket_service.reply(
        db,
        ticket_id=ticket_id,
        org_id=actor.organization_id,
        actor_id=actor.id,
        body=body.body,
        is_internal=is_internal,
    )


@router.get(
    "/{ticket_id:uuid}/thread",
    summary="Get ticket thread",
)
def get_thread(
    ticket_id: uuid.UUID,
    include_internal: bool = Query(True),
    actor: User = require_permission("view_tickets"),
    db: Session = Depends(get_db),
):
    """
    Retrieve the full conversation thread for a ticket.
    Set `include_internal=false` to exclude internal notes.
    Requires `view_tickets` permission.
    """
    ticket = ticket_service.get_or_404(db, ticket_id, actor.organization_id)

    if actor.role == UserRole.CUSTOMER:
        customer = db.query(Customer).filter(Customer.email == actor.email).first()
        if not customer or ticket.customer_id != customer.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this ticket")

    return thread_repository.get_for_ticket(db, ticket_id, include_internal=include_internal)


@router.get(
    "/{ticket_id:uuid}/timeline",
    summary="Get ticket timeline",
)
def get_timeline(
    ticket_id: uuid.UUID,
    actor: User = require_permission("view_tickets"),
    db: Session = Depends(get_db),
):
    """
    Retrieve the system event timeline for a ticket.
    Requires `view_tickets` permission.
    """
    from sqlalchemy import select

    from src.models import TicketTimeline

    ticket = ticket_service.get_or_404(db, ticket_id, actor.organization_id)

    if actor.role == UserRole.CUSTOMER:
        customer = db.query(Customer).filter(Customer.email == actor.email).first()
        if not customer or ticket.customer_id != customer.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this ticket")
    events = (
        db.execute(
            select(TicketTimeline)
            .where(TicketTimeline.ticket_id == ticket_id)
            .order_by(TicketTimeline.created_at.asc())
        )
        .scalars()
        .all()
    )
    return events


# ─────────────────────────────────────────────────────────────────────────────
# Merge
# ─────────────────────────────────────────────────────────────────────────────


@router.post(
    "/merge",
    response_model=TicketResponse,
    summary="Merge tickets",
)
def merge_tickets(
    source_ticket_id: uuid.UUID = Query(..., description="The ticket to merge (will be closed)"),
    body: TicketMergeRequest = None,
    actor: User = require_permission("merge_tickets"),
    db: Session = Depends(get_db),
):
    """
    Merge `source_ticket_id` into `target_ticket_id`.
    The source ticket is soft-deleted and its threads are moved to the target.
    Requires `merge_tickets` permission.
    """
    try:
        return ticket_service.merge_tickets(
            db,
            source_id=source_ticket_id,
            target_id=body.target_ticket_id,
            org_id=actor.organization_id,
            actor_id=actor.id,
        )
    except ValidationException as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e


# ─────────────────────────────────────────────────────────────────────────────
# Bulk Operations
# ─────────────────────────────────────────────────────────────────────────────


@router.post(
    "/bulk/assign",
    summary="Bulk assign tickets",
)
def bulk_assign(
    body: BulkAssignRequest,
    actor: User = require_permission("bulk_edit_tickets"),
    db: Session = Depends(get_db),
):
    """
    Assign multiple tickets to an agent and/or team in a single request.
    Requires `bulk_edit_tickets` permission.
    """
    results = []
    for ticket_id in body.ticket_ids:
        try:
            t = ticket_service.assign_ticket(
                db,
                ticket_id=ticket_id,
                org_id=actor.organization_id,
                actor_id=actor.id,
                assigned_user_id=body.assigned_user_id,
                assigned_team_id=body.assigned_team_id,
            )
            results.append(
                {"ticket_id": str(ticket_id), "success": True, "ticket_number": t.ticket_number}
            )
        except Exception as e:
            results.append({"ticket_id": str(ticket_id), "success": False, "error": str(e)})
    return {"results": results}


@router.post(
    "/bulk/status",
    summary="Bulk update ticket status",
)
def bulk_status_update(
    body: BulkStatusRequest,
    actor: User = require_permission("bulk_edit_tickets"),
    db: Session = Depends(get_db),
):
    """
    Update the status of multiple tickets in a single request.
    Invalid transitions are reported per-ticket without failing the batch.
    Requires `bulk_edit_tickets` permission.
    """
    results = []
    for ticket_id in body.ticket_ids:
        try:
            t = ticket_service.update_status(
                db,
                ticket_id=ticket_id,
                org_id=actor.organization_id,
                actor_id=actor.id,
                new_status=body.status,
            )
            results.append(
                {"ticket_id": str(ticket_id), "success": True, "new_status": t.status.value}
            )
        except ValidationException as e:
            results.append({"ticket_id": str(ticket_id), "success": False, "error": str(e)})
    return {"results": results}
