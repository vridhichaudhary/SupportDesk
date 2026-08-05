"""
Celery tasks for AI routing and SLA enforcement.
"""
import uuid
import structlog
from datetime import datetime, timedelta
from typing import Optional

from src.core.celery_app import celery_app
from src.core.database import SessionLocal

logger = structlog.get_logger()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def route_ticket_task(self, ticket_id_str: str):
    """
    Background task: runs the full AI routing pipeline for a ticket.
    Called immediately after ticket creation.
    """
    logger.info("Starting ticket routing", ticket_id=ticket_id_str)
    db = SessionLocal()
    try:
        from src.services.routing_engine import routing_engine
        ticket_id = uuid.UUID(ticket_id_str)
        decision = routing_engine.route(db, ticket_id)
        if decision:
            logger.info(
                "Routing complete",
                ticket_id=ticket_id_str,
                category=decision.predicted_category,
                priority=decision.predicted_priority,
                agent=str(decision.assigned_agent_id),
                confidence=decision.confidence_score,
            )
        else:
            logger.warning("Routing returned no decision", ticket_id=ticket_id_str)
    except Exception as e:
        logger.error("Ticket routing failed", ticket_id=ticket_id_str, error=str(e))
        db.rollback()
        raise self.retry(exc=e)
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=2)
def override_assignment_task(self, ticket_id_str: str, agent_id_str: Optional[str],
                              team_id_str: Optional[str], reason: str, actor_id_str: str):
    """
    Background task: handles a manager's manual override of routing.
    Logs AssignmentHistory with is_override=True.
    """
    import uuid as _uuid
    from src.models import Ticket, AssignmentHistory, TicketStatus, AuditLog, ActionType
    db = SessionLocal()
    try:
        ticket_id = _uuid.UUID(ticket_id_str)
        actor_id = _uuid.UUID(actor_id_str)
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return

        old_agent = ticket.assigned_user_id
        old_team = ticket.assigned_team_id

        if agent_id_str:
            new_agent = _uuid.UUID(agent_id_str)
            db.add(AssignmentHistory(
                organization_id=ticket.organization_id,
                ticket_id=ticket_id,
                actor_id=actor_id,
                assignment_type="AGENT",
                old_value_id=old_agent,
                new_value_id=new_agent,
                reason=reason,
                is_override=True,
            ))
            ticket.assigned_user_id = new_agent
            ticket.status = TicketStatus.ASSIGNED

        if team_id_str:
            new_team = _uuid.UUID(team_id_str)
            db.add(AssignmentHistory(
                organization_id=ticket.organization_id,
                ticket_id=ticket_id,
                actor_id=actor_id,
                assignment_type="TEAM",
                old_value_id=old_team,
                new_value_id=new_team,
                reason=reason,
                is_override=True,
            ))
            ticket.assigned_team_id = new_team

        db.add(AuditLog(
            organization_id=ticket.organization_id,
            actor_id=actor_id,
            action_type=ActionType.TICKET_ASSIGNED,
            entity_type="Ticket",
            entity_id=ticket_id,
            changes_json={
                "type": "manual_override",
                "old_agent": str(old_agent) if old_agent else None,
                "new_agent": agent_id_str,
                "old_team": str(old_team) if old_team else None,
                "new_team": team_id_str,
                "reason": reason,
                "actor_id": actor_id_str,
            },
        ))
        db.commit()
        logger.info("Manual override applied", ticket_id=ticket_id_str, actor=actor_id_str)
    except Exception as e:
        db.rollback()
        logger.error("Override task failed", error=str(e))
        raise self.retry(exc=e)
    finally:
        db.close()


@celery_app.task
def check_sla_breaches_task():
    """
    Periodic task: identifies tickets that have breached SLA and updates their status.
    Should be scheduled with celery beat every 15 minutes.
    """
    from src.models import Ticket, TicketStatus, AuditLog, ActionType
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        breached = db.query(Ticket).filter(
            Ticket.sla_due_at <= now,
            Ticket.status.in_([TicketStatus.OPEN, TicketStatus.ASSIGNED]),
            Ticket.deleted_at.is_(None),
        ).all()

        for ticket in breached:
            db.add(AuditLog(
                organization_id=ticket.organization_id,
                actor_id=None,
                action_type=ActionType.TICKET_STATUS_CHANGED,
                entity_type="Ticket",
                entity_id=ticket.id,
                changes_json={"event": "SLA_BREACHED", "sla_due_at": str(ticket.sla_due_at)},
            ))

        db.commit()
        logger.info("SLA breach check complete", breached_count=len(breached))
    except Exception as e:
        db.rollback()
        logger.error("SLA breach check failed", error=str(e))
    finally:
        db.close()
