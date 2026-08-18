"""
Automation Rules API — CRUD for configuring routing rules.
"""

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.core.dependencies import get_current_user, get_db
from src.models import User
from src.services.automation import automation_service

router = APIRouter(prefix="/automation", tags=["automation"])


# ─── Schemas ──────────────────────────────────────────────────────────────────


class AutomationRuleCreate(BaseModel):
    name: str = Field(..., min_length=2)
    trigger_event: str = Field(default="TICKET_CREATED")
    conditions_json: Dict[str, Any] = Field(default_factory=dict)
    actions_json: Dict[str, Any] = Field(...)
    is_active: bool = True


class AutomationRuleUpdate(BaseModel):
    name: Optional[str] = None
    trigger_event: Optional[str] = None
    conditions_json: Optional[Dict[str, Any]] = None
    actions_json: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class AutomationRuleResponse(BaseModel):
    id: uuid.UUID
    name: str
    trigger_event: str
    conditions_json: Optional[Dict]
    actions_json: Dict
    is_active: bool
    created_at: Any
    updated_at: Any


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get(
    "/rules", response_model=List[AutomationRuleResponse], summary="List all automation rules"
)
def list_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rules = automation_service.list_rules(db, current_user.organization_id)
    return [
        AutomationRuleResponse(
            id=r.id,
            name=r.name,
            trigger_event=r.trigger_event,
            conditions_json=r.conditions_json,
            actions_json=r.actions_json,
            is_active=r.is_active,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rules
    ]


@router.post(
    "/rules",
    response_model=AutomationRuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an automation rule",
)
def create_rule(
    data: AutomationRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = automation_service.create_rule(
        db,
        current_user.organization_id,
        data.name,
        data.trigger_event,
        data.conditions_json,
        data.actions_json,
        data.is_active,
    )
    return AutomationRuleResponse(
        id=rule.id,
        name=rule.name,
        trigger_event=rule.trigger_event,
        conditions_json=rule.conditions_json,
        actions_json=rule.actions_json,
        is_active=rule.is_active,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
    )


@router.patch(
    "/rules/{rule_id}", response_model=AutomationRuleResponse, summary="Update an automation rule"
)
def update_rule(
    rule_id: uuid.UUID,
    data: AutomationRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    rule = automation_service.update_rule(db, current_user.organization_id, rule_id, updates)
    return AutomationRuleResponse(
        id=rule.id,
        name=rule.name,
        trigger_event=rule.trigger_event,
        conditions_json=rule.conditions_json,
        actions_json=rule.actions_json,
        is_active=rule.is_active,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
    )


@router.delete(
    "/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an automation rule"
)
def delete_rule(
    rule_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    automation_service.delete_rule(db, current_user.organization_id, rule_id)
    return None
