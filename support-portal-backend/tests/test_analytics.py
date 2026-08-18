from datetime import datetime, timedelta

from src.models import Ticket, TicketStatus
from src.services.analytics import KPIEngine


def test_calculate_sla_compliance():
    now = datetime.utcnow()
    # Ticket 1: Met SLA
    t1 = Ticket(
        created_at=now - timedelta(hours=2),
        resolved_at=now - timedelta(hours=1),
        sla_due_at=now,
        status=TicketStatus.RESOLVED,
    )
    # Ticket 2: Breached SLA
    t2 = Ticket(
        created_at=now - timedelta(hours=5),
        resolved_at=now,
        sla_due_at=now - timedelta(hours=2),
        status=TicketStatus.RESOLVED,
    )

    compliance = KPIEngine.calculate_sla_compliance([t1, t2])
    assert compliance == 50.0


def test_calculate_avg_resolution_hours():
    now = datetime.utcnow()
    # Ticket 1: 2 hours to resolve
    t1 = Ticket(created_at=now - timedelta(hours=2), resolved_at=now)
    # Ticket 2: 4 hours to resolve
    t2 = Ticket(created_at=now - timedelta(hours=4), resolved_at=now)

    avg_hours = KPIEngine.calculate_avg_resolution_hours([t1, t2])
    assert avg_hours == 3.0
