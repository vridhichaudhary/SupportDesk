import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl

from src.models import OrganizationStatus


class OrganizationSettings(BaseModel):
    working_days: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    business_hours_start: str = "09:00"
    business_hours_end: str = "17:00"
    default_language: str = "en"
    supported_languages: List[str] = ["en"]
    ai_enabled: bool = True
    ai_confidence_threshold: float = 0.85
    auto_assignment_enabled: bool = False
    auto_reply_enabled: bool = False
    knowledge_search_enabled: bool = True
    sla_enabled: bool = False
    notification_preferences: Dict[str, Any] = {"email": True, "slack": False}
    theme: str = "light"
    brand_color: str = "#000000"

    model_config = ConfigDict(extra="ignore")


class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    industry: Optional[str] = Field(None, max_length=255)
    domain: Optional[str] = Field(None, max_length=255)
    timezone: str = "UTC"
    support_email: Optional[EmailStr] = None
    support_phone: Optional[str] = Field(None, max_length=50)
    website: Optional[HttpUrl] = None
    address: Optional[str] = None
    logo_url: Optional[HttpUrl] = None


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    industry: Optional[str] = Field(None, max_length=255)
    domain: Optional[str] = Field(None, max_length=255)
    timezone: Optional[str] = None
    support_email: Optional[EmailStr] = None
    support_phone: Optional[str] = Field(None, max_length=50)
    website: Optional[HttpUrl] = None
    address: Optional[str] = None
    logo_url: Optional[HttpUrl] = None
    status: Optional[OrganizationStatus] = None


class OrganizationResponse(OrganizationBase):
    id: uuid.UUID
    status: OrganizationStatus
    settings: dict
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardSummaryResponse(BaseModel):
    total_teams: int
    total_agents: int
    total_customers: int
    total_tickets: int
    knowledge_articles: int
    open_tickets: int
    resolved_tickets: int
    ai_usage: int
