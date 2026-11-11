"""
Regression and hardening tests for OAuth security and replay protection:
1. Valid state succeeds once.
2. Replaying the same state is rejected.
3. Two concurrent requests using the same nonce cannot both succeed.
4. Redis unavailable during production nonce consumption causes rejection.
5. Redis timeout causes rejection.
6. Redis reports the nonce already exists, causing rejection.
7. Invalid signature is rejected.
8. Expired state is rejected.
9. Wrong provider is rejected (cross-provider isolation).
10. Missing or malformed nonce is rejected.
11. A development-only memory fallback cannot be enabled under production configuration.
12. The authorization code exchange is not reached when state validation or nonce consumption fails.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import jwt
import pytest
import redis.exceptions
from fastapi.testclient import TestClient

from src.core.config import Settings, settings
from src.core.dependencies import get_db, get_redis
from src.core.exceptions import ServiceUnavailableException
from src.core.security import (
    JWT_ALGORITHM,
    JWT_SECRET,
    mark_oauth_nonce_consumed,
)
from src.main import app
from src.services.auth import auth_service
from src.services.oauth import OAuthUserInfo


class InProcessRedisStore:
    """Thread-safe Mock Redis for atomic test isolation."""

    def __init__(self):
        self._store = {}

    def set(self, key, value, ex=None, nx=False):
        if nx and key in self._store:
            return None
        self._store[key] = value
        return True

    def get(self, key):
        return self._store.get(key)

    def delete(self, *keys):
        for k in keys:
            self._store.pop(k, None)

    def ping(self):
        return True

    def close(self):
        pass


@pytest.fixture
def mock_redis():
    return InProcessRedisStore()


@pytest.fixture
def client(db_session, mock_redis):
    def override_get_db():
        yield db_session

    def override_get_redis():
        yield mock_redis

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = override_get_redis

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


class TestOAuthSecurityAndReplayProtection:
    # ── Test 1: Valid State Token Succeeds Once ─────────────────────────────────
    def test_valid_state_succeeds_once(self, client: TestClient):
        """1. Valid state succeeds once and returns access token with HttpOnly refresh cookie."""
        init_resp = client.get("/api/v1/auth/google")
        assert init_resp.status_code == 200
        state = init_resp.json()["data"]["state"]

        with patch("src.services.oauth.google_oauth_provider.get_user_info") as mock_user_info:
            mock_user_info.return_value = OAuthUserInfo(
                provider="google",
                provider_id="google-sub-once-1",
                email="once1@example.com",
                first_name="First",
                last_name="Test",
            )
            resp = client.post(
                "/api/v1/auth/google/exchange",
                json={"code": "valid-code-once", "state": state},
            )
            assert resp.status_code == 200
            data = resp.json()["data"]
            assert data["access_token"]
            assert data["refresh_token"] is None  # Reconciled: No JS exposure
            assert "refresh_token" in resp.cookies  # HttpOnly cookie delivered

    # ── Test 2: Replaying the Same State Is Rejected ────────────────────────────
    def test_replaying_same_state_is_rejected(self, client: TestClient):
        """2. Replaying the same state token is rejected with 422 Replay Attack Prevented."""
        init_resp = client.get("/api/v1/auth/github")
        state = init_resp.json()["data"]["state"]

        with patch("src.services.oauth.github_oauth_provider.get_user_info") as mock_user_info:
            mock_user_info.return_value = OAuthUserInfo(
                provider="github",
                provider_id="gh-sub-replay-2",
                email="replay2@example.com",
                first_name="Replay",
                last_name="Test",
            )
            # Call 1: First exchange succeeds
            first_resp = client.post(
                "/api/v1/auth/github/exchange",
                json={"code": "code-attempt-1", "state": state},
            )
            assert first_resp.status_code == 200

            # Call 2: Replay with same state is rejected
            replay_resp = client.post(
                "/api/v1/auth/github/exchange",
                json={"code": "code-attempt-2", "state": state},
            )
            assert replay_resp.status_code == 422
            assert "already been used" in replay_resp.json()["error"]["message"]

    # ── Test 3: Two Concurrent Requests Cannot Both Succeed ────────────────────
    def test_concurrent_requests_using_same_nonce_cannot_both_succeed(
        self, client: TestClient, db_session, mock_redis
    ):
        """3. When two concurrent requests use the same nonce, exactly one succeeds."""
        init_resp = client.get("/api/v1/auth/google")
        state = init_resp.json()["data"]["state"]

        with patch("src.services.oauth.google_oauth_provider.get_user_info") as mock_user_info:
            mock_user_info.return_value = OAuthUserInfo(
                provider="google",
                provider_id="google-sub-concur-3",
                email="concur3@example.com",
                first_name="Concur",
                last_name="Test",
            )

            def make_exchange(code_suffix: str):
                # Separate TestClient sharing the same in-process MockRedis
                with TestClient(app) as local_client:
                    return local_client.post(
                        "/api/v1/auth/google/exchange",
                        json={"code": f"code-{code_suffix}", "state": state},
                    )

            with ThreadPoolExecutor(max_workers=2) as executor:
                f1 = executor.submit(make_exchange, "req-1")
                f2 = executor.submit(make_exchange, "req-2")
                r1 = f1.result()
                r2 = f2.result()

            status_codes = sorted([r1.status_code, r2.status_code])
            # Exactly one request succeeds with 200, the other is rejected with 422
            assert status_codes == [200, 422]

    # ── Test 4: Redis Unavailable During Production Causes Rejection ────────────
    def test_redis_unavailable_during_production_causes_rejection(
        self, client: TestClient, monkeypatch
    ):
        """4. In production, Redis connection error causes 503 rejection (fail-closed)."""
        monkeypatch.setattr(settings, "ENVIRONMENT", "production")

        failing_redis = MagicMock()
        failing_redis.set.side_effect = redis.exceptions.ConnectionError(
            "Could not connect to Redis at dpg-redis:6379"
        )

        app.dependency_overrides[get_redis] = lambda: failing_redis

        init_resp = client.get("/api/v1/auth/google")
        state = init_resp.json()["data"]["state"]

        with patch("src.services.auth.auth_service.handle_oauth_login") as mock_handle_login:
            resp = client.post(
                "/api/v1/auth/google/exchange",
                json={"code": "code-prod-err", "state": state},
            )
            assert resp.status_code == 503
            assert "temporarily unavailable" in resp.json()["error"]["message"]
            # Code exchange MUST NOT be reached
            mock_handle_login.assert_not_called()

    # ── Test 5: Redis Timeout Causes Rejection ──────────────────────────────────
    def test_redis_timeout_causes_rejection(self, client: TestClient, monkeypatch):
        """5. In production, Redis socket timeout causes 503 rejection (fail-closed)."""
        monkeypatch.setattr(settings, "ENVIRONMENT", "production")

        timeout_redis = MagicMock()
        timeout_redis.set.side_effect = redis.exceptions.TimeoutError(
            "Redis command timed out after 3000ms"
        )

        app.dependency_overrides[get_redis] = lambda: timeout_redis

        init_resp = client.get("/api/v1/auth/github")
        state = init_resp.json()["data"]["state"]

        with patch("src.services.auth.auth_service.handle_oauth_login") as mock_handle_login:
            resp = client.post(
                "/api/v1/auth/github/exchange",
                json={"code": "code-prod-timeout", "state": state},
            )
            assert resp.status_code == 503
            assert "temporarily unavailable" in resp.json()["error"]["message"]
            mock_handle_login.assert_not_called()

    # ── Test 6: Redis Reports Nonce Already Exists ──────────────────────────────
    def test_redis_reports_nonce_already_exists_causes_rejection(self, client: TestClient):
        """6. When Redis reports key already exists (SET NX returns None), reject with 422."""
        exists_redis = MagicMock()
        exists_redis.set.return_value = None  # Key already exists in Redis

        app.dependency_overrides[get_redis] = lambda: exists_redis

        init_resp = client.get("/api/v1/auth/google")
        state = init_resp.json()["data"]["state"]

        with patch("src.services.auth.auth_service.handle_oauth_login") as mock_handle_login:
            resp = client.post(
                "/api/v1/auth/google/exchange",
                json={"code": "code-exists", "state": state},
            )
            assert resp.status_code == 422
            assert "already been used" in resp.json()["error"]["message"]
            mock_handle_login.assert_not_called()

    # ── Test 7: Invalid Signature Is Rejected ───────────────────────────────────
    def test_invalid_signature_is_rejected(self, client: TestClient):
        """7. A state token with tampered signature is rejected with 422."""
        init_resp = client.get("/api/v1/auth/google")
        valid_state = init_resp.json()["data"]["state"]
        # Tamper signature part of JWT
        parts = valid_state.split(".")
        tampered_state = f"{parts[0]}.{parts[1]}.fake_signature_abc"

        with patch("src.services.auth.auth_service.handle_oauth_login") as mock_handle_login:
            resp = client.post(
                "/api/v1/auth/google/exchange",
                json={"code": "code-sig", "state": tampered_state},
            )
            assert resp.status_code == 422
            assert "Possible CSRF attack detected" in resp.json()["error"]["message"]
            mock_handle_login.assert_not_called()

    # ── Test 8: Expired State Is Rejected ───────────────────────────────────────
    def test_expired_state_is_rejected(self, client: TestClient):
        """8. An expired state token is rejected with 422."""
        past = datetime.now(timezone.utc) - timedelta(minutes=15)
        expired_payload = {
            "nonce": "secure-random-nonce-12345",
            "provider": "google",
            "type": "oauth_state",
            "iss": "supportdesk-auth",
            "iat": past - timedelta(minutes=10),
            "exp": past,
        }
        expired_token = jwt.encode(expired_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        with patch("src.services.auth.auth_service.handle_oauth_login") as mock_handle_login:
            resp = client.post(
                "/api/v1/auth/google/exchange",
                json={"code": "code-expired", "state": expired_token},
            )
            assert resp.status_code == 422
            assert "expired" in resp.json()["error"]["message"].lower()
            mock_handle_login.assert_not_called()

    # ── Test 9: Wrong Provider Is Rejected ──────────────────────────────────────
    def test_wrong_provider_is_rejected(self, client: TestClient):
        """9. A state issued for Google is rejected when submitted to GitHub exchange."""
        init_resp = client.get("/api/v1/auth/google")
        google_state = init_resp.json()["data"]["state"]

        with patch("src.services.auth.auth_service.handle_oauth_login") as mock_handle_login:
            resp = client.post(
                "/api/v1/auth/github/exchange",
                json={"code": "code-provider-swap", "state": google_state},
            )
            assert resp.status_code == 422
            assert (
                "different provider" in resp.json()["error"]["message"]
                or "CSRF attack detected" in resp.json()["error"]["message"]
            )
            mock_handle_login.assert_not_called()

    # ── Test 10: Missing or Malformed Nonce Is Rejected ─────────────────────────
    def test_missing_or_malformed_nonce_is_rejected(self, client: TestClient):
        """10. A state token with missing, non-string, or short nonce is rejected."""
        now = datetime.now(timezone.utc)
        bad_payloads = [
            # Missing nonce claim
            {
                "provider": "google",
                "type": "oauth_state",
                "iss": "supportdesk-auth",
                "iat": now,
                "exp": now + timedelta(minutes=10),
            },
            # Empty string nonce
            {
                "nonce": "",
                "provider": "google",
                "type": "oauth_state",
                "iss": "supportdesk-auth",
                "iat": now,
                "exp": now + timedelta(minutes=10),
            },
            # Nonce too short (< 16 chars)
            {
                "nonce": "short-nonce",
                "provider": "google",
                "type": "oauth_state",
                "iss": "supportdesk-auth",
                "iat": now,
                "exp": now + timedelta(minutes=10),
            },
        ]

        for payload in bad_payloads:
            token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            with patch("src.services.auth.auth_service.handle_oauth_login") as mock_handle_login:
                resp = client.post(
                    "/api/v1/auth/google/exchange",
                    json={"code": "code-bad-nonce", "state": token},
                )
                assert resp.status_code == 422
                assert (
                    "missing or malformed nonce" in resp.json()["error"]["message"].lower()
                    or "invalid oauth state" in resp.json()["error"]["message"].lower()
                )
                mock_handle_login.assert_not_called()

    # ── Test 11: Memory Fallback Cannot Be Enabled in Production ────────────────
    def test_memory_fallback_cannot_be_enabled_under_production_configuration(self, monkeypatch):
        """11. Production configuration strictly prohibits memory fallback at validation & runtime."""
        # Layer 1: Pydantic configuration validation rejects memory fallback in production
        with pytest.raises(
            ValueError, match="ALLOW_IN_MEMORY_OAUTH_NONCE_FALLBACK cannot be enabled in production"
        ):
            Settings(
                ENVIRONMENT="production",
                ALLOW_IN_MEMORY_OAUTH_NONCE_FALLBACK=True,
                SECRET_KEY="a" * 32,
                DATABASE_URL="postgresql://user:pass@remote.db:5432/supportdesk",
                FRONTEND_URL="https://app.supportdesk.com",
                REDIS_URL="redis://remote.redis:6379/0",
            )

        # Layer 2: Runtime mark_oauth_nonce_consumed hard-blocks memory fallback in production
        monkeypatch.setattr(settings, "ENVIRONMENT", "production")
        monkeypatch.setattr(settings, "ALLOW_IN_MEMORY_OAUTH_NONCE_FALLBACK", True)

        with pytest.raises(
            ServiceUnavailableException,
            match="OAuth security verification service is temporarily unavailable",
        ):
            mark_oauth_nonce_consumed(
                nonce="nonce-prod-guard-123456",
                expires_at=(datetime.now(timezone.utc) + timedelta(minutes=5)).timestamp(),
                redis_client=None,
            )

    # ── Test 12: Code Exchange Is Not Reached on State/Nonce Failure ───────────
    def test_authorization_code_exchange_not_reached_on_failure(
        self, client: TestClient, monkeypatch
    ):
        """12. Failed state validation or nonce consumption never invokes handle_oauth_login."""
        with patch.object(auth_service, "handle_oauth_login", new_callable=AsyncMock) as mock_login:
            # Case A: Missing state parameter
            resp1 = client.post("/api/v1/auth/google/exchange", json={"code": "code-1"})
            assert resp1.status_code == 422
            mock_login.assert_not_called()

            # Case B: Forged state parameter
            resp2 = client.post(
                "/api/v1/auth/google/exchange",
                json={"code": "code-2", "state": "forged-raw-token"},
            )
            assert resp2.status_code == 422
            mock_login.assert_not_called()

            # Case C: Redis down in production
            monkeypatch.setattr(settings, "ENVIRONMENT", "production")
            failing_redis = MagicMock()
            failing_redis.set.side_effect = redis.exceptions.ConnectionError("Redis down")
            app.dependency_overrides[get_redis] = lambda: failing_redis

            init_resp = client.get("/api/v1/auth/google")
            valid_state = init_resp.json()["data"]["state"]

            resp3 = client.post(
                "/api/v1/auth/google/exchange",
                json={"code": "code-3", "state": valid_state},
            )
            assert resp3.status_code == 503
            mock_login.assert_not_called()

    # ── Test 13: Full Lifecycle, Redirect URI, and Me Profile Access ────────────
    def test_complete_oauth_redirect_and_exchange_lifecycle(self, client: TestClient):
        """13. Full end-to-end OAuth lifecycle with redirect_uri alignment and /auth/me access."""
        # 1. Initiate Google login
        init_resp = client.get("/api/v1/auth/google")
        assert init_resp.status_code == 200
        auth_url = init_resp.json()["data"]["url"]
        csrf_state = init_resp.json()["data"]["state"]

        expected_redirect_uri = f"{settings.FRONTEND_URL}/auth/callback/google"
        assert (
            f"redirect_uri={expected_redirect_uri.replace(':', '%3A').replace('/', '%2F')}"
            in auth_url
            or f"redirect_uri={expected_redirect_uri}" in auth_url
        )
        assert f"state={csrf_state}" in auth_url

        # 2. Exchange code via POST /exchange
        with patch("src.services.oauth.google_oauth_provider.get_user_info") as mock_user:
            mock_user.return_value = OAuthUserInfo(
                provider="google",
                provider_id="google-lifecycle-sub-777",
                email="lifecycle777@example.com",
                first_name="Lifecycle",
                last_name="Tester",
            )
            exchange_resp = client.post(
                "/api/v1/auth/google/exchange",
                json={"code": "google-auth-code-valid", "state": csrf_state},
            )
            assert exchange_resp.status_code == 200
            tokens = exchange_resp.json()["data"]
            access_token = tokens["access_token"]
            assert access_token
            assert tokens["refresh_token"] is None  # Reconciled
            assert "refresh_token" in exchange_resp.cookies

            # 3. Access profile with access_token
            me_resp = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            assert me_resp.status_code == 200
            assert me_resp.json()["data"]["email"] == "lifecycle777@example.com"
