import uuid
from typing import Dict

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.core.security import create_access_token
from src.models import User, UserRole, UserRoleAssignment
from src.repositories.rbac import role_repo


# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------
def signup_owner(client: TestClient, email: str, org_name: str) -> Dict[str, str]:
    """Signs up a new tenant via /api/v1/auth/signup and returns auth headers & org_id."""
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "organization_name": org_name,
            "industry": "Technology",
            "first_name": "Owner",
            "last_name": "Test",
            "email": email,
            "password": "Password123!",
        },
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["data"]["access_token"]

    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200, me_resp.text
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
    """Creates a user with a specific role and generates auth headers."""
    user = User(
        email=email,
        password_hash="hashed_pw",
        first_name="Role",
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


# -------------------------------------------------------------------
# Anonymous Access Tests (Task 1)
# -------------------------------------------------------------------
class TestAnonymousAccess:
    def test_anonymous_create_rejected(self, client: TestClient):
        resp = client.post(
            "/api/v1/organizations",
            json={"name": "Anon Org", "industry": "Technology"},
        )
        assert resp.status_code == 401

    def test_anonymous_list_rejected(self, client: TestClient):
        resp = client.get("/api/v1/organizations")
        assert resp.status_code == 401

    def test_anonymous_get_rejected(self, client: TestClient):
        resp = client.get(f"/api/v1/organizations/{uuid.uuid4()}")
        assert resp.status_code == 401

    def test_anonymous_update_rejected(self, client: TestClient):
        resp = client.patch(
            f"/api/v1/organizations/{uuid.uuid4()}",
            json={"name": "Anon Update"},
        )
        assert resp.status_code == 401

    def test_anonymous_delete_rejected(self, client: TestClient):
        resp = client.delete(f"/api/v1/organizations/{uuid.uuid4()}")
        assert resp.status_code == 401


# -------------------------------------------------------------------
# Unauthorized Role Access Tests (Task 1)
# -------------------------------------------------------------------
class TestUnauthorizedAccess:
    def test_customer_cannot_manage_organization(self, client: TestClient, db_session: Session):
        owner_data = signup_owner(client, "own1@test.com", "Org One")
        cust_auth = create_user_with_role(
            db_session,
            uuid.UUID(owner_data["org_id"]),
            UserRole.CUSTOMER,
            "cust1@test.com",
        )

        # Customer cannot list all orgs
        resp = client.get("/api/v1/organizations", headers=cust_auth["headers"])
        assert resp.status_code == 403

        # Customer cannot create org
        resp = client.post(
            "/api/v1/organizations",
            json={"name": "Cust Org", "industry": "Tech"},
            headers=cust_auth["headers"],
        )
        assert resp.status_code == 403

        # Customer cannot delete org
        resp = client.delete(
            f"/api/v1/organizations/{owner_data['org_id']}",
            headers=cust_auth["headers"],
        )
        assert resp.status_code == 403

    def test_agent_cannot_modify_or_delete_organization(
        self, client: TestClient, db_session: Session
    ):
        owner_data = signup_owner(client, "own2@test.com", "Org Two")
        agent_auth = create_user_with_role(
            db_session,
            uuid.UUID(owner_data["org_id"]),
            UserRole.AGENT,
            "agent2@test.com",
        )

        resp = client.patch(
            f"/api/v1/organizations/{owner_data['org_id']}",
            json={"name": "Agent Hacked Org"},
            headers=agent_auth["headers"],
        )
        assert resp.status_code == 403

        resp = client.delete(
            f"/api/v1/organizations/{owner_data['org_id']}",
            headers=agent_auth["headers"],
        )
        assert resp.status_code == 403


# -------------------------------------------------------------------
# Authorized CRUD & Validation Tests (Task 1)
# -------------------------------------------------------------------
class TestAuthorizedOrganizationCRUD:
    def test_create_and_validation(self, client: TestClient):
        owner = signup_owner(client, "owner_crud@test.com", "CRUD Org")

        # Missing name
        resp = client.post(
            "/api/v1/organizations",
            json={"industry": "Finance"},
            headers=owner["headers"],
        )
        assert resp.status_code == 422

        # Name too short
        resp = client.post(
            "/api/v1/organizations",
            json={"name": "X"},
            headers=owner["headers"],
        )
        assert resp.status_code == 422

        # Invalid email
        resp = client.post(
            "/api/v1/organizations",
            json={"name": "Valid Name", "support_email": "invalid-email"},
            headers=owner["headers"],
        )
        assert resp.status_code == 422

        # Valid create
        resp = client.post(
            "/api/v1/organizations",
            json={
                "name": "Secondary Branch",
                "industry": "Finance",
                "timezone": "UTC",
            },
            headers=owner["headers"],
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["name"] == "Secondary Branch"
        assert data["status"] == "ACTIVE"

    def test_get_and_list_organization(self, client: TestClient):
        owner = signup_owner(client, "owner_get@test.com", "Get Org")
        org_id = owner["org_id"]

        # GET single
        resp = client.get(f"/api/v1/organizations/{org_id}", headers=owner["headers"])
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == org_id
        assert resp.json()["data"]["name"] == "Get Org"

        # List returns owner's organization
        resp = client.get("/api/v1/organizations", headers=owner["headers"])
        assert resp.status_code == 200
        body = resp.json()
        assert body["meta"]["total"] >= 1
        ids = [item["id"] for item in body["data"]]
        assert org_id in ids

    def test_update_profile_and_settings(self, client: TestClient):
        owner = signup_owner(client, "owner_patch@test.com", "Patch Org")
        org_id = owner["org_id"]

        # PATCH profile
        resp = client.patch(
            f"/api/v1/organizations/{org_id}",
            json={"name": "Renamed Org"},
            headers=owner["headers"],
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["name"] == "Renamed Org"

        # PATCH settings
        resp = client.patch(
            f"/api/v1/organizations/{org_id}/settings",
            json={"ai_enabled": False, "brand_color": "#FF5733"},
            headers=owner["headers"],
        )
        assert resp.status_code == 200
        settings = resp.json()["data"]["settings"]
        assert settings["ai_enabled"] is False
        assert settings["brand_color"] == "#FF5733"

    def test_dashboard_and_timeline(self, client: TestClient):
        owner = signup_owner(client, "owner_stats@test.com", "Stats Org")
        org_id = owner["org_id"]

        # Dashboard
        resp = client.get(f"/api/v1/organizations/{org_id}/dashboard", headers=owner["headers"])
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "total_teams" in data
        assert "total_tickets" in data

        # Timeline
        resp = client.get(f"/api/v1/organizations/{org_id}/timeline", headers=owner["headers"])
        assert resp.status_code == 200
        assert isinstance(resp.json()["data"], list)

    def test_soft_delete(self, client: TestClient):
        owner = signup_owner(client, "owner_del@test.com", "Delete Org")
        org_id = owner["org_id"]

        resp = client.delete(f"/api/v1/organizations/{org_id}", headers=owner["headers"])
        assert resp.status_code == 200
        assert resp.json()["data"]["deleted"] is True

        # After soft delete, querying it returns 404
        resp = client.get(f"/api/v1/organizations/{org_id}", headers=owner["headers"])
        assert resp.status_code == 404


# -------------------------------------------------------------------
# Multi-Tenant Data Isolation Tests (Task 1)
# -------------------------------------------------------------------
class TestCrossTenantDataIsolation:
    def test_tenant_cannot_access_other_tenant_organization(self, client: TestClient):
        owner_a = signup_owner(client, "org_a@test.com", "Tenant Alpha")
        owner_b = signup_owner(client, "org_b@test.com", "Tenant Beta")

        org_b_id = owner_b["org_id"]

        # Owner A attempts to GET Tenant B's organization -> 404
        resp = client.get(f"/api/v1/organizations/{org_b_id}", headers=owner_a["headers"])
        assert resp.status_code == 404

        # Owner A attempts to PATCH Tenant B's profile -> 404
        resp = client.patch(
            f"/api/v1/organizations/{org_b_id}",
            json={"name": "Compromised Beta"},
            headers=owner_a["headers"],
        )
        assert resp.status_code == 404

        # Owner A attempts to PATCH Tenant B's settings -> 404
        resp = client.patch(
            f"/api/v1/organizations/{org_b_id}/settings",
            json={"ai_enabled": False},
            headers=owner_a["headers"],
        )
        assert resp.status_code == 404

        # Owner A attempts to DELETE Tenant B's organization -> 404
        resp = client.delete(f"/api/v1/organizations/{org_b_id}", headers=owner_a["headers"])
        assert resp.status_code == 404

        # Owner A lists organizations -> Tenant B's org is NOT in Owner A's list
        resp = client.get("/api/v1/organizations", headers=owner_a["headers"])
        assert resp.status_code == 200
        listed_ids = [o["id"] for o in resp.json()["data"]]
        assert owner_a["org_id"] in listed_ids
        assert org_b_id not in listed_ids
