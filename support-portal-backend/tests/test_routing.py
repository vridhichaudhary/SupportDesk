"""
Unit and integration tests for SupportDesk AI Routing Engine and Celery tasks.
Covers all requirements of Milestone 1:
- User model display-name handling and fallback logic
- Agent ranking display-name resolution
- Valid Gemini classification parsing
- Markdown fence stripping
- Malformed model output handling and fallback
- Gemini provider/API exception handling and fallback
- No eligible agents handling
- Automation rule matching and classification overrides
- Complete routing persistence (Ticket, RoutingDecision, AssignmentHistory, AuditLog, WorkflowExecution)
- Clear distinction between AI classification and fallback in routing decisions and assignment history
- Tenant isolation (cross-organization separation of agents and rules)
- Celery route_ticket_task success and retry on exception
"""

import json
import uuid
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from src.models import (
    ActionType,
    AgentAvailability,
    AgentSkill,
    AgentStatus,
    AssignmentHistory,
    AuditLog,
    AutomationRule,
    Customer,
    Organization,
    ProficiencyLevel,
    RoutingDecision,
    Skill,
    SkillCategory,
    Ticket,
    TicketCategory,
    TicketPriority,
    TicketSource,
    TicketStatus,
    User,
    UserRole,
    WorkflowExecution,
)
from src.services.routing_engine import RoutingEngine, routing_engine
from src.workers.routing_tasks import route_ticket_task

# ==============================================================================
# Helper Factories
# ==============================================================================


def _create_org(db: Session, name: str = "Test Org") -> Organization:
    org = Organization(
        id=uuid.uuid4(),
        name=name,
        industry="Technology",
    )
    db.add(org)
    db.flush()
    return org


def _create_user(
    db: Session,
    org_id: uuid.UUID,
    email: str,
    role: UserRole = UserRole.AGENT,
    display_name: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
    is_active: bool = True,
) -> User:
    user = User(
        id=uuid.uuid4(),
        organization_id=org_id,
        email=email,
        password_hash="mock_hash",
        role=role,
        display_name=display_name,
        first_name=first_name,
        last_name=last_name,
        is_active=is_active,
    )
    db.add(user)
    db.flush()
    return user


def _create_customer(
    db: Session, org_id: uuid.UUID, email: str = "customer@example.com", is_vip: bool = False
) -> Customer:
    customer = Customer(
        id=uuid.uuid4(),
        organization_id=org_id,
        email=email,
        name="Test Customer",
        is_vip=is_vip,
        language="en",
    )
    db.add(customer)
    db.flush()
    return customer


def _create_ticket(
    db: Session,
    org_id: uuid.UUID,
    customer_id: uuid.UUID,
    subject: str = "Test Ticket Subject",
    body: str = "Test ticket description body text.",
) -> Ticket:
    ticket = Ticket(
        id=uuid.uuid4(),
        organization_id=org_id,
        customer_id=customer_id,
        ticket_number=f"TICK-{uuid.uuid4().hex[:6].upper()}",
        subject=subject,
        body=body,
        status=TicketStatus.NEW,
        priority=TicketPriority.MEDIUM,
        category=TicketCategory.GENERAL,
        source=TicketSource.WEB,
    )
    db.add(ticket)
    db.flush()
    return ticket


# ==============================================================================
# 1. Agent Name Resolution & Ranking Tests
# ==============================================================================


def test_user_name_resolution_property():
    """Verify User.name property respects display_name > first/last > email."""
    # Priority 1: display_name
    u1 = User(display_name="Smithy", first_name="John", last_name="Smith", email="john@test.com")
    assert u1.name == "Smithy"

    # Priority 2: first_name + last_name
    u2 = User(display_name="", first_name="John", last_name="Smith", email="john@test.com")
    assert u2.name == "John Smith"

    # Priority 3: email fallback
    u3 = User(display_name=None, first_name=None, last_name=None, email="agent@test.com")
    assert u3.name == "agent@test.com"


