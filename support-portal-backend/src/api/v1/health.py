import redis
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.core.dependencies import get_db, get_redis
from src.core.responses import SuccessResponse

router = APIRouter(prefix="/health", tags=["System"])


class HealthStatus(BaseModel):
    status: str
    database: str
    redis: str


@router.get("", response_model=SuccessResponse[HealthStatus])
@router.get("/ready", response_model=SuccessResponse[HealthStatus])
@router.get("/live", response_model=SuccessResponse[HealthStatus])
def health_check(db: Session = Depends(get_db), redis_client: redis.Redis = Depends(get_redis)):
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "failed"

    redis_status = "ok"
    try:
        redis_client.ping()
    except Exception:
        redis_status = "failed"

    status = "healthy" if db_status == "ok" and redis_status == "ok" else "unhealthy"

    return SuccessResponse(data=HealthStatus(status=status, database=db_status, redis=redis_status))
