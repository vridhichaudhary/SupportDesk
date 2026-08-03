import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict

from src.models import ActionType


class AuditLogBase(BaseModel):
    organization_id: uuid.UUID
    actor_id: Optional[uuid.UUID] = None
    action_type: ActionType
    entity_type: str
    entity_id: uuid.UUID
    changes_json: Optional[Dict[str, Any]] = None


class AuditLogCreate(AuditLogBase):
    pass


class AuditLogUpdate(BaseModel):
    pass


class AuditLogResponse(AuditLogBase):
    id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