def test_agent_ranking_name_resolution(db_session: Session):
    """Verify rank_agents resolves agent names correctly in the ranked payload."""
    org = _create_org(db_session, "Rank Org")

    # Agent with display_name
    a1 = _create_user(
        db_session, org.id, "a1@test.com", display_name="Top Agent", first_name="A", last_name="One"
    )
    # Agent with first/last name only
    a2 = _create_user(
        db_session, org.id, "a2@test.com", display_name=None, first_name="Jane", last_name="Doe"
    )
    # Agent with only email
    a3 = _create_user(
        db_session, org.id, "a3@test.com", display_name=None, first_name=None, last_name=None
    )

    ranked = routing_engine.rank_agents(db_session, org.id, "GENERAL", None)
    name_map = {r["agent_id"]: r["agent_name"] for r in ranked}

    assert name_map[str(a1.id)] == "Top Agent"
    assert name_map[str(a2.id)] == "Jane Doe"
    assert name_map[str(a3.id)] == "a3@test.com"


def test_agent_ranking_scoring_factors(db_session: Session):
    """Verify rank_agents scores availability, skill matches, and active ticket load."""
    org = _create_org(db_session, "Scoring Org")

    # Agent 1: Available, Technical skill expert (+40 +35 = 75)
    a1 = _create_user(db_session, org.id, "pro@test.com", display_name="Pro Tech")
    db_session.add(AgentAvailability(user_id=a1.id, status=AgentStatus.AVAILABLE))
    skill = Skill(organization_id=org.id, name="Networking", category=SkillCategory.TECHNICAL)
    db_session.add(skill)
    db_session.flush()
    db_session.add(
        AgentSkill(user_id=a1.id, skill_id=skill.id, proficiency_level=ProficiencyLevel.EXPERT)
    )

    # Agent 2: Busy, No matching skills (+10)
    a2 = _create_user(db_session, org.id, "busy@test.com", display_name="Busy Agent")
    db_session.add(AgentAvailability(user_id=a2.id, status=AgentStatus.BUSY))

    db_session.flush()

    ranked = routing_engine.rank_agents(db_session, org.id, "TECHNICAL", None)
    assert len(ranked) >= 2
    assert ranked[0]["agent_id"] == str(a1.id)
    assert ranked[0]["score"] > ranked[1]["score"]


# ==============================================================================
# 2. Classification Tests (Valid, Fences, Malformed, Provider Exception)
# ==============================================================================


def test_classify_ticket_valid_json():
    """Verify classify_ticket handles valid JSON responses and sets is_fallback: False."""
    engine = RoutingEngine()
    engine.model = MagicMock()

    mock_response = MagicMock()
    mock_response.text = json.dumps(
        {
            "category": "TECHNICAL",
            "priority": "HIGH",
            "confidence": 94,
            "sentiment": "NEGATIVE",
            "reasoning": "Database timeout in production cluster.",
            "suggested_tags": ["database", "timeout", "critical"],
        }
    )
    engine.model.generate_content.return_value = mock_response

    res = engine.classify_ticket(
        "Database connection failure", "Server returns 504 gateway timeout."
    )

    assert res["is_fallback"] is False
    assert res["category"] == "TECHNICAL"
    assert res["priority"] == "HIGH"
    assert res["confidence"] == 94
    assert res["sentiment"] == "NEGATIVE"
    assert "timeout" in res["suggested_tags"]


def test_classify_ticket_markdown_fences():
    """Verify markdown code blocks (```json ... ```) are cleanly stripped."""
    engine = RoutingEngine()
    engine.model = MagicMock()

    mock_response = MagicMock()
    mock_response.text = (
        "```json\n"
        "{\n"
        '  "category": "BILLING",\n'
        '  "priority": "LOW",\n'
        '  "confidence": 88,\n'
        '  "sentiment": "NEUTRAL",\n'
        '  "reasoning": "Invoice breakdown requested.",\n'
        '  "suggested_tags": ["invoice", "receipt"]\n'
        "}\n"
        "```"
    )
    engine.model.generate_content.return_value = mock_response

    res = engine.classify_ticket("Need last month's invoice", "Please send me receipt for March.")

    assert res["is_fallback"] is False
    assert res["category"] == "BILLING"
    assert res["priority"] == "LOW"
    assert res["confidence"] == 88


