import secrets
from typing import Any, List, Optional

import redis
import structlog
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.dependencies import get_current_user, get_db, get_redis
from src.core.exceptions import ValidationException
from src.core.redis import get_redis_client
from src.core.responses import ErrorResponse, SuccessResponse
from src.core.security import (
    create_oauth_state_token,
    decode_and_verify_oauth_state_token,
    mark_oauth_nonce_consumed,
)
from src.models import User
from src.repositories.session import session_repository
from src.schemas.auth import (
    ChangePasswordRequest,
    CustomerSignupRequest,
    ForgotPasswordRequest,
    LoginRequest,
    OAuthExchangeRequest,
    OwnerSignupRequest,
    RefreshTokenRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserSessionResponse,
)
from src.schemas.user import UserProfileResponse
from src.services.auth import auth_service
from src.services.oauth import github_oauth_provider, google_oauth_provider

logger = structlog.get_logger()

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        422: {"model": ErrorResponse, "description": "Validation Error"},
        503: {"model": ErrorResponse, "description": "Service Unavailable"},
    },
)


# ── Cookie Configuration Helpers ────────────────────────────────────────────
def _is_secure_cookie() -> bool:
    """Return True if cookies must be marked Secure (HTTPS environments)."""
    return settings.ENVIRONMENT.lower() in ("production", "staging")


def _get_cookie_samesite() -> str:
    """
    Return appropriate SameSite attribute.
    In cross-site decoupled topologies (e.g. Vercel frontend on *.vercel.app and Render
    backend on *.onrender.com), cookies must use SameSite="none" and Secure=True to be
    transmitted on cross-origin credentialed requests.
    In local development over plain HTTP, browsers reject SameSite=None without Secure,
    so SameSite="lax" is used for localhost.
    """
    if _is_secure_cookie():
        return "none"
    return "lax"


def _set_auth_cookie(
    response: Response,
    key: str,
    value: str,
    max_age: int,
    path: str = "/",
    httponly: bool = True,
) -> None:
    """Set an authenticated HTTP-Only cookie with cross-site compatible policy."""
    response.set_cookie(
        key=key,
        value=value,
        httponly=httponly,
        samesite=_get_cookie_samesite(),
        secure=_is_secure_cookie(),
        max_age=max_age,
        path=path,
    )


def _delete_auth_cookie(response: Response, key: str, path: str = "/") -> None:
    """Delete an authentication cookie matching the active cross-site attributes."""
    response.delete_cookie(
        key=key,
        path=path,
        httponly=True,
        samesite=_get_cookie_samesite(),
        secure=_is_secure_cookie(),
    )


