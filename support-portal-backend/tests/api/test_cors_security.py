"""
Tests for CORS security and origin validation:
- Approved explicit origins allow preflight and credentialed requests
- Scoped Vercel preview subdomains are allowed when matching regex
- Arbitrary unapproved origins and arbitrary third-party Vercel domains are blocked
- Credentials (cookies, Authorization) header validation
"""

import pytest
from fastapi.testclient import TestClient

from src.core.config import settings
from src.core.factory import create_app


@pytest.fixture
def client():
    original_origins = list(settings.BACKEND_CORS_ORIGINS)
    original_regex = settings.CORS_ORIGIN_REGEX

    settings.BACKEND_CORS_ORIGINS = ["http://localhost:3000", "http://localhost:3001"]
    settings.CORS_ORIGIN_REGEX = (
        r"^https:\/\/(supportdesk|support-portal-frontend)(-[a-zA-Z0-9-]+)?\.vercel\.app$"
    )

    test_app = create_app()
    yield TestClient(test_app)

    settings.BACKEND_CORS_ORIGINS = original_origins
    settings.CORS_ORIGIN_REGEX = original_regex


class TestCORSSecurity:
    def test_preflight_options_approved_origin(self, client: TestClient):
        """Preflight OPTIONS request from approved origin returns 200 with CORS headers."""
        headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type,Authorization",
        }
        resp = client.options("/api/v1/auth/login", headers=headers)
        assert resp.status_code == 200
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"
        assert resp.headers.get("access-control-allow-credentials") == "true"
        assert "POST" in resp.headers.get("access-control-allow-methods", "")

    def test_get_request_approved_origin_sets_headers(self, client: TestClient):
        """Simple GET request from approved origin receives Access-Control-Allow-Origin."""
        resp = client.get("/live", headers={"Origin": "http://localhost:3000"})
        assert resp.status_code == 200
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"
        assert resp.headers.get("access-control-allow-credentials") == "true"

    def test_matching_scoped_vercel_preview_origin_allowed(self, client: TestClient):
        """Requests from scoped preview deployments matching the project prefix are allowed."""
        preview_origin = "https://supportdesk-preview-pr-42.vercel.app"
        resp = client.get("/live", headers={"Origin": preview_origin})
        assert resp.status_code == 200
        assert resp.headers.get("access-control-allow-origin") == preview_origin
        assert resp.headers.get("access-control-allow-credentials") == "true"

    def test_unapproved_external_origin_blocked(self, client: TestClient):
        """Requests from unauthorized external origins do NOT receive Access-Control-Allow-Origin."""
        resp = client.get("/live", headers={"Origin": "https://malicious-attacker.com"})
        assert "access-control-allow-origin" not in resp.headers

    def test_arbitrary_unscoped_vercel_domain_blocked(self, client: TestClient):
        """Arbitrary third-party .vercel.app projects not matching project scope are rejected."""
        unrelated_origin = "https://random-attacker-app.vercel.app"
        resp = client.get("/live", headers={"Origin": unrelated_origin})
        assert "access-control-allow-origin" not in resp.headers
