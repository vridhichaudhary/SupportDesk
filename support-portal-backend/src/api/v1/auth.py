from typing import List, Optional

import structlog
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from src.core.dependencies import get_current_user, get_db
from src.core.responses import ErrorResponse, SuccessResponse
from src.models import User
from src.repositories.session import session_repository
from src.schemas.auth import (
    ChangePasswordRequest,
    CustomerSignupRequest,
    ForgotPasswordRequest,
    LoginRequest,
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
    },
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
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 3600,
        samesite="lax",
        secure=False,
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
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 3600,
        samesite="lax",
        secure=False,
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

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 3600,
        samesite="lax",
        secure=False,
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
        response.set_cookie(
            key="refresh_token",
            value=new_refresh,
            httponly=True,
            max_age=7 * 24 * 3600,
            samesite="lax",
            secure=False,
        )

    return SuccessResponse(
        data=TokenResponse(
            access_token=new_access,
            expires_in=900,
            refresh_token=new_refresh,
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
    auth_service.logout(db, token_str or "", current_user.id)
    response.delete_cookie(key="refresh_token")
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
    sessions = session_repository.get_user_sessions(db, current_user.id)
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
    auth_service.revoke_all_sessions(db, current_user.id)
    return SuccessResponse(data={"message": "All sessions revoked successfully"})


# ── OAuth Routes ────────────────────────────────────────────────────────────
@router.get(
    "/google",
    summary="Get Google OAuth Authorization URL",
)
def get_google_auth_url() -> SuccessResponse[dict]:
    url = google_oauth_provider.get_authorization_url(state="google-state")
    return SuccessResponse(data={"url": url})


@router.get(
    "/google/callback",
    response_model=SuccessResponse[TokenResponse],
    summary="Google OAuth Callback",
)
async def google_callback(
    code: str,
    response: Response,
    db: Session = Depends(get_db),
) -> SuccessResponse[TokenResponse]:
    user, access_token, refresh_token = await auth_service.handle_oauth_login(db, "google", code)
    response.set_cookie(
        key="refresh_token", value=refresh_token, httponly=True, max_age=7 * 24 * 3600
    )
    return SuccessResponse(
        data=TokenResponse(access_token=access_token, refresh_token=refresh_token)
    )


@router.get(
    "/github",
    summary="Get GitHub OAuth Authorization URL",
)
def get_github_auth_url() -> SuccessResponse[dict]:
    url = github_oauth_provider.get_authorization_url(state="github-state")
    return SuccessResponse(data={"url": url})


@router.get(
    "/github/callback",
    response_model=SuccessResponse[TokenResponse],
    summary="GitHub OAuth Callback",
)
async def github_callback(
    code: str,
    response: Response,
    db: Session = Depends(get_db),
) -> SuccessResponse[TokenResponse]:
    user, access_token, refresh_token = await auth_service.handle_oauth_login(db, "github", code)
    response.set_cookie(
        key="refresh_token", value=refresh_token, httponly=True, max_age=7 * 24 * 3600
    )
    return SuccessResponse(
        data=TokenResponse(access_token=access_token, refresh_token=refresh_token)
    )
