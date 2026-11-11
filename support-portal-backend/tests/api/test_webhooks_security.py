import uuid
from typing import Dict

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.core.security import create_access_token
from src.models import User, UserRole, UserRoleAssignment
from src.repositories.rbac import role_repo


def signup_owner(client: TestClient, email: str, org_name: str) -> Dict[str, str]:
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "organization_name": org_name,
            "industry": "Technology",
            "first_name": "Web",
            "last_name": "Admin",
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


# ─── Webhook Security Tests ───────────────────────────────────────────────────


class TestWebhookSecurity:
    def test_anonymous_access_denied(self, client: TestClient):
        endpoint_id = uuid.uuid4()
        assert client.get("/api/v1/webhooks").status_code == 401
        assert (
            client.post(
                "/api/v1/webhooks",
                json={"url": "https://example.com/hook", "description": "test"},
            ).status_code
            == 401
        )
        assert client.get(f"/api/v1/webhooks/{endpoint_id}").status_code == 401
        assert client.post(f"/api/v1/webhooks/{endpoint_id}/rotate-secret").status_code == 401
        assert client.delete(f"/api/v1/webhooks/{endpoint_id}").status_code == 401

    def test_customer_and_agent_forbidden(self, client: TestClient, db_session: Session):
        owner = signup_owner(client, "wh_owner1@co.com", "WH Org 1")
        org_id = uuid.UUID(owner["org_id"])
        cust = create_user_with_role(db_session, org_id, UserRole.CUSTOMER, "wh_cust1@co.com")
        agent = create_user_with_role(db_session, org_id, UserRole.AGENT, "wh_agent1@co.com")

        # Customer forbidden
        assert client.get("/api/v1/webhooks", headers=cust["headers"]).status_code == 403
        assert (
            client.post(
                "/api/v1/webhooks",
                json={"url": "https://example.com/cust", "description": "cust"},
                headers=cust["headers"],
            ).status_code
            == 403
        )

        # Agent forbidden
        assert client.get("/api/v1/webhooks", headers=agent["headers"]).status_code == 403
        assert (
            client.post(
                "/api/v1/webhooks",
                json={"url": "https://example.com/agent", "description": "agent"},
                headers=agent["headers"],
            ).status_code
            == 403
        )

    def test_webhook_secret_lifecycle_and_redaction(self, client: TestClient):
        """
        TASK 4 Requirements:
        - HMAC secrets must never appear in list or detail responses.
        - Plaintext secret is returned strictly ONCE during creation.
        - Secret rotation returns new secret strictly once, never in subsequent reads.
        """
        owner = signup_owner(client, "wh_owner2@co.com", "WH Org 2")

        # 1. Create Webhook: secret is returned ONCE
        create_resp = client.post(
            "/api/v1/webhooks",
            json={
                "url": "https://webhook.site/test-endpoint",
                "description": "Production billing webhook",
                "subscribed_events": ["ticket.created", "ticket.resolved"],
            },
            headers=owner["headers"],
        )
        assert create_resp.status_code == 201, create_resp.text
        create_data = create_resp.json()
        endpoint_id = create_data["id"]

        assert "hmac_secret" in create_data
        initial_secret = create_data["hmac_secret"]
        assert initial_secret.startswith("whsec_")
        assert len(initial_secret) >= 40

        # 2. List Webhooks: hmac_secret MUST be absent
        list_resp = client.get("/api/v1/webhooks", headers=owner["headers"])
        assert list_resp.status_code == 200
        endpoints = list_resp.json()
        assert len(endpoints) >= 1
        for ep in endpoints:
            assert "hmac_secret" not in ep

        # 3. Get Webhook Detail: hmac_secret MUST be absent
        detail_resp = client.get(f"/api/v1/webhooks/{endpoint_id}", headers=owner["headers"])
        assert detail_resp.status_code == 200
        detail_data = detail_resp.json()
        assert "hmac_secret" not in detail_data
        assert detail_data["id"] == endpoint_id
        assert detail_data["url"] == "https://webhook.site/test-endpoint"

        # 4. Rotate Secret: returns new secret once
        rotate_resp = client.post(
            f"/api/v1/webhooks/{endpoint_id}/rotate-secret",
            headers=owner["headers"],
        )
        assert rotate_resp.status_code == 200
        rotate_data = rotate_resp.json()
        assert "hmac_secret" in rotate_data
        new_secret = rotate_data["hmac_secret"]
        assert new_secret.startswith("whsec_")
        assert new_secret != initial_secret

        # 5. Detail after rotation: secret remains redacted
        detail_after = client.get(f"/api/v1/webhooks/{endpoint_id}", headers=owner["headers"])
        assert detail_after.status_code == 200
        assert "hmac_secret" not in detail_after.json()

        # 6. Delete (deactivate) endpoint
        del_resp = client.delete(f"/api/v1/webhooks/{endpoint_id}", headers=owner["headers"])
        assert del_resp.status_code == 204

        # 7. Subsequent GET returns 404 (endpoint deactivated)
        assert (
            client.get(
                f"/api/v1/webhooks/{endpoint_id}",
                headers=owner["headers"],
            ).status_code
            == 404
        )

    def test_multi_tenant_isolation(self, client: TestClient):
        owner_a = signup_owner(client, "wh_a@co.com", "Tenant A")
        owner_b = signup_owner(client, "wh_b@co.com", "Tenant B")

        # Owner A creates a webhook
        create_resp = client.post(
            "/api/v1/webhooks",
            json={"url": "https://tenant-a.com/hook", "description": "Tenant A Hook"},
            headers=owner_a["headers"],
        )
        endpoint_a_id = create_resp.json()["id"]

        # Owner B cannot view Owner A's webhook -> 404
        assert (
            client.get(
                f"/api/v1/webhooks/{endpoint_a_id}",
                headers=owner_b["headers"],
            ).status_code
            == 404
        )

        # Owner B cannot rotate Owner A's webhook secret -> 404
        assert (
            client.post(
                f"/api/v1/webhooks/{endpoint_a_id}/rotate-secret",
                headers=owner_b["headers"],
            ).status_code
            == 404
        )

        # Owner B cannot delete Owner A's webhook -> 404
        assert (
            client.delete(
                f"/api/v1/webhooks/{endpoint_a_id}",
                headers=owner_b["headers"],
            ).status_code
            == 404
        )

        # Owner B's webhook list does NOT include Owner A's endpoint
        b_list = client.get("/api/v1/webhooks", headers=owner_b["headers"]).json()
        assert not any(ep["id"] == endpoint_a_id for ep in b_list)
