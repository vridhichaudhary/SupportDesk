import uuid
from typing import Generator, Optional

import redis
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.database import SessionLocal
from src.core.exceptions import AuthenticationException
from src.core.security import decode_access_token, verify_api_key
from src.models import User, APIKey
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


# -------------------------------------------------------------------
# Public API & Webhook Dependencies
# -------------------------------------------------------------------
from fastapi import Header
from datetime import datetime, timezone

def get_api_key(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> APIKey:
    """
    Validates either 'X-API-Key' or 'Authorization: Bearer <api_key>'.
    """
    token = x_api_key
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        
    if not token:
        raise AuthenticationException("API Key missing")
        
    if not token.startswith("sd_live_"):
        raise AuthenticationException("Invalid API Key format")
        
    # Look up by prefix (first 12 chars: sd_live_XXXX)
    prefix = token[:12]
    api_key_record = db.query(APIKey).filter(
        APIKey.prefix == prefix,
        APIKey.is_active == True
    ).first()
    
    if not api_key_record:
        raise AuthenticationException("Invalid API Key")
        
    # Verify exact secret
    if not verify_api_key(token, api_key_record.hashed_secret):
        raise AuthenticationException("Invalid API Key")
        
    # Verify Expiration
    if api_key_record.expires_at and api_key_record.expires_at < datetime.utcnow():
        raise AuthenticationException("API Key expired")
        
    # Update last used (we can defer this to a background task in high scale, but for now it's fine)
    api_key_record.last_used_at = datetime.utcnow()
    db.commit()
    
    return api_key_record


def get_current_user_or_api_key(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> dict:
    """
    Allows endpoints to be used by either logged in UI users or programmatic API keys.
    Returns: {"user": User, "api_key": None} OR {"user": None, "api_key": APIKey}
    """
    # 1. Try API Key first if provided
    if x_api_key or (authorization and authorization.startswith("Bearer sd_live_")):
        api_key = get_api_key(authorization, x_api_key, db)
        return {"user": None, "api_key": api_key, "org_id": api_key.organization_id}
        
    # 2. Try User JWT
    try:
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=authorization.split(" ")[1]) if authorization else None
        user = get_current_user(credentials, db)
        return {"user": user, "api_key": None, "org_id": user.organization_id}
    except Exception as e:
        raise AuthenticationException("Not authenticated")

