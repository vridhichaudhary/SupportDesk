"""
Root-level health endpoints — /health, /live, /ready

These sit outside the /api/v1 prefix for infrastructure compatibility:

  /health → Full readiness check (Render health check path, uptime monitors)
  /ready  → Readiness probe (Kubernetes readinessProbe)
  /live   → Liveness probe  (Kubernetes livenessProbe, Docker HEALTHCHECK)

All logic is shared with /api/v1/health via the same HealthService.
No logic is duplicated here.
"""

import redis as redis_lib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.api.v1.health import HealthResponse, _raise_if_unhealthy
from src.core.dependencies import get_db, get_redis
from src.services.health import health_service

# No prefix — these are mounted directly at the application root.
router = APIRouter(tags=["System"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Root health check (Render / Uptime monitors)",
    description=(
        "Full readiness check at the root path. "
        "Checks database and Redis. Returns `200` or `503`. "
        "**Recommended for: Render health check path, UptimeRobot, Better Uptime.**"
    ),
)
@router.get(
    "/ready",
    response_model=HealthResponse,
    summary="Root readiness probe (Kubernetes readinessProbe)",
    description=(
        "Verifies all external dependencies are reachable. "
        "Returns `503` if app is not ready to serve traffic. "
        "**Recommended for: Kubernetes readinessProbe.**"
    ),
)
def root_readiness(
    db: Session = Depends(get_db),
    redis_client: redis_lib.Redis = Depends(get_redis),
) -> HealthResponse:
    result = health_service.check_readiness(db, redis_client)
    _raise_if_unhealthy(result)
    return HealthResponse.from_result(result)


@router.get(
    "/live",
    response_model=HealthResponse,
    summary="Root liveness probe (Kubernetes livenessProbe / Docker)",
    description=(
        "Verifies the process is alive. Does NOT check external dependencies. "
        "Returns `200` as long as the Python process is running. "
        "**Recommended for: Kubernetes livenessProbe, Docker HEALTHCHECK.**"
    ),
)
def root_liveness() -> HealthResponse:
    result = health_service.check_liveness()
    return HealthResponse.from_result(result)
