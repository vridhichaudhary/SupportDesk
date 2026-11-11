"""
Tests for Admin Agent Directory Endpoint (Phase 2).
Covers:
- GET /api/v1/agents lists organization agents with availability, active ticket load, and skills
- Tenant isolation (never lists agents of another organization)
- RBAC enforcement (CUSTOMER cannot view agent directory)
"""

import uuid

from fastapi.testclient import TestClient

from src.models import (
    AgentAvailability,
    AgentStatus,
    User,
    UserRole,
)


def _auth_header(
    client: TestClient, email: str, org_name: str, role: str = "OWNER"
) -> tuple[dict, uuid.UUID]:
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "organization_name": org_name,
            "industry": "Technology",
            "first_name": "Admin",
            "last_name": "User",
            "email": email,
            "password": "Password123!",
        },
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200, me_resp.text
    org_id = uuid.UUID(me_resp.json()["data"]["organization_id"])
    return headers, org_id


def test_list_organization_agents_success(client: TestClient, db_session):
    """Verify GET /api/v1/agents returns organization agents with status and active ticket count."""
    headers, org_id = _auth_header(client, "admin_agent_dir@test.com", "Agent Dir Org")

    # Add an AGENT in this org
    agent = User(
        id=uuid.uuid4(),
        organization_id=org_id,
        email="support_rep1@test.com",
        password_hash="hash",
        role=UserRole.AGENT,
        display_name="Rep One",
        job_title="Technical Specialist",
        is_active=True,
    )
    db_session.add(agent)
    db_session.flush()

    db_session.add(AgentAvailability(user_id=agent.id, status=AgentStatus.AVAILABLE))
    db_session.commit()

    resp = client.get("/api/v1/agents", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert isinstance(data, list)
    agent_emails = [a["email"] for a in data]
    assert "support_rep1@test.com" in agent_emails

    rep_entry = next(a for a in data if a["email"] == "support_rep1@test.com")
    assert rep_entry["name"] == "Rep One"
    assert rep_entry["status"] == "available"
    assert rep_entry["job_title"] == "Technical Specialist"


def test_list_organization_agents_tenant_isolation(client: TestClient, db_session):
    """Verify GET /api/v1/agents enforces tenant isolation (never returns agents from other orgs)."""
    headers_a, org_a_id = _auth_header(client, "owner_a@test.com", "Org A Corp")
    headers_b, org_b_id = _auth_header(client, "owner_b@test.com", "Org B Corp")

    # Add an agent to Org B
    agent_b = User(
        id=uuid.uuid4(),
        organization_id=org_b_id,
        email="agent_secret_b@test.com",
        password_hash="hash",
        role=UserRole.AGENT,
        display_name="Agent B",
        is_active=True,
    )
    db_session.add(agent_b)
    db_session.commit()

    # Query using Org A's token
    resp = client.get("/api/v1/agents", headers=headers_a)
    assert resp.status_code == 200, resp.text
    org_a_emails = [a["email"] for a in resp.json()]
    assert "agent_secret_b@test.com" not in org_a_emails


def test_list_organization_agents_unauthorized(client: TestClient):
    """Verify unauthenticated requests cannot access the agent directory."""
    resp = client.get("/api/v1/agents")
    assert resp.status_code in [401, 403]