def test_classify_ticket_malformed_json_triggers_fallback():
    """Verify malformed model output triggers safe fallback with is_fallback: True."""
    engine = RoutingEngine()
    engine.model = MagicMock()

    mock_response = MagicMock()
    mock_response.text = "This is not JSON at all: Category = BUG, Priority = High"
    engine.model.generate_content.return_value = mock_response

    res = engine.classify_ticket("Broken checkout", "Cannot pay with credit card.")

    assert res["is_fallback"] is True
    assert res["category"] == "GENERAL"
    assert res["priority"] == "MEDIUM"
    assert res["confidence"] == 0
    assert "AI classification error" in res["reasoning"]
    assert "JSONDecodeError" in res["reasoning"]


def test_classify_ticket_provider_exception_triggers_fallback():
    """Verify Gemini API exceptions trigger safe fallback without bubbling or false AI claims."""
    engine = RoutingEngine()
    engine.model = MagicMock()
    engine.model.generate_content.side_effect = RuntimeError("Gemini 503: Service Unavailable")

    res = engine.classify_ticket("Any subject", "Any body")

    assert res["is_fallback"] is True
    assert res["category"] == "GENERAL"
    assert res["priority"] == "MEDIUM"
    assert res["confidence"] == 0
    assert "AI classification error" in res["reasoning"]
    assert "RuntimeError" in res["reasoning"]


# ==============================================================================
# 3. Pipeline Edge Cases & Automation Rule Overrides
# ==============================================================================


def test_route_no_eligible_agents(db_session: Session):
    """Verify routing handles zero available agents gracefully (unassigned, valid decision persisted)."""
    org = _create_org(db_session, "Empty Agent Org")
    customer = _create_customer(db_session, org.id)
    ticket = _create_ticket(db_session, org.id, customer.id, "Question", "Help with account")

    with patch.object(routing_engine, "classify_ticket") as mock_classify:
        mock_classify.return_value = {
            "category": "GENERAL",
            "priority": "LOW",
            "confidence": 85,
            "sentiment": "NEUTRAL",
            "reasoning": "Standard user inquiry.",
            "suggested_tags": ["help"],
            "is_fallback": False,
        }

        decision = routing_engine.route(db_session, ticket.id)

        assert decision is not None
        assert decision.assigned_agent_id is None
        assert ticket.assigned_user_id is None
        assert ticket.status == TicketStatus.NEW
        assert ticket.sla_due_at is not None


def test_route_automation_rule_overrides(db_session: Session):
    """Verify AutomationRule overrides classification priority and category."""
    org = _create_org(db_session, "Rule Org")
    customer = _create_customer(db_session, org.id, is_vip=True)
    ticket = _create_ticket(
        db_session,
        org.id,
        customer.id,
        subject="URGENT: Database outage",
        body="All services are down.",
    )

    # Automation rule: if is_vip and keyword_in_subject matches "URGENT", set CRITICAL priority
    rule = AutomationRule(
        organization_id=org.id,
        name="VIP Urgent Override",
        trigger_event="TICKET_CREATED",
        conditions_json={
            "is_vip": True,
            "keyword_in_subject": "urgent",
        },
        actions_json={
            "set_priority": "CRITICAL",
            "set_category": "TECHNICAL",
        },
        is_active=True,
    )
    db_session.add(rule)
    db_session.flush()

    # Model classifies as LOW and GENERAL
    with patch.object(routing_engine, "classify_ticket") as mock_classify:
        mock_classify.return_value = {
            "category": "GENERAL",
            "priority": "LOW",
            "confidence": 70,
            "sentiment": "NEUTRAL",
            "reasoning": "Classified by AI.",
            "suggested_tags": [],
            "is_fallback": False,
        }

        decision = routing_engine.route(db_session, ticket.id)

        assert decision is not None
        assert ticket.priority == TicketPriority.CRITICAL
        assert ticket.category == TicketCategory.TECHNICAL
        assert "[Rule Override: Priority]" in decision.reasoning
        assert "[Rule Override: Category]" in decision.reasoning

        # Verify WorkflowExecution record
        workflow = (
            db_session.query(WorkflowExecution)
            .filter(WorkflowExecution.ticket_id == ticket.id)
            .first()
        )
        assert workflow is not None
        assert workflow.rule_id == rule.id
        assert workflow.status == "SUCCESS"


