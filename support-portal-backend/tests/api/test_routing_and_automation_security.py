import uuid
from typing import Dict

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.core.security import create_access_token
from src.models import (
    Customer,
    Ticket,
    TicketPriority,
    TicketStatus,
    User,
    UserRole,
    UserRoleAssignment,
)
from src.repositories.rbac import role_repo


def signup_owner(client: TestClient, email: str, org_name: str) -> Dict[str, str]:
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "organization_name": org_name,
            "industry": "Technology",
            "first_name": "Admin",
            "last_name": "Owner",
            "email": email,
            "password": "Password123!",
        },
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["data"]["access_token"]
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me = me_resp.json()["data"]
    return {
        "access_token": token,
        "org_id": me["organization_id"],
        "user_id": me["id"],
        "headers": {"Authorization": f"Bearer {token}"},
    }


def create_user_with_role(
    db: Session,
    org_id: uuid.UUID,
    role: UserRole,
    email: str,
) -> Dict[str, str]:
    user = User(
        email=email,
        password_hash="hashed_pw",
        first_name=role.value.capitalize(),
        last_name="User",
        organization_id=org_id,
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    system_role = role_repo.get_by_name_system(db, role.value)
    if system_role:
        assignment = UserRoleAssignment(
            user_id=user.id,
            organization_id=org_id,
            role_id=system_role.id,
        )
        db.add(assignment)
        db.commit()

    token = create_access_token(
        user_id=user.id,
        organization_id=user.organization_id,
        role=user.role.value,
    )
    return {
        "user_id": str(user.id),
        "org_id": str(user.organization_id),
        "headers": {"Authorization": f"Bearer {token}"},
    }


def create_dummy_ticket(db: Session, org_id: uuid.UUID, created_by_id: uuid.UUID) -> Ticket:
    customer = Customer(
        organization_id=org_id,
        email=f"cust_{uuid.uuid4().hex[:6]}@example.com",
        name="Test Cust",
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    ticket = Ticket(
        organization_id=org_id,
        customer_id=customer.id,
        created_by_id=created_by_id,
        ticket_number=f"SUP-{uuid.uuid4().hex[:6].upper()}",
        subject="Issue with server",
        body="Server returns 500 error",
        status=TicketStatus.NEW,
        priority=TicketPriority.MEDIUM,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


# ─── Automation Rules RBAC Tests ──────────────────────────────────────────────


class TestAutomationRBAC:
    def test_anonymous_access_denied(self, client: TestClient):
        rule_id = uuid.uuid4()
        assert client.get("/api/v1/automation/rules").status_code == 401
        assert client.post("/api/v1/automation/rules", json={}).status_code == 401
        assert client.patch(f"/api/v1/automation/rules/{rule_id}", json={}).status_code == 401
        assert client.delete(f"/api/v1/automation/rules/{rule_id}").status_code == 401

    def test_customer_cannot_manage_rules(self, client: TestClient, db_session: Session):
        owner = signup_owner(client, "auto_owner1@co.com", "Auto Org 1")
        cust = create_user_with_role(
            db_session, uuid.UUID(owner["org_id"]), UserRole.CUSTOMER, "auto_cust1@co.com"
        )

        rule_id = uuid.uuid4()
        # Customer cannot list, create, update, or delete rules
        assert client.get("/api/v1/automation/rules", headers=cust["headers"]).status_code == 403
        assert (
            client.post(
                "/api/v1/automation/rules",
                json={"name": "Cust Rule", "rule_type": "ROUTING", "conditions": {}, "actions": {}},
                headers=cust["headers"],
            ).status_code
            == 403
        )
        assert (
            client.patch(
                f"/api/v1/automation/rules/{rule_id}",
                json={"name": "Hacked Rule"},
                headers=cust["headers"],
            ).status_code
            == 403
        )
        assert (
            client.delete(
                f"/api/v1/automation/rules/{rule_id}",
                headers=cust["headers"],
            ).status_code
            == 403
        )

    def test_agent_cannot_manage_rules(self, client: TestClient, db_session: Session):
        owner = signup_owner(client, "auto_owner2@co.com", "Auto Org 2")
        agent = create_user_with_role(
            db_session, uuid.UUID(owner["org_id"]), UserRole.AGENT, "auto_agent2@co.com"
        )

        rule_id = uuid.uuid4()
        # Agent cannot create or mutate rules
        assert client.get("/api/v1/automation/rules", headers=agent["headers"]).status_code == 403
        assert (
            client.post(
                "/api/v1/automation/rules",
                json={
                    "name": "Agent Rule",
                    "rule_type": "ROUTING",
                    "conditions": {},
                    "actions": {},
                },
                headers=agent["headers"],
            ).status_code
            == 403
        )
        assert (
            client.patch(
                f"/api/v1/automation/rules/{rule_id}",
                json={"name": "Agent Mutated Rule"},
                headers=agent["headers"],
            ).status_code
            == 403
        )
        assert (
            client.delete(
                f"/api/v1/automation/rules/{rule_id}",
                headers=agent["headers"],
            ).status_code
            == 403
        )

    def test_owner_can_manage_rules(self, client: TestClient):
        owner = signup_owner(client, "auto_owner3@co.com", "Auto Org 3")

        # Create rule
        create_resp = client.post(
            "/api/v1/automation/rules",
            json={
                "name": "High Priority VIP Rule",
                "trigger_event": "TICKET_CREATED",
                "conditions_json": {"priority": "URGENT"},
                "actions_json": {"set_priority": "URGENT"},
                "is_active": True,
            },
            headers=owner["headers"],
        )
        assert create_resp.status_code == 201, create_resp.text
        rule = create_resp.json()
        rule_id = rule["id"]
        assert rule["name"] == "High Priority VIP Rule"

        # List rules
        list_resp = client.get("/api/v1/automation/rules", headers=owner["headers"])
        assert list_resp.status_code == 200
        assert any(r["id"] == rule_id for r in list_resp.json())

        # Patch rule
        patch_resp = client.patch(
            f"/api/v1/automation/rules/{rule_id}",
            json={"name": "Updated VIP Rule"},
            headers=owner["headers"],
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["name"] == "Updated VIP Rule"

        # Delete rule
        del_resp = client.delete(
            f"/api/v1/automation/rules/{rule_id}",
            headers=owner["headers"],
        )
        assert del_resp.status_code == 204


# ─── Routing RBAC Tests ───────────────────────────────────────────────────────


class TestRoutingRBAC:
    def test_anonymous_access_denied(self, client: TestClient):
        ticket_id = uuid.uuid4()
        assert (
            client.post("/api/v1/routing/analyze", json={"ticket_id": str(ticket_id)}).status_code
            == 401
        )
        assert (
            client.post("/api/v1/routing/assign", json={"ticket_id": str(ticket_id)}).status_code
            == 401
        )
        assert (
            client.post(
                "/api/v1/routing/override",
                json={
                    "ticket_id": str(ticket_id),
                    "agent_id": str(uuid.uuid4()),
                    "reason": "Manager override",
                },
            ).status_code
            == 401
        )
        assert client.get(f"/api/v1/routing/history?ticket_id={ticket_id}").status_code == 401
        assert client.get("/api/v1/routing/decisions").status_code == 401

    def test_customer_cannot_access_routing(self, client: TestClient, db_session: Session):
        owner = signup_owner(client, "route_owner1@co.com", "Route Org 1")
        org_id = uuid.UUID(owner["org_id"])
        cust = create_user_with_role(db_session, org_id, UserRole.CUSTOMER, "route_cust1@co.com")
        ticket = create_dummy_ticket(db_session, org_id, uuid.UUID(owner["user_id"]))

        # Customer forbidden on analyze
        assert (
            client.post(
                "/api/v1/routing/analyze",
                json={"ticket_id": str(ticket.id)},
                headers=cust["headers"],
            ).status_code
            == 403
        )

        # Customer forbidden on assign
        assert (
            client.post(
                "/api/v1/routing/assign",
                json={"ticket_id": str(ticket.id)},
                headers=cust["headers"],
            ).status_code
            == 403
        )

        # Customer forbidden on override
        assert (
            client.post(
                "/api/v1/routing/override",
                json={
                    "ticket_id": str(ticket.id),
                    "agent_id": str(uuid.uuid4()),
                    "reason": "Customer tampering",
                },
                headers=cust["headers"],
            ).status_code
            == 403
        )

        # Customer forbidden on history & decisions
        assert (
            client.get(
                f"/api/v1/routing/history?ticket_id={ticket.id}",
                headers=cust["headers"],
            ).status_code
            == 403
        )
        assert (
            client.get(
                "/api/v1/routing/decisions",
                headers=cust["headers"],
            ).status_code
            == 403
        )

    def test_agent_cannot_override_or_assign_routing(self, client: TestClient, db_session: Session):
        """Agents do NOT have 'assign_tickets' permission, so they cannot override or assign."""
        owner = signup_owner(client, "route_owner2@co.com", "Route Org 2")
        org_id = uuid.UUID(owner["org_id"])
        agent = create_user_with_role(db_session, org_id, UserRole.AGENT, "route_agent2@co.com")
        ticket = create_dummy_ticket(db_session, org_id, uuid.UUID(owner["user_id"]))

        # Agent override forbidden
        assert (
            client.post(
                "/api/v1/routing/override",
                json={
                    "ticket_id": str(ticket.id),
                    "agent_id": str(uuid.uuid4()),
                    "reason": "Agent unauthorized override",
                },
                headers=agent["headers"],
            ).status_code
            == 403
        )

        # Agent assign forbidden
        assert (
            client.post(
                "/api/v1/routing/assign",
                json={"ticket_id": str(ticket.id)},
                headers=agent["headers"],
            ).status_code
            == 403
        )

        # Agent cannot view system routing decisions list (requires assign_tickets)
        assert (
            client.get(
                "/api/v1/routing/decisions",
                headers=agent["headers"],
            ).status_code
            == 403
        )

    def test_owner_can_override_routing(self, client: TestClient, db_session: Session):
        owner = signup_owner(client, "route_owner3@co.com", "Route Org 3")
        org_id = uuid.UUID(owner["org_id"])
        agent = create_user_with_role(db_session, org_id, UserRole.AGENT, "route_agent3@co.com")
        ticket = create_dummy_ticket(db_session, org_id, uuid.UUID(owner["user_id"]))

        override_resp = client.post(
            "/api/v1/routing/override",
            json={
                "ticket_id": str(ticket.id),
                "agent_id": agent["user_id"],
                "reason": "Supervisor manual reassignment",
            },
            headers=owner["headers"],
        )
        assert override_resp.status_code == 200, override_resp.text
        data = override_resp.json()
        assert data["ticket_id"] == str(ticket.id)
        assert data["message"] == "Override dispatched successfully"
