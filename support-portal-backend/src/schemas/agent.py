"""
Agent Schemas
=============
Pydantic schemas for AgentProfile, Skills, Availability, Working Hours,
and Presence data.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from src.models import AgentStatus, ProficiencyLevel, SkillCategory

# ─────────────────────────────────────────────────────────────────────────────
# Skill
# ─────────────────────────────────────────────────────────────────────────────


class SkillCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: SkillCategory = SkillCategory.OTHER


class SkillResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    description: Optional[str] = None
    category: SkillCategory
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# Agent Skill Assignment
# ─────────────────────────────────────────────────────────────────────────────


class AgentSkillAssign(BaseModel):
    skill_id: uuid.UUID
    proficiency_level: ProficiencyLevel = ProficiencyLevel.BEGINNER
    years_of_experience: Optional[int] = Field(None, ge=0, le=50)


class AgentSkillResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    skill_id: uuid.UUID
    proficiency_level: ProficiencyLevel
    years_of_experience: Optional[int] = None
    is_active: bool
    skill: Optional[SkillResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# Agent Profile
# ─────────────────────────────────────────────────────────────────────────────


class AgentProfileUpdate(BaseModel):
    agent_code: Optional[str] = Field(None, max_length=50)
    employee_id: Optional[str] = Field(None, max_length=100)
    experience_level: Optional[ProficiencyLevel] = None
    languages_spoken: Optional[List[str]] = None
    max_concurrent_tickets: Optional[int] = Field(None, ge=1, le=100)
    max_daily_tickets: Optional[int] = Field(None, ge=1, le=500)


class AgentProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    agent_code: Optional[str] = None
    employee_id: Optional[str] = None
    experience_level: Optional[ProficiencyLevel] = None
    languages_spoken: List[str] = []
    max_concurrent_tickets: int
    current_active_tickets: int
    max_daily_tickets: int
    current_daily_tickets: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# Availability
# ─────────────────────────────────────────────────────────────────────────────


class AvailabilityUpdate(BaseModel):
    status: AgentStatus
    expected_return: Optional[datetime] = None


class AvailabilityResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    status: AgentStatus
    since: datetime
    expected_return: Optional[datetime] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# Working Hours
# ─────────────────────────────────────────────────────────────────────────────


class WorkingHoursUpdate(BaseModel):
    timezone: str = Field(..., max_length=50)
    working_days: List[str] = Field(
        ...,
        description="List of day names e.g. ['Monday','Tuesday',...]",
    )
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    shifts: Optional[List[Dict[str, Any]]] = None
    lunch_break_start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    lunch_break_end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")


class WorkingHoursResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    timezone: str
    working_days: List[str]
    start_time: str
    end_time: str
    shifts: Optional[List[Dict[str, Any]]] = None
    lunch_break_start: Optional[str] = None
    lunch_break_end: Optional[str] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# Presence
# ─────────────────────────────────────────────────────────────────────────────


class HeartbeatRequest(BaseModel):
    device_info: Optional[str] = Field(None, max_length=255)


class PresenceResponse(BaseModel):
    status: AgentStatus
    is_online: bool
    since: Optional[str] = None
    device_info: Optional[str] = None
    expected_return: Optional[str] = None


class TeamPresenceResponse(BaseModel):
    presence: Dict[str, PresenceResponse]
