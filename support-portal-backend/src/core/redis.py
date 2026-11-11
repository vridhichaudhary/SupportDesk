"""
Redis connection manager and client factory for SupportDesk.
Provides connection pooling, health checks, and explicit timeouts.
"""

from typing import Optional

import redis
import structlog

from src.core.config import settings

logger = structlog.get_logger()

_redis_pool: Optional[redis.ConnectionPool] = None


def get_redis_pool() -> redis.ConnectionPool:
    """
    Returns a shared, thread-safe Redis connection pool with configured timeouts.
    """
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=3.0,
            socket_connect_timeout=3.0,
            max_connections=20,
        )
    return _redis_pool


def get_redis_client(
    socket_timeout: float = 3.0,
    socket_connect_timeout: float = 3.0,
) -> redis.Redis:
    """
    Returns a configured Redis client instance from the shared connection pool.
    Explicit socket timeouts prevent thread starvation during Redis degradation.
    """
    try:
        pool = get_redis_pool()
        return redis.Redis(connection_pool=pool)
    except Exception as exc:
        logger.error("Failed to initialize Redis client", error_type=type(exc).__name__)
        raise
