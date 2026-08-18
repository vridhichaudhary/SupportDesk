"""
Team Schemas
============
Pydantic request/response models for the Team and TeamMember APIs.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from src.models import TeamStatus
from src.schemas.user import UserProfileResponse


class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    department_id: Optional[uuid.UUID] = None
    avatar_url: Optional[str] = Field(None, max_length=1024)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    max_capacity: int = Field(50, ge=1, le=500)
    default_sla: Optional[int] = Field(None, ge=1, description="Default SLA in hours")
    business_hours: Optional[Dict[str, Any]] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    department_id: Optional[uuid.UUID] = None
    avatar_url: Optional[str] = Field(None, max_length=1024)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    max_capacity: Optional[int] = Field(None, ge=1, le=500)
    default_sla: Optional[int] = Field(None, ge=1)
    business_hours: Optional[Dict[str, Any]] = None
    status: Optional[TeamStatus] = None


class TeamResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    department_id: Optional[uuid.UUID] = None
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    color: Optional[str] = None
    status: TeamStatus
    max_capacity: int
    current_capacity: int
    default_sla: Optional[int] = None
    business_hours: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeamListResponse(BaseModel):
    items: List[TeamResponse]
    total: int
    skip: int
    limit: int


class TeamMemberCreate(BaseModel):
    user_id: uuid.UUID
    is_primary: bool = False


class TeamMemberResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    user_id: uuid.UUID
    is_primary: bool
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeamMemberWithUserResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    user_id: uuid.UUID
    is_primary: bool
    joined_at: datetime
    user: Optional[UserProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)
