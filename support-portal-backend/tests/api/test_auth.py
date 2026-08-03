from fastapi.testclient import TestClient


class TestOwnerSignup:
    def test_signup_success(self, client: TestClient):
        resp = client.post(
            "/api/v1/auth/signup",
            json={
                "organization_name": "Acme Global",
                "industry": "Technology",
                "first_name": "Alice",
                "last_name": "Smith",
                "email": "alice@acme.com",
                "password": "Password123!",
            },
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_signup_duplicate_email_fails(self, client: TestClient):
        client.post(
            "/api/v1/auth/signup",
            json={
                "organization_name": "Acme Global",
                "first_name": "Alice",
                "last_name": "Smith",
                "email": "dup@acme.com",
                "password": "Password123!",
            },
        )
        resp = client.post(
            "/api/v1/auth/signup",
            json={
                "organization_name": "Acme 2",
                "first_name": "Bob",
                "last_name": "Smith",
                "email": "dup@acme.com",
                "password": "Password123!",
            },
        )
        assert resp.status_code == 409

    def test_signup_weak_password_fails(self, client: TestClient):
        resp = client.post(
            "/api/v1/auth/signup",
            json={
                "organization_name": "Weak Pass Org",
                "first_name": "Alice",
                "last_name": "Smith",
                "email": "weak@acme.com",
                "password": "123",
            },
        )
        assert resp.status_code == 422


class TestLoginAndTokenRotation:
    def test_login_success(self, client: TestClient):
        # 1. Signup
        client.post(
            "/api/v1/auth/signup",
            json={
                "organization_name": "Login Org",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@login.com",
                "password": "Password123!",
            },
        )

        # 2. Login
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "john@login.com", "password": "Password123!"},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "access_token" in data
        assert "refresh_token" in data

    def test_login_invalid_password_fails(self, client: TestClient):
        client.post(
            "/api/v1/auth/signup",
            json={
                "organization_name": "Login Fail Org",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john.fail@login.com",
                "password": "Password123!",
            },
        )
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "john.fail@login.com", "password": "WrongPassword!"},
        )
        assert resp.status_code == 401

    def test_refresh_token_rotation(self, client: TestClient):
        # 1. Signup
        signup_resp = client.post(
            "/api/v1/auth/signup",
            json={
                "organization_name": "Rotate Org",
                "first_name": "Rotate",
                "last_name": "User",
                "email": "rotate@login.com",
                "password": "Password123!",
            },
        )
        old_refresh = signup_resp.json()["data"]["refresh_token"]

        # 2. Refresh Token
        refresh_resp = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": old_refresh},
        )
        assert refresh_resp.status_code == 200
        new_refresh = refresh_resp.json()["data"]["refresh_token"]
        assert new_refresh != old_refresh

        # 3. Old refresh token should now be revoked (rotated)
        failed_refresh = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": old_refresh},
        )
        assert failed_refresh.status_code == 401


class TestForgotPasswordFlow:
    def test_forgot_and_reset_password(self, client: TestClient):
        # Signup
        client.post(
            "/api/v1/auth/signup",
            json={
                "organization_name": "Reset Org",
                "first_name": "Reset",
                "last_name": "User",
                "email": "reset@example.com",
                "password": "Password123!",
            },
        )

        # Forgot password request
        resp = client.post("/api/v1/auth/forgot-password", json={"email": "reset@example.com"})
        assert resp.status_code == 200

        # Login with old password succeeds
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": "reset@example.com", "password": "Password123!"},
        )
        assert login_resp.status_code == 200
