"""
HealthService — Production-grade health & readiness logic.

Used by:
  - /api/v1/health  (versioned, backward-compatible)
  - /health         (root-level, preferred by Render / Kubernetes probes)

Checks performed:
  - Database connectivity (SELECT 1)
  - Redis connectivity    (PING)

Metadata emitted:
  - version, environment, uptime_seconds, timestamp, hostname
"""

import socket
import time
from datetime import datetime, timezone

import redis as redis_lib
import structlog
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.core.config import settings

logger = structlog.get_logger()

# Module-level start time so uptime is measured from first import (app startup).
_APP_START_TIME: float = time.monotonic()

APP_VERSION = "1.0.0"


class HealthResult:
    """
    Lightweight data container produced by HealthService.
    Not a Pydantic model — keeps the service decoupled from schema details.
    """

    def __init__(
        self,
        *,
        is_live: bool,
        is_ready: bool,
        database: str,
        redis: str,
    ) -> None:
        self.is_live = is_live
        self.is_ready = is_ready
        self.database = database
        self.redis = redis
        self.version = APP_VERSION
        self.environment = settings.ENVIRONMENT
        self.uptime_seconds = round(time.monotonic() - _APP_START_TIME, 2)
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.hostname = socket.gethostname()

    @property
    def overall_status(self) -> str:
        return "healthy" if (self.is_live and self.is_ready) else "unhealthy"

    def to_dict(self) -> dict:
        return {
            "status": self.overall_status,
            "version": self.version,
            "environment": self.environment,
            "database": self.database,
            "redis": self.redis,
            "uptime_seconds": self.uptime_seconds,
            "timestamp": self.timestamp,
            "hostname": self.hostname,
        }


class HealthService:
    """
    Single source of truth for all health / readiness logic.
    Instantiated once and injected into routers.
    """

    # ------------------------------------------------------------------ #
    # Liveness — "is the process alive?"
    # ------------------------------------------------------------------ #
    def check_liveness(self) -> HealthResult:
        """
        Liveness probe: only verifies the process itself is running.
        Does NOT check external dependencies.

        Use for:
          - Kubernetes livenessProbe
          - Docker HEALTHCHECK (minimal)

        Never return 503 for liveness unless the process is fundamentally broken.
        """
        return HealthResult(
            is_live=True,
            is_ready=True,   # liveness doesn't gate readiness
            database="not_checked",
            redis="not_checked",
        )

    # ------------------------------------------------------------------ #
    # Readiness — "can the app serve traffic?"
    # ------------------------------------------------------------------ #
    def check_readiness(
        self,
        db: Session,
        redis_client: redis_lib.Redis,
    ) -> HealthResult:
        """
        Readiness probe: verifies all critical external dependencies.
        Returns 503 if ANY dependency is unavailable.

        Use for:
          - Render health check path
          - Kubernetes readinessProbe
          - Uptime monitors (Better Uptime, UptimeRobot, etc.)
        """
        db_status = self._ping_database(db)
        redis_status = self._ping_redis(redis_client)

        is_ready = db_status == "healthy" and redis_status == "healthy"

        return HealthResult(
            is_live=True,
            is_ready=is_ready,
            database=db_status,
            redis=redis_status,
        )

    # ------------------------------------------------------------------ #
    # Private helpers
    # ------------------------------------------------------------------ #
    def _ping_database(self, db: Session) -> str:
        try:
            db.execute(text("SELECT 1"))
            return "healthy"
        except Exception as exc:
            logger.warning("Database health check failed", error=str(exc))
            return "unhealthy"

    def _ping_redis(self, redis_client: redis_lib.Redis) -> str:
        try:
            redis_client.ping()
            return "healthy"
        except Exception as exc:
            logger.warning("Redis health check failed", error=str(exc))
            return "unhealthy"


# Single shared instance — no state, safe to reuse.
health_service = HealthService()
