"""
Routing API — Endpoints for the Smart Routing Engine.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.core.dependencies import get_current_user, get_db
from src.models import AssignmentHistory, RoutingDecision, Ticket, User

router = APIRouter(prefix="/routing", tags=["routing"])


# ─── Schemas ──────────────────────────────────────────────────────────────────


class AnalyzeRequest(BaseModel):
    ticket_id: uuid.UUID


class AssignRequest(BaseModel):
    ticket_id: uuid.UUID


class OverrideRequest(BaseModel):
    ticket_id: uuid.UUID
    agent_id: Optional[uuid.UUID] = None
    team_id: Optional[uuid.UUID] = None
    reason: str = Field(..., min_length=5)


class RoutingDecisionResponse(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    predicted_category: Optional[str]
    predicted_priority: Optional[str]
    assigned_department_id: Optional[uuid.UUID]
    assigned_team_id: Optional[uuid.UUID]
    assigned_agent_id: Optional[uuid.UUID]
    suggested_tags_json: Optional[List[str]]
    suggested_sla_hours: Optional[int]
    confidence_score: Optional[int]
    reasoning: Optional[str]
    execution_time_ms: Optional[int]
    model_version: Optional[str]
    created_at: Any


class AssignmentHistoryResponse(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    actor_id: Optional[uuid.UUID]
    assignment_type: str
    old_value_id: Optional[uuid.UUID]
    new_value_id: Optional[uuid.UUID]
    reason: Optional[str]
    is_override: bool
    created_at: Any


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.post(
    "/analyze",
    response_model=RoutingDecisionResponse,
    summary="Analyze a ticket with AI (no assignment)",
)
def analyze_ticket(
    request: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Runs AI classification on a ticket without persisting any assignment.
    Returns the predicted category, priority, suggested tags, SLA, and reasoning.
    """
    from src.services.routing_engine import routing_engine

    ticket = (
        db.query(Ticket)
        .filter(
            Ticket.id == request.ticket_id,
            Ticket.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    classification = routing_engine.classify_ticket(ticket.subject, ticket.body)

    # Return a synthetic response without DB write
    from src.services.routing_engine import SLA_HOURS

    priority_str = classification.get("priority", "MEDIUM")
    return RoutingDecisionResponse(
        id=uuid.uuid4(),
        ticket_id=ticket.id,
        predicted_category=classification.get("category"),
        predicted_priority=priority_str,
        assigned_department_id=None,
        assigned_team_id=None,
        assigned_agent_id=None,
        suggested_tags_json=classification.get("suggested_tags", []),
        suggested_sla_hours=SLA_HOURS.get(priority_str, 24),
        confidence_score=classification.get("confidence", 0),
        reasoning=classification.get("reasoning"),
        execution_time_ms=None,
        model_version="gemini-2.5-flash",
        created_at=datetime.now(timezone.utc),
    )


@router.post(
    "/assign",
    response_model=RoutingDecisionResponse,
    summary="Trigger full AI routing pipeline for a ticket",
)
def assign_ticket(
    request: AssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Runs the complete routing pipeline (classify → rules → rank agents → assign).
    Will overwrite any existing routing decision.
    """
    from src.services.routing_engine import routing_engine

    ticket = (
        db.query(Ticket)
        .filter(
            Ticket.id == request.ticket_id,
            Ticket.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    decision = routing_engine.route(db, ticket.id)
    if not decision:
        raise HTTPException(status_code=500, detail="Routing engine failed")

    return RoutingDecisionResponse(
        id=decision.id,
        ticket_id=decision.ticket_id,
        predicted_category=decision.predicted_category,
        predicted_priority=decision.predicted_priority,
        assigned_department_id=decision.assigned_department_id,
        assigned_team_id=decision.assigned_team_id,
        assigned_agent_id=decision.assigned_agent_id,
        suggested_tags_json=decision.suggested_tags_json,
        suggested_sla_hours=decision.suggested_sla_hours,
        confidence_score=decision.confidence_score,
        reasoning=decision.reasoning,
        execution_time_ms=decision.execution_time_ms,
        model_version=decision.model_version,
        created_at=decision.created_at,
    )


@router.post(
    "/override", status_code=status.HTTP_200_OK, summary="Manual override of routing assignment"
)
def override_routing(
    request: OverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manager manually overrides AI assignment. Logs to AssignmentHistory with is_override=True.
    """
    from src.workers.routing_tasks import override_assignment_task

    ticket = (
        db.query(Ticket)
        .filter(
            Ticket.id == request.ticket_id,
            Ticket.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    override_assignment_task.delay(
        str(request.ticket_id),
        str(request.agent_id) if request.agent_id else None,
        str(request.team_id) if request.team_id else None,
        request.reason,
        str(current_user.id),
    )
    return {"message": "Override dispatched successfully", "ticket_id": str(request.ticket_id)}


@router.get(
    "/history",
    response_model=List[AssignmentHistoryResponse],
    summary="Get assignment history for a ticket",
)
def get_routing_history(
    ticket_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the complete assignment history for a ticket, including AI and manual entries.
    """
    ticket = (
        db.query(Ticket)
        .filter(
            Ticket.id == ticket_id,
            Ticket.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    history = (
        db.query(AssignmentHistory)
        .filter(AssignmentHistory.ticket_id == ticket_id)
        .order_by(AssignmentHistory.created_at.asc())
        .all()
    )

    return [
        AssignmentHistoryResponse(
            id=h.id,
            ticket_id=h.ticket_id,
            actor_id=h.actor_id,
            assignment_type=h.assignment_type,
            old_value_id=h.old_value_id,
            new_value_id=h.new_value_id,
            reason=h.reason,
            is_override=h.is_override,
            created_at=h.created_at,
        )
        for h in history
    ]


@router.get(
    "/decisions",
    response_model=List[RoutingDecisionResponse],
    summary="Get recent routing decisions",
)
def list_routing_decisions(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns recent AI routing decisions for the organization."""
    decisions = (
        db.query(RoutingDecision)
        .filter(RoutingDecision.organization_id == current_user.organization_id)
        .order_by(RoutingDecision.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        RoutingDecisionResponse(
            id=d.id,
            ticket_id=d.ticket_id,
            predicted_category=d.predicted_category,
            predicted_priority=d.predicted_priority,
            assigned_department_id=d.assigned_department_id,
            assigned_team_id=d.assigned_team_id,
            assigned_agent_id=d.assigned_agent_id,
            suggested_tags_json=d.suggested_tags_json,
            suggested_sla_hours=d.suggested_sla_hours,
            confidence_score=d.confidence_score,
            reasoning=d.reasoning,
            execution_time_ms=d.execution_time_ms,
            model_version=d.model_version,
            created_at=d.created_at,
        )
        for d in decisions
    ]
