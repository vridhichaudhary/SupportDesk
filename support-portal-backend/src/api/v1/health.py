"""
Versioned health endpoints — /api/v1/health, /api/v1/health/live, /api/v1/health/ready

Kept for backward compatibility. All logic lives in HealthService.

Recommended usage:
  - /api/v1/health/ready → Render health check path
  - /api/v1/health/live  → Kubernetes livenessProbe
  - /api/v1/health/ready → Kubernetes readinessProbe
"""

import redis as redis_lib
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.core.dependencies import get_db, get_redis
from src.services.health import HealthResult, health_service

router = APIRouter(prefix="/health", tags=["System"])


# ------------------------------------------------------------------ #
# Response schema
# ------------------------------------------------------------------ #
class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    database: str
    redis: str
    uptime_seconds: float
    timestamp: str
    hostname: str

    model_config = {"from_attributes": True}

    @classmethod
    def from_result(cls, result: HealthResult) -> "HealthResponse":
        return cls(**result.to_dict())


def _raise_if_unhealthy(result: HealthResult) -> None:
    if not result.is_ready:
        raise HTTPException(status_code=503, detail=result.to_dict())


# ------------------------------------------------------------------ #
# Endpoints
# ------------------------------------------------------------------ #
@router.get(
    "",
    response_model=HealthResponse,
    summary="Full health check",
    description=(
        "Checks database and Redis connectivity. Returns `200 healthy` or `503 unhealthy`. "
        "**Use this endpoint for Render health checks and uptime monitors.**"
    ),
)
@router.get(
    "/ready",
    response_model=HealthResponse,
    summary="Readiness probe",
    description=(
        "Verifies all external dependencies are reachable. "
        "Returns `503` if the app cannot serve traffic. "
        "**Use for Kubernetes readinessProbe and Render health check path.**"
    ),
)
def readiness(
    db: Session = Depends(get_db),
    redis_client: redis_lib.Redis = Depends(get_redis),
) -> HealthResponse:
    result = health_service.check_readiness(db, redis_client)
    _raise_if_unhealthy(result)
    return HealthResponse.from_result(result)


@router.get(
    "/live",
    response_model=HealthResponse,
    summary="Liveness probe",
    description=(
        "Verifies the process is running. Does **not** check external dependencies. "
        "Returns `200` as long as the process is alive. "
        "**Use for Kubernetes livenessProbe and Docker HEALTHCHECK.**"
    ),
)
def liveness() -> HealthResponse:
    result = health_service.check_liveness()
    return HealthResponse.from_result(result)
