import uuid
from typing import Generator, Optional

import redis
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.database import SessionLocal
from src.core.exceptions import AuthenticationException
from src.core.security import decode_access_token
from src.models import User
from src.repositories.user import user_repository

security_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency that yields a database session and ensures it is closed after request.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_redis() -> Generator[redis.Redis, None, None]:
    """
    Dependency that yields a Redis client.
    """
    client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        yield client
    finally:
        client.close()


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise AuthenticationException("Not authenticated")

    token = credentials.credentials
    payload = decode_access_token(token)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise AuthenticationException("Invalid authentication credentials")

    user = user_repository.get_by_id(db, uuid.UUID(user_id_str))
    if not user or not user.is_active:
        raise AuthenticationException("User account is inactive or disabled")

    return user


def get_authenticated_user(current_user: User = Depends(get_current_user)) -> User:
    """Enforces active user authentication."""
    return current_user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Extracts authenticated user if token present, or returns None for guest access."""
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id_str = payload.get("sub")
        if user_id_str:
            return user_repository.get_by_id(db, uuid.UUID(user_id_str))
    except Exception:
        pass
    return None


def get_current_organization_id(
    current_user: Optional[User] = Depends(get_optional_user),
) -> uuid.UUID:
    """
    Returns the organization ID of the authenticated user.
    Falls back to NovaCart demo org ID for guest demo access.
    """
    if current_user:
        return current_user.organization_id
    # Default NovaCart demo organization ID for unauthenticated guest mode
    return uuid.UUID("a4e2a617-12d9-4029-a078-8504fb813521")
