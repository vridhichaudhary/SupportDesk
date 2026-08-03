import hashlib
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import jwt
from passlib.context import CryptContext

from src.core.config import settings
from src.core.exceptions import ValidationException

# Argon2 Password Hashing Context
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# JWT Configuration
JWT_SECRET = settings.SECRET_KEY
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7


# -------------------------------------------------------------------
# Password Hashing & Verification
# -------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Hashes a plain password using Argon2id."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against an Argon2 hash."""
    return pwd_context.verify(plain_password, hashed_password)


def validate_password_complexity(password: str) -> None:
    """
    Validates password complexity:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 digit
    - At least 1 special character
    """
    if len(password) < 8:
        raise ValidationException("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise ValidationException("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValidationException("Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        raise ValidationException("Password must contain at least one number")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise ValidationException("Password must contain at least one special character")


# -------------------------------------------------------------------
# Token Hashing (SHA-256 for Sessions & Opaque Tokens)
# -------------------------------------------------------------------
def hash_token(token: str) -> str:
    """Generates a SHA-256 hash of an opaque token or refresh token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_opaque_token() -> str:
    """Generates a secure random 32-byte hexadecimal token string."""
    return os.urandom(32).hex()


# -------------------------------------------------------------------
# JWT Tokens
# -------------------------------------------------------------------
def create_access_token(
    user_id: uuid.UUID,
    organization_id: uuid.UUID,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {
        "sub": str(user_id),
        "org_id": str(organization_id),
        "role": role,
        "type": "access",
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(
    user_id: uuid.UUID,
    organization_id: uuid.UUID,
    session_id: uuid.UUID,
    expires_delta: Optional[timedelta] = None,
) -> Tuple[str, str, datetime]:
    """
    Returns (raw_refresh_token, hashed_token, expiration_datetime).
    """
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    raw_token = f"{session_id}.{generate_opaque_token()}"
    payload = {
        "sub": str(user_id),
        "org_id": str(organization_id),
        "sid": str(session_id),
        "type": "refresh",
        "iat": now,
        "exp": expire,
    }
    encoded_token = jwt.encode(payload, f"{JWT_SECRET}:{raw_token}", algorithm=JWT_ALGORITHM)
    token_hash = hash_token(encoded_token)
    return encoded_token, token_hash, expire.replace(tzinfo=None)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise ValidationException("Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise ValidationException("Access token has expired") from None
    except jwt.InvalidTokenError:
        raise ValidationException("Invalid authentication token") from None