# ==============================================================================
# 4. Persistence & Audit Verification (AI vs Fallback)
# ==============================================================================


def test_route_successful_persistence_with_ai(db_session: Session):
    """Verify complete transaction persistence when AI classification succeeds."""
    org = _create_org(db_session, "Persistence AI Org")
    agent = _create_user(db_session, org.id, "agent_persist@test.com", display_name="Agent Zero")
    db_session.add(AgentAvailability(user_id=agent.id, status=AgentStatus.AVAILABLE))
    customer = _create_customer(db_session, org.id)
    ticket = _create_ticket(
        db_session, org.id, customer.id, "Refund request", "Please issue a refund."
    )

    with (
        patch.object(routing_engine, "classify_ticket") as mock_classify,
        patch.object(routing_engine, "model", MagicMock()),
    ):
        mock_classify.return_value = {
            "category": "BILLING",
            "priority": "HIGH",
            "confidence": 95,
            "sentiment": "NEGATIVE",
            "reasoning": "Direct refund request with high intent.",
            "suggested_tags": ["refund", "billing"],
            "is_fallback": False,
        }

        decision = routing_engine.route(db_session, ticket.id)

        assert decision is not None
        assert ticket.status == TicketStatus.ASSIGNED
        assert ticket.assigned_user_id == agent.id
        assert ticket.category == TicketCategory.BILLING
        assert ticket.priority == TicketPriority.HIGH

        # Verify RoutingDecision record
        saved_decision = (
            db_session.query(RoutingDecision).filter(RoutingDecision.ticket_id == ticket.id).first()
        )
        assert saved_decision is not None
        assert saved_decision.confidence_score == 95
        assert saved_decision.model_version == routing_engine.model_version
        assert saved_decision.model_version != "fallback"

        # Verify AssignmentHistory
        history = (
            db_session.query(AssignmentHistory)
            .filter(
                AssignmentHistory.ticket_id == ticket.id,
                AssignmentHistory.assignment_type == "AGENT",
            )
            .first()
        )
        assert history is not None
        assert history.new_value_id == agent.id
        assert "Auto-assigned by AI Routing Engine" in history.reason

        # Verify AuditLog
        audit = (
            db_session.query(AuditLog)
            .filter(
                AuditLog.entity_id == ticket.id, AuditLog.action_type == ActionType.TICKET_ASSIGNED
            )
            .first()
        )
        assert audit is not None
        assert audit.changes_json["category"] == "BILLING"
        assert audit.changes_json["confidence"] == 95


def test_route_persistence_with_fallback(db_session: Session):
    """Verify that when fallback is used, model_version is 'fallback' and history states fallback."""
    org = _create_org(db_session, "Persistence Fallback Org")
    agent = _create_user(db_session, org.id, "agent_fb@test.com", display_name="Agent FB")
    db_session.add(AgentAvailability(user_id=agent.id, status=AgentStatus.AVAILABLE))
    customer = _create_customer(db_session, org.id)
    ticket = _create_ticket(db_session, org.id, customer.id, "General query", "Random question.")

    with patch.object(routing_engine, "classify_ticket") as mock_classify:
        mock_classify.return_value = {
            "category": "GENERAL",
            "priority": "MEDIUM",
            "confidence": 0,
            "sentiment": "NEUTRAL",
            "reasoning": "Fallback routing triggered due to provider failure.",
            "suggested_tags": [],
            "is_fallback": True,
        }

        decision = routing_engine.route(db_session, ticket.id)

        assert decision is not None
        assert decision.model_version == "fallback"

        history = (
            db_session.query(AssignmentHistory)
            .filter(
                AssignmentHistory.ticket_id == ticket.id,
                AssignmentHistory.assignment_type == "AGENT",
            )
            .first()
        )
        assert history is not None
        assert history.reason == "Auto-assigned via fallback routing engine."