# ── Owner Signup ────────────────────────────────────────────────────────────
@router.post(
    "/signup",
    response_model=SuccessResponse[TokenResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Sign up as an Organization Owner",
    description="Provisions a new tenant organization and owner user account.",
)
def signup(
    payload: OwnerSignupRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> SuccessResponse[TokenResponse]:
    logger.info("Owner signup attempt", email=payload.email, org=payload.organization_name)
    user, org, access_token, refresh_token = auth_service.signup_owner(db, payload)

    # Set HTTP-Only Cookie for Refresh Token
    _set_auth_cookie(
        response=response,
        key="refresh_token",
        value=refresh_token,
        max_age=7 * 24 * 3600,
        path="/",
        httponly=True,
    )

    return SuccessResponse(
        data=TokenResponse(
            access_token=access_token,
            expires_in=900,
            refresh_token=refresh_token,
        )
    )


# ── Customer Signup ─────────────────────────────────────────────────────────
@router.post(
    "/customer-signup",
    response_model=SuccessResponse[TokenResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Sign up as a Customer",
    description="Registers a new customer for the support portal.",
)
def customer_signup(
    payload: CustomerSignupRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> SuccessResponse[TokenResponse]:
    logger.info("Customer signup attempt", email=payload.email)
    user, org, access_token, refresh_token = auth_service.signup_customer(db, payload)

    # Set HTTP-Only Cookie for Refresh Token
    _set_auth_cookie(
        response=response,
        key="refresh_token",
        value=refresh_token,
        max_age=7 * 24 * 3600,
        path="/",
        httponly=True,
    )

    return SuccessResponse(
        data=TokenResponse(
            access_token=access_token,
            expires_in=900,
            refresh_token=refresh_token,
        )
    )


# ── Login ───────────────────────────────────────────────────────────────────
@router.post(
    "/login",
    response_model=SuccessResponse[TokenResponse],
    summary="Log in with email and password",
)
def login(
    payload: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
) -> SuccessResponse[TokenResponse]:
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    user, access_token, refresh_token = auth_service.login(
        db, payload.email, payload.password, user_agent=user_agent, ip_address=ip_address
    )

    _set_auth_cookie(
        response=response,
        key="refresh_token",
        value=refresh_token,
        max_age=7 * 24 * 3600,
        path="/",
        httponly=True,
    )

    return SuccessResponse(
        data=TokenResponse(
            access_token=access_token,
            expires_in=900,
            refresh_token=refresh_token,
        )
    )


# ── Token Refresh ───────────────────────────────────────────────────────────
@router.post(
    "/refresh",
    response_model=SuccessResponse[TokenResponse],
    summary="Refresh access token with refresh token rotation",
)
def refresh_token(
    payload: Optional[RefreshTokenRequest] = None,
    refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    response: Response = None,
    db: Session = Depends(get_db),
) -> SuccessResponse[TokenResponse]:
    token_str = (
        payload.refresh_token if payload and payload.refresh_token else None
    ) or refresh_token_cookie
    if not token_str:
        raise HTTPException(status_code=401, detail="Refresh token required")

    new_access, new_refresh = auth_service.refresh_access_token(db, token_str)

    if response:
        _set_auth_cookie(
            response=response,
            key="refresh_token",
            value=new_refresh,
            max_age=7 * 24 * 3600,
            path="/",
            httponly=True,
        )

    return SuccessResponse(
        data=TokenResponse(
            access_token=new_access,
            expires_in=900,
            refresh_token=new_refresh if (payload and payload.refresh_token) else None,
        )
    )


# ── Logout ──────────────────────────────────────────────────────────────────
@router.post(
    "/logout",
    response_model=SuccessResponse[dict],
    summary="Log out of current session",
)
def logout(
    response: Response,
    payload: Optional[RefreshTokenRequest] = None,
    refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuccessResponse[dict]:
    token_str = (
        payload.refresh_token if payload and payload.refresh_token else None
    ) or refresh_token_cookie
    auth_service.logout(db, token_str or "", current_user.id)  # type: ignore[arg-type]
    _delete_auth_cookie(response, key="refresh_token", path="/")
    return SuccessResponse(data={"message": "Logged out successfully"})


# ── Current User Profile (Me) ───────────────────────────────────────────────
@router.get(
    "/me",
    response_model=SuccessResponse[UserProfileResponse],
    summary="Get authenticated user details",
)
def get_me(current_user: User = Depends(get_current_user)) -> SuccessResponse[UserProfileResponse]:
    return SuccessResponse(data=UserProfileResponse.model_validate(current_user))


# ── Email Verification ──────────────────────────────────────────────────────
@router.get(
    "/verify-email",
    response_model=SuccessResponse[dict],
    summary="Verify email address with token",
)
def verify_email(token: str, db: Session = Depends(get_db)) -> SuccessResponse[dict]:
    auth_service.verify_email(db, token)
    return SuccessResponse(data={"message": "Email address verified successfully"})


@router.post(
    "/resend-verification",
    response_model=SuccessResponse[dict],
    summary="Resend verification email",
)
def resend_verification(
    payload: ResendVerificationRequest, db: Session = Depends(get_db)
) -> SuccessResponse[dict]:
    auth_service.resend_verification_email(db, payload.email)
    return SuccessResponse(
        data={"message": "If an account exists, a verification link has been sent"}
    )


# ── Password Reset Flow ─────────────────────────────────────────────────────
@router.post(
    "/forgot-password",
    response_model=SuccessResponse[dict],
    summary="Request password reset email",
)
def forgot_password(
    payload: ForgotPasswordRequest, db: Session = Depends(get_db)
) -> SuccessResponse[dict]:
    auth_service.forgot_password(db, payload.email)
    return SuccessResponse(
        data={"message": "If an account exists, password reset instructions have been sent"}
    )


@router.post(
    "/reset-password",
    response_model=SuccessResponse[dict],
    summary="Reset password using reset token",
)
def reset_password(
    payload: ResetPasswordRequest, db: Session = Depends(get_db)
) -> SuccessResponse[dict]:
    auth_service.reset_password(db, payload.token, payload.new_password)
    return SuccessResponse(
        data={"message": "Password reset successfully. Please log in with your new password."}
    )


@router.post(
    "/change-password",
    response_model=SuccessResponse[dict],
    summary="Change password (authenticated)",
)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuccessResponse[dict]:
    from src.services.user import user_service

    user_service.change_password(db, current_user, payload.current_password, payload.new_password)
    return SuccessResponse(data={"message": "Password changed successfully"})


# ── Sessions Management ─────────────────────────────────────────────────────
@router.get(
    "/sessions",
    response_model=SuccessResponse[List[UserSessionResponse]],
    summary="List active sessions across devices",
)
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuccessResponse[List[UserSessionResponse]]:
    sessions = session_repository.get_user_sessions(db, current_user.id)  # type: ignore[arg-type]
    return SuccessResponse(data=[UserSessionResponse.model_validate(s) for s in sessions])


@router.post(
    "/sessions/revoke-all",
    response_model=SuccessResponse[dict],
    summary="Revoke all active sessions across devices",
)
def revoke_all_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuccessResponse[dict]:
    auth_service.revoke_all_sessions(db, current_user.id)  # type: ignore[arg-type]
    return SuccessResponse(data={"message": "All sessions revoked successfully"})


# ── OAuth Helpers & Routes ──────────────────────────────────────────────────
def _generate_oauth_state(
    response: Response, provider: str, user_state: Optional[str] = None
) -> str:
    """
    Generates a cryptographically signed HMAC-SHA256 OAuth state token and
    sets an HttpOnly defense-in-depth cookie configured for cross-site compatibility.
    """
    state = create_oauth_state_token(provider=provider, expires_minutes=10)
    _set_auth_cookie(
        response=response,
        key=f"oauth_state_{provider}",
        value=state,
        max_age=600,
        path="/",
        httponly=True,
    )
    return state


def _verify_oauth_state(
    request: Request,
    response: Response,
    provider: str,
    incoming_state: Optional[str],
    redis_client: Optional[Any] = None,
) -> None:
    """
    Validates the incoming OAuth state parameter using a dual-layer strategy:
    1. If a cookie is present (same-origin or browsers supporting cross-site cookies),
       it is compared to the incoming state to protect against CSRF.
    2. Cryptographic signature and expiration are verified on the signed state token,
       and the cryptographic nonce is atomically consumed in Redis (single-use anti-replay).
       This guarantees robust security even when cross-site cookies are stripped by
       browsers under SameSite=Lax rules or third-party cookie blocking (Safari ITP).
    """
    if not incoming_state:
        raise ValidationException("Missing OAuth state parameter. CSRF validation failed.")

    cookie_name = f"oauth_state_{provider}"
    cookie_state = request.cookies.get(cookie_name)
    # Invalidate cookie immediately to prevent replay
    _delete_auth_cookie(response, key=cookie_name, path="/")

    # Layer 1: Defense-in-depth cookie comparison when cookie was transmitted
    if cookie_state:
        if not secrets.compare_digest(incoming_state, cookie_state):
            raise ValidationException(
                "Invalid OAuth state parameter. Possible CSRF attack detected."
            )

    # Layer 2: Stateless cryptographic verification & single-use replay protection
    token_payload = decode_and_verify_oauth_state_token(incoming_state, expected_provider=provider)
    nonce = token_payload.get("nonce")
    exp = float(token_payload.get("exp", 0))

    if redis_client is None:
        try:
            redis_client = get_redis_client()
        except Exception:
            redis_client = None

    consumed = mark_oauth_nonce_consumed(nonce, exp, redis_client=redis_client)
    if not consumed:
        raise ValidationException(
            "OAuth state parameter has already been used. Replay attack prevented."
        )


@router.get(
    "/google",
    summary="Get Google OAuth Authorization URL",
)
def get_google_auth_url(response: Response, state: Optional[str] = None) -> SuccessResponse[dict]:
    csrf_state = _generate_oauth_state(response, "google", state)
    url = google_oauth_provider.get_authorization_url(state=csrf_state)
    return SuccessResponse(data={"url": url, "state": csrf_state})


@router.get(
    "/google/callback",
    response_model=SuccessResponse[TokenResponse],
    summary="Google OAuth Callback (GET)",
)
async def google_callback(
    code: str,
    request: Request,
    response: Response,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
) -> SuccessResponse[TokenResponse]:
    _verify_oauth_state(request, response, "google", state, redis_client=redis_client)
    user, access_token, refresh_token = await auth_service.handle_oauth_login(db, "google", code)
    _set_auth_cookie(
        response=response,
        key="refresh_token",
        value=refresh_token,
        max_age=7 * 24 * 3600,
        path="/",
        httponly=True,
    )
    return SuccessResponse(data=TokenResponse(access_token=access_token, refresh_token=None))


@router.post(
    "/google/exchange",
    response_model=SuccessResponse[TokenResponse],
    summary="Google OAuth Token Exchange (POST)",
)
async def google_exchange(
    payload: OAuthExchangeRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
) -> SuccessResponse[TokenResponse]:
    _verify_oauth_state(request, response, "google", payload.state, redis_client=redis_client)
    user, access_token, refresh_token = await auth_service.handle_oauth_login(
        db, "google", payload.code
    )
    _set_auth_cookie(
        response=response,
        key="refresh_token",
        value=refresh_token,
        max_age=7 * 24 * 3600,
        path="/",
        httponly=True,
    )
    return SuccessResponse(data=TokenResponse(access_token=access_token, refresh_token=None))


@router.get(
    "/github",
    summary="Get GitHub OAuth Authorization URL",
)
def get_github_auth_url(response: Response, state: Optional[str] = None) -> SuccessResponse[dict]:
    csrf_state = _generate_oauth_state(response, "github", state)
    url = github_oauth_provider.get_authorization_url(state=csrf_state)
    return SuccessResponse(data={"url": url, "state": csrf_state})


@router.get(
    "/github/callback",
    response_model=SuccessResponse[TokenResponse],
    summary="GitHub OAuth Callback (GET)",
)
async def github_callback(
    code: str,
    request: Request,
    response: Response,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
) -> SuccessResponse[TokenResponse]:
    _verify_oauth_state(request, response, "github", state, redis_client=redis_client)
    user, access_token, refresh_token = await auth_service.handle_oauth_login(db, "github", code)
    _set_auth_cookie(
        response=response,
        key="refresh_token",
        value=refresh_token,
        max_age=7 * 24 * 3600,
        path="/",
        httponly=True,
    )
    return SuccessResponse(data=TokenResponse(access_token=access_token, refresh_token=None))


@router.post(
    "/github/exchange",
    response_model=SuccessResponse[TokenResponse],
    summary="GitHub OAuth Token Exchange (POST)",
)
async def github_exchange(
    payload: OAuthExchangeRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
) -> SuccessResponse[TokenResponse]:
    _verify_oauth_state(request, response, "github", payload.state, redis_client=redis_client)
    user, access_token, refresh_token = await auth_service.handle_oauth_login(
        db, "github", payload.code
    )
    _set_auth_cookie(
        response=response,
        key="refresh_token",
        value=refresh_token,
        max_age=7 * 24 * 3600,
        path="/",
        httponly=True,
    )
    return SuccessResponse(data=TokenResponse(access_token=access_token, refresh_token=None))
