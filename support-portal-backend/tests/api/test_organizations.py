import uuid

from fastapi.testclient import TestClient


# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------
def create_demo_org(client: TestClient, name: str = "Acme Corp") -> dict:
    resp = client.post(
        "/api/v1/organizations",
        json={"name": name, "industry": "Technology", "timezone": "UTC"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


# -------------------------------------------------------------------
# CRUD tests
# -------------------------------------------------------------------
class TestCreateOrganization:
    def test_create_success(self, client: TestClient):
        resp = client.post(
            "/api/v1/organizations",
            json={"name": "Test Org", "industry": "Finance", "timezone": "UTC"},
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["name"] == "Test Org"
        assert data["status"] == "ACTIVE"
        assert "id" in data

    def test_create_requires_name(self, client: TestClient):
        resp = client.post("/api/v1/organizations", json={"industry": "Finance"})
        assert resp.status_code == 422

    def test_create_name_too_short(self, client: TestClient):
        resp = client.post("/api/v1/organizations", json={"name": "X"})
        assert resp.status_code == 422

    def test_create_invalid_email(self, client: TestClient):
        resp = client.post(
            "/api/v1/organizations",
            json={"name": "Test Org", "support_email": "not-an-email"},
        )
        assert resp.status_code == 422


class TestGetOrganization:
    def test_get_existing_org(self, client: TestClient):
        created = create_demo_org(client, name="GetTest Org")
        org_id = created["id"]
        resp = client.get(f"/api/v1/organizations/{org_id}")
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == org_id

    def test_get_not_found(self, client: TestClient):
        fake_id = str(uuid.uuid4())
        resp = client.get(f"/api/v1/organizations/{fake_id}")
        assert resp.status_code == 404


class TestListOrganizations:
    def test_list_returns_paginated(self, client: TestClient):
        create_demo_org(client, name="ListOrg A")
        create_demo_org(client, name="ListOrg B")
        resp = client.get("/api/v1/organizations")
        assert resp.status_code == 200
        body = resp.json()
        assert "data" in body
        assert "meta" in body
        assert body["meta"]["total"] >= 2

    def test_list_pagination_params(self, client: TestClient):
        resp = client.get("/api/v1/organizations?offset=0&limit=1")
        assert resp.status_code == 200
        assert len(resp.json()["data"]) <= 1


class TestUpdateOrganization:
    def test_update_name(self, client: TestClient):
        created = create_demo_org(client, name="BeforeUpdate")
        org_id = created["id"]
        resp = client.patch(
            f"/api/v1/organizations/{org_id}",
            json={"name": "AfterUpdate"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["name"] == "AfterUpdate"

    def test_update_nonexistent_fails(self, client: TestClient):
        resp = client.patch(
            f"/api/v1/organizations/{uuid.uuid4()}",
            json={"name": "Ghost"},
        )
        assert resp.status_code == 404


class TestOrganizationSettings:
    def test_update_settings(self, client: TestClient):
        created = create_demo_org(client, name="SettingsOrg")
        org_id = created["id"]
        resp = client.patch(
            f"/api/v1/organizations/{org_id}/settings",
            json={"ai_enabled": False, "brand_color": "#FF5733"},
        )
        assert resp.status_code == 200
        settings = resp.json()["data"]["settings"]
        assert settings["ai_enabled"] is False
        assert settings["brand_color"] == "#FF5733"


class TestDashboard:
    def test_dashboard_returns_summary(self, client: TestClient):
        created = create_demo_org(client, name="DashboardOrg")
        org_id = created["id"]
        resp = client.get(f"/api/v1/organizations/{org_id}/dashboard")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "total_teams" in data
        assert "total_tickets" in data
        assert data["total_tickets"] == 0  # fresh org


class TestTimeline:
    def test_timeline_has_create_event(self, client: TestClient):
        created = create_demo_org(client, name="TimelineOrg")
        org_id = created["id"]
        resp = client.get(f"/api/v1/organizations/{org_id}/timeline")
        assert resp.status_code == 200
        events = resp.json()["data"]
        assert len(events) >= 1
        assert events[0]["action_type"] == "CREATE"


class TestSoftDelete:
    def test_soft_delete(self, client: TestClient):
        created = create_demo_org(client, name="DeleteOrg")
        org_id = created["id"]
        # Delete
        resp = client.delete(f"/api/v1/organizations/{org_id}")
        assert resp.status_code == 200
        assert resp.json()["data"]["deleted"] is True
        # After deletion, GET should 404
        resp = client.get(f"/api/v1/organizations/{org_id}")
        assert resp.status_code == 404