# ==============================================================================
# 5. Tenant Isolation Tests
# ==============================================================================


def test_route_tenant_isolation(db_session: Session):
    """Verify cross-organization boundary enforcement: tickets never route to agents or rules of other orgs."""
    org_a = _create_org(db_session, "Tenant Org A")
    org_b = _create_org(db_session, "Tenant Org B")

    agent_a = _create_user(db_session, org_a.id, "agent_a@test.com", display_name="Agent A")
    db_session.add(AgentAvailability(user_id=agent_a.id, status=AgentStatus.AVAILABLE))

    agent_b = _create_user(db_session, org_b.id, "agent_b@test.com", display_name="Agent B")
    db_session.add(AgentAvailability(user_id=agent_b.id, status=AgentStatus.AVAILABLE))

    # Rule in Org B only
    db_session.add(
        AutomationRule(
            organization_id=org_b.id,
            name="Org B Strict Priority",
            trigger_event="TICKET_CREATED",
            conditions_json={"keyword_in_subject": "support"},
            actions_json={"set_priority": "CRITICAL"},
            is_active=True,
        )
    )

    customer_a = _create_customer(db_session, org_a.id, "customer_a@test.com")
    ticket_a = _create_ticket(
        db_session, org_a.id, customer_a.id, subject="Need support", body="Details."
    )

    with patch.object(routing_engine, "classify_ticket") as mock_classify:
        mock_classify.return_value = {
            "category": "GENERAL",
            "priority": "LOW",
            "confidence": 80,
            "sentiment": "NEUTRAL",
            "reasoning": "Standard support inquiry.",
            "suggested_tags": [],
            "is_fallback": False,
        }

        decision_a = routing_engine.route(db_session, ticket_a.id)

        assert decision_a is not None
        # Must be assigned to Org A's agent, NEVER Org B's agent
        assert decision_a.assigned_agent_id == agent_a.id
        assert ticket_a.assigned_user_id == agent_a.id
        # Org B's rule must NOT have triggered on Ticket A
        assert ticket_a.priority == TicketPriority.LOW
        assert "[Rule Override: Priority]" not in decision_a.reasoning


# ==============================================================================
# 6. Celery Task Execution & Retry Tests
# ==============================================================================


def test_celery_route_ticket_task_success(db_session: Session):
    """Verify route_ticket_task executes smoothly and logs successful completion."""
    org = _create_org(db_session, "Celery Org")
    customer = _create_customer(db_session, org.id)
    ticket = _create_ticket(db_session, org.id, customer.id)

    with patch("src.workers.routing_tasks.SessionLocal", return_value=db_session):
        with patch.object(routing_engine, "route") as mock_route:
            mock_decision = MagicMock()
            mock_decision.predicted_category = "TECHNICAL"
            mock_decision.predicted_priority = "HIGH"
            mock_decision.assigned_agent_id = uuid.uuid4()
            mock_decision.confidence_score = 90
            mock_route.return_value = mock_decision

            # Execute task synchronously
            route_ticket_task.run(str(ticket.id))

            mock_route.assert_called_once_with(db_session, ticket.id)


def test_celery_route_ticket_task_failure_and_retry(db_session: Session):
    """Verify route_ticket_task rolls back and triggers self.retry upon exception."""
    ticket_id = uuid.uuid4()
    mock_db = MagicMock()

    with patch("src.workers.routing_tasks.SessionLocal", return_value=mock_db):
        with patch.object(routing_engine, "route", side_effect=RuntimeError("DB Lock Timeout")):
            with patch.object(
                route_ticket_task, "retry", side_effect=Exception("CeleryRetryTriggered")
            ) as mock_retry:
                with pytest.raises(Exception, match="CeleryRetryTriggered"):
                    route_ticket_task.apply(args=[str(ticket_id)], throw=True)

                mock_db.rollback.assert_called_once()
                mock_db.close.assert_called_once()
                mock_retry.assert_called_once()
