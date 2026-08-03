from fastapi.testclient import TestClient


def get_authenticated_headers(client: TestClient, email: str = "user@profile.com") -> dict:
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "organization_name": "Profile Org",
            "first_name": "Profile",
            "last_name": "Tester",
            "email": email,
            "password": "Password123!",
        },
    )
    token = resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestUserProfile:
    def test_get_me(self, client: TestClient):
        headers = get_authenticated_headers(client, email="me@profile.com")
        resp = client.get("/api/v1/auth/me", headers=headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["email"] == "me@profile.com"
        assert data["role"] == "OWNER"

    def test_update_profile(self, client: TestClient):
        headers = get_authenticated_headers(client, email="update@profile.com")
        resp = client.patch(
            "/api/v1/users/me",
            headers=headers,
            json={"job_title": "Head of Support", "bio": "Passionate about customer success"},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["job_title"] == "Head of Support"
        assert data["bio"] == "Passionate about customer success"

    def test_update_preferences(self, client: TestClient):
        headers = get_authenticated_headers(client, email="pref@profile.com")
        resp = client.patch(
            "/api/v1/users/me/preferences",
            headers=headers,
            json={"theme_preference": "dark", "preferred_language": "es"},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["theme_preference"] == "dark"
        assert data["preferred_language"] == "es"
