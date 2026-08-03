import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ── Owner Signup Request ───────────────────────────────────────────────────
class OwnerSignupRequest(BaseModel):
    organization_name: str = Field(
        ..., min_length=2, max_length=255, description="Name of the new tenant organization"
    )
    industry: Optional[str] = Field(None, max_length=100)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr = Field(..., description="Owner email address")
    password: str = Field(
        ..., min_length=8, description="Must contain uppercase, lowercase, digit, and special char"
    )


# ── Login Request ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


# ── Token Response ─────────────────────────────────────────────────────────
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 900  # 15 minutes
    refresh_token: Optional[str] = None  # set in cookie or response body


# ── Refresh Token Request ──────────────────────────────────────────────────
class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


# ── Password Change / Reset Requests ──────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


# ── Session Response ───────────────────────────────────────────────────────
class UserSessionResponse(BaseModel):
    id: uuid.UUID
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    last_accessed_at: datetime
    is_current: bool = False

    model_config = ConfigDict(from_attributes=True)
