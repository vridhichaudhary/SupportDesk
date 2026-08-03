import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.models import UserRole


# ── User Profile Response ──────────────────────────────────────────────────
class UserProfileResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    email: EmailStr
    role: UserRole
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    job_title: Optional[str] = None
    bio: Optional[str] = None
    timezone: str = "UTC"
    preferred_language: str = "en"
    theme_preference: str = "system"
    notification_preferences: Dict[str, Any] = {}
    is_email_verified: bool = False
    is_active: bool = True
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── User Profile Update Request ─────────────────────────────────────────────
class UserUpdateProfileRequest(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    display_name: Optional[str] = Field(None, max_length=100)
    job_title: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = Field(None, max_length=1000)
    timezone: Optional[str] = Field(None, max_length=50)
    preferred_language: Optional[str] = Field(None, max_length=10)
    theme_preference: Optional[str] = Field(None, max_length=20)


# ── User Preferences Update Request ────────────────────────────────────────
class UserPreferencesUpdateRequest(BaseModel):
    theme_preference: Optional[str] = Field(None, max_length=20)
    preferred_language: Optional[str] = Field(None, max_length=10)
    timezone: Optional[str] = Field(None, max_length=50)
    notification_preferences: Optional[Dict[str, Any]] = None
