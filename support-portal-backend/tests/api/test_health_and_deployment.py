"""
Tests for production deployment readiness:
- Health check endpoints (/health, /live, /ready)
- Degraded Celery worker behavior (non-blocking web health probe)
- DATABASE_URL postgres:// to postgresql:// normalization
- Celery queue routing configuration
"""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from src.core.celery_app import celery_app
from src.core.config import Settings
from src.main import app
from src.services.health import health_service


@pytest.fixture
def client():
    return TestClient(app)


def test_database_url_normalization():
    """Verify postgres:// is converted to postgresql:// for SQLAlchemy 2.0."""
    # postgres://
    s1 = Settings(
        DATABASE_URL="postgres://user:pass@ep-test.oregon-postgres.render.com/dbname?sslmode=require"
    )
    assert (
        s1.DATABASE_URL
        == "postgresql://user:pass@ep-test.oregon-postgres.render.com/dbname?sslmode=require"
    )

    # postgresql:// remains unchanged
    s2 = Settings(DATABASE_URL="postgresql://user:pass@localhost:5432/dbname")
    assert s2.DATABASE_URL == "postgresql://user:pass@localhost:5432/dbname"


def test_cors_origin_regex_configuration():
    """Verify CORS_ORIGIN_REGEX is correctly accepted in Settings."""
    s = Settings(CORS_ORIGIN_REGEX=r"https://.*\.vercel\.app")
    assert s.CORS_ORIGIN_REGEX == r"https://.*\.vercel\.app"


def test_celery_task_routing():
    """Verify default queue is 'default' and tasks route to specific queues."""
    assert celery_app.conf.task_default_queue == "default"
    routes = celery_app.conf.task_routes
    assert routes["src.workers.document_tasks.*"]["queue"] == "document_processing"
    assert routes["src.workers.kb_tasks.*"]["queue"] == "document_processing"
    assert routes["src.workers.routing_tasks.*"]["queue"] == "routing"
    assert routes["src.workers.analytics_tasks.*"]["queue"] == "analytics"
    assert routes["src.workers.webhook_tasks.*"]["queue"] == "webhooks"


def test_health_liveness_endpoint(client):
    """Liveness probe always succeeds if process is alive."""
    resp = client.get("/live")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["database"] == "not_checked"


def test_health_readiness_healthy(client):
    """Readiness probe returns 200 when DB and Redis are healthy."""
    with (
        patch.object(health_service, "_ping_database", return_value="healthy"),
        patch.object(health_service, "_ping_redis", return_value="healthy"),
        patch.object(health_service, "_ping_celery", return_value="healthy"),
    ):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["database"] == "healthy"
        assert data["redis"] == "healthy"
        assert data["celery"] == "healthy"


def test_health_readiness_degraded_when_celery_down(client):
    """When Celery worker is offline, web API remains ready (200) with status 'degraded'."""
    with (
        patch.object(health_service, "_ping_database", return_value="healthy"),
        patch.object(health_service, "_ping_redis", return_value="healthy"),
        patch.object(health_service, "_ping_celery", return_value="unhealthy"),
    ):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "degraded"
        assert data["database"] == "healthy"
        assert data["redis"] == "healthy"
        assert data["celery"] == "unhealthy"


def test_health_readiness_fails_when_db_down(client):
    """Readiness probe returns 503 when Database is down."""
    with (
        patch.object(health_service, "_ping_database", return_value="unhealthy"),
        patch.object(health_service, "_ping_redis", return_value="healthy"),
        patch.object(health_service, "_ping_celery", return_value="healthy"),
    ):
        resp = client.get("/health")
        assert resp.status_code == 503
        data = resp.json()["detail"]
        assert data["status"] == "unhealthy"
        assert data["database"] == "unhealthy"


def test_health_readiness_fails_when_redis_down(client):
    """Readiness probe returns 503 when Redis is down."""
    with (
        patch.object(health_service, "_ping_database", return_value="healthy"),
        patch.object(health_service, "_ping_redis", return_value="unhealthy"),
        patch.object(health_service, "_ping_celery", return_value="healthy"),
    ):
        resp = client.get("/health")
        assert resp.status_code == 503
        data = resp.json()["detail"]
        assert data["status"] == "unhealthy"
        assert data["redis"] == "unhealthy"
