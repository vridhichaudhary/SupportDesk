"""
Tests for Celery Beat Scheduled Jobs (Phase 4).
Covers:
- Schedule registration in celery_app.conf.beat_schedule
- Idempotency of check_sla_breaches_task (avoids duplicate breach logs)
- Idempotency of aggregate_daily_analytics_task (upserts snapshot cleanly)
- UTC timezone enforcement
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from sqlalchemy.orm import Session

from src.core.celery_app import celery_app
from src.models import (
    ActionType,
    AnalyticsSnapshot,
    AuditLog,
    Customer,
    Organization,
    Ticket,
    TicketPriority,
    TicketStatus,
)
from src.workers.analytics_tasks import aggregate_daily_analytics_task
from src.workers.routing_tasks import check_sla_breaches_task

# ==============================================================================
# Schedule Configuration Tests
# ==============================================================================


def test_celery_beat_schedule_registered():
    """Verify SLA breach monitoring and analytics aggregation tasks are registered in Celery Beat."""
    schedule = celery_app.conf.beat_schedule

    assert "check-sla-breaches-every-15-mins" in schedule
    sla_entry = schedule["check-sla-breaches-every-15-mins"]
    assert sla_entry["task"] == "src.workers.routing_tasks.check_sla_breaches_task"

    assert "aggregate-daily-analytics-midnight" in schedule
    analytics_entry = schedule["aggregate-daily-analytics-midnight"]
    assert analytics_entry["task"] == "src.workers.analytics_tasks.aggregate_daily_analytics_task"

    # Timezone check
    assert celery_app.conf.timezone == "UTC"
    assert celery_app.conf.enable_utc is True


# ==============================================================================
# Idempotency Tests
# ==============================================================================


def test_check_sla_breaches_task_idempotency(db_session: Session):
    """Verify running check_sla_breaches_task repeatedly creates only ONE audit breach log."""
    org = Organization(id=uuid.uuid4(), name="SLA Test Org")
    db_session.add(org)
    db_session.flush()

    customer = Customer(
        id=uuid.uuid4(), organization_id=org.id, email="sla_cust@test.com", name="SLA Customer"
    )
    db_session.add(customer)
    db_session.flush()

    # Ticket with overdue SLA
    overdue_time = datetime.now(timezone.utc) - timedelta(hours=2)
    ticket = Ticket(
        id=uuid.uuid4(),
        organization_id=org.id,
        customer_id=customer.id,
        ticket_number="TICK-OVERDUE-01",
        subject="Overdue issue",
        body="Needs immediate response",
        status=TicketStatus.OPEN,
        priority=TicketPriority.CRITICAL,
        sla_due_at=overdue_time,
    )
    db_session.add(ticket)
    db_session.commit()

    ticket_id = ticket.id
    with patch("src.workers.routing_tasks.SessionLocal", return_value=db_session):
        with patch.object(db_session, "close"):
            # Run 1st time
            check_sla_breaches_task()

            logs_first_run = (
                db_session.query(AuditLog)
                .filter(
                    AuditLog.entity_id == ticket_id,
                    AuditLog.action_type == ActionType.TICKET_STATUS_CHANGED,
                )
                .all()
            )
            assert len(logs_first_run) == 1
            assert logs_first_run[0].changes_json["event"] == "SLA_BREACHED"

            # Run 2nd time (simulating next 15-minute Beat trigger)
            check_sla_breaches_task()

            logs_second_run = (
                db_session.query(AuditLog)
                .filter(
                    AuditLog.entity_id == ticket_id,
                    AuditLog.action_type == ActionType.TICKET_STATUS_CHANGED,
                )
                .all()
            )
            # MUST still be exactly 1 (no duplicate audit logs created)
            assert len(logs_second_run) == 1


def test_aggregate_daily_analytics_task_idempotency(db_session: Session):
    """Verify running aggregate_daily_analytics_task repeatedly overwrites the daily snapshot cleanly."""
    org = Organization(id=uuid.uuid4(), name="Analytics Org")
    db_session.add(org)
    db_session.commit()
    org_id = org.id

    with patch("src.workers.analytics_tasks.SessionLocal", return_value=db_session):
        with patch.object(db_session, "close"):
            with patch(
                "src.services.analytics.analytics_service.get_executive_dashboard"
            ) as mock_dash:
                mock_dash.return_value = {
                    "total_tickets": 10,
                    "open_tickets": 3,
                    "resolved_tickets": 7,
                    "avg_resolution_time_hours": 2.5,
                    "sla_compliance_percent": 90,
                    "ai_resolution_rate_percent": 30,
                }

                # 1st execution
                aggregate_daily_analytics_task()

                snapshots_1 = (
                    db_session.query(AnalyticsSnapshot)
                    .filter(AnalyticsSnapshot.organization_id == org_id)
                    .all()
                )
                assert len(snapshots_1) == 1
                assert snapshots_1[0].total_tickets == 10

                # 2nd execution (same day) with updated metrics
                mock_dash.return_value["total_tickets"] = 15
                aggregate_daily_analytics_task()

                snapshots_2 = (
                    db_session.query(AnalyticsSnapshot)
                    .filter(AnalyticsSnapshot.organization_id == org_id)
                    .all()
                )
                # MUST still have exactly 1 record for this day and org
                assert len(snapshots_2) == 1
                assert snapshots_2[0].total_tickets == 15
