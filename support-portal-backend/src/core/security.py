import hashlib
import hmac
import os
import re
import secrets
import string
import threading
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import jwt
import redis.exceptions
import structlog
from passlib.context import CryptContext

from src.core.config import settings
from src.core.exceptions import (
    AuthenticationException,
    ServiceUnavailableException,
    ValidationException,
)

logger = structlog.get_logger()


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
            raise AuthenticationException("Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationException("Access token has expired") from None
    except jwt.InvalidTokenError:
        raise AuthenticationException("Invalid authentication token") from None


# -------------------------------------------------------------------
# API Keys (Integration Platform)
# -------------------------------------------------------------------


def generate_api_key() -> Tuple[str, str]:
    """
    Generates a secure API key and its hashed version.
    Returns: (plain_key, hashed_key)
    """
    alphabet = string.ascii_letters + string.digits
    secret = "".join(secrets.choice(alphabet) for _ in range(48))
    plain_key = f"sd_live_{secret}"
    hashed_key = hash_token(plain_key)  # Reuse SHA-256 for fast/secure matching
    return plain_key, hashed_key


def verify_api_key(plain_key: str, hashed_key: str) -> bool:
    """Verifies an API key against its hash."""
    # Constant-time string comparison for security
    return secrets.compare_digest(hash_token(plain_key), hashed_key)


# -------------------------------------------------------------------
# Webhook Signatures
# -------------------------------------------------------------------
def generate_webhook_signature(payload: str, secret: str) -> str:
    """
    Generates an HMAC SHA256 signature for a webhook payload.
    """
    mac = hmac.new(secret.encode("utf-8"), msg=payload.encode("utf-8"), digestmod=hashlib.sha256)
    return f"sha256={mac.hexdigest()}"


def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    """
    Verifies an incoming webhook signature.
    """
    expected = generate_webhook_signature(payload, secret)
    return hmac.compare_digest(expected, signature)


# -------------------------------------------------------------------
# OAuth State Security (Cross-Site Resistant CSRF & Replay Protection)
# -------------------------------------------------------------------
_consumed_oauth_nonces: Dict[str, float] = {}
_memory_nonce_lock = threading.Lock()

REDIS_OAUTH_NONCE_PREFIX = "supportdesk:oauth:nonce:"


def create_oauth_state_token(provider: str, expires_minutes: int = 10) -> str:
    """
    Generates a cryptographically signed, tamper-proof, single-use OAuth state token.
    Compatible with cross-site SPA topologies (e.g. Vercel frontend + Render backend)
    where cross-site cookies may be blocked or restricted by browsers.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expires_minutes)
    nonce = secrets.token_urlsafe(16)
    payload = {
        "nonce": nonce,
        "provider": provider,
        "type": "oauth_state",
        "iss": "supportdesk-auth",
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_and_verify_oauth_state_token(token: str, expected_provider: str) -> Dict[str, Any]:
    """
    Decodes and validates an OAuth state token.
    Verifies signature, expiration, type, provider match, and nonce integrity.
    """
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "iat", "nonce", "provider", "type"]},
        )
        if payload.get("type") != "oauth_state":
            raise ValidationException("Invalid OAuth state token type")
        if payload.get("provider") != expected_provider:
            raise ValidationException("OAuth state was issued for a different provider")
        nonce = payload.get("nonce")
        if not nonce or not isinstance(nonce, str) or len(nonce.strip()) < 16:
            raise ValidationException("Invalid OAuth state parameter: missing or malformed nonce.")
        iss = payload.get("iss")
        if iss and iss != "supportdesk-auth":
            raise ValidationException("Invalid OAuth state issuer")
        return payload
    except jwt.ExpiredSignatureError:
        raise ValidationException(
            "OAuth state parameter has expired. Please sign in again."
        ) from None
    except jwt.InvalidTokenError:
        raise ValidationException(
            "Invalid OAuth state parameter. Possible CSRF attack detected."
        ) from None


def mark_oauth_nonce_consumed(
    nonce: str, expires_at: float, redis_client: Optional[Any] = None
) -> bool:
    """
    Atomically records an OAuth state nonce as consumed to prevent replay attacks.

    Security Contract:
    1. In production, Redis is MANDATORY. If Redis is unavailable, times out,
       or returns an unexpected response, this function raises ServiceUnavailableException (fail-closed).
    2. Atomic single-use consumption is enforced via Redis `SET key 1 NX EX ttl`.
    3. Replayed nonces return False, which caller translates to 422 Replay Attack Prevented.
    4. An in-memory fallback exists ONLY for local development / testing and is
       HARD-DISABLED in production configurations.
    5. No sensitive credentials, tokens, or codes are logged.
    """
    if not nonce or not isinstance(nonce, str) or len(nonce.strip()) < 16:
        raise ValidationException("Invalid OAuth state parameter: missing or malformed nonce.")

    now = datetime.now(timezone.utc).timestamp()
    ttl = int(expires_at - now)
    if ttl <= 0:
        raise ValidationException("OAuth state parameter has expired. Please sign in again.")

    # Bound TTL between 1 second and 15 minutes (900s)
    ttl = min(max(1, ttl), 900)
    redis_key = f"{REDIS_OAUTH_NONCE_PREFIX}{nonce}"

    is_production = settings.ENVIRONMENT.lower() in ("production", "staging")

    # -------------------------------------------------------------
    # 1. Primary Path: Distributed Redis Atomic Consumption
    # -------------------------------------------------------------
    if redis_client is not None:
        try:
            acquired = redis_client.set(redis_key, "1", ex=ttl, nx=True)
            if acquired is True:
                return True
            if acquired is False or acquired is None:
                # Key already exists in Redis -> Replay attack!
                return False
            # Unexpected return value from Redis
            logger.error("Unexpected response from Redis during OAuth nonce consumption")
            raise ServiceUnavailableException(
                "OAuth replay protection service returned an unexpected result. Please try again."
            )
        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError) as net_err:
            logger.error(
                "Redis connection error during OAuth nonce consumption",
                error_type=type(net_err).__name__,
                env=settings.ENVIRONMENT,
            )
            if is_production or not settings.ALLOW_IN_MEMORY_OAUTH_NONCE_FALLBACK:
                raise ServiceUnavailableException(
                    "OAuth security verification service is temporarily unavailable. Please try again."
                ) from net_err
        except redis.exceptions.RedisError as r_err:
            logger.error(
                "Redis server error during OAuth nonce consumption",
                error_type=type(r_err).__name__,
                env=settings.ENVIRONMENT,
            )
            if is_production or not settings.ALLOW_IN_MEMORY_OAUTH_NONCE_FALLBACK:
                raise ServiceUnavailableException(
                    "OAuth security verification service is temporarily unavailable. Please try again."
                ) from r_err

    # -------------------------------------------------------------
    # 2. Production Fail-Closed Enforcement
    # -------------------------------------------------------------
    if is_production:
        logger.error(
            "OAuth state exchange blocked: Redis is required in production but unavailable",
            env=settings.ENVIRONMENT,
        )
        raise ServiceUnavailableException(
            "OAuth security verification service is temporarily unavailable. Please try again."
        )

    # -------------------------------------------------------------
    # 3. Development / Test In-Memory Fallback (Guarded & Thread-Safe)
    # -------------------------------------------------------------
    if not settings.ALLOW_IN_MEMORY_OAUTH_NONCE_FALLBACK:
        raise ServiceUnavailableException(
            "OAuth replay protection requires Redis. Set ALLOW_IN_MEMORY_OAUTH_NONCE_FALLBACK=True for local dev."
        )

    with _memory_nonce_lock:
        current_time = datetime.now(timezone.utc).timestamp()
        expired_keys = [k for k, exp in _consumed_oauth_nonces.items() if exp < current_time]
        for k in expired_keys:
            _consumed_oauth_nonces.pop(k, None)

        if nonce in _consumed_oauth_nonces:
            return False

        _consumed_oauth_nonces[nonce] = expires_at
        return True
