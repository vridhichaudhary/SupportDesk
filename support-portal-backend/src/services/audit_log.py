import uuid
from typing import Any, Dict, Optional, Union

from sqlalchemy.orm import Session

from src.models import ActionType
from src.repositories.audit_log import audit_log_repository
from src.schemas.audit_log import AuditLogCreate

# UUIDLike accepts both native uuid.UUID and SQLAlchemy 1.4 Column[UUID] values.
# Callers pass model attribute values (Column-typed) which are actual UUIDs at runtime.
UUIDLike = Union[uuid.UUID, Any]


class AuditLogService:
    def log_action(
        self,
        db: Session,
        organization_id: UUIDLike,
        action_type: ActionType,
        entity_type: str,
        entity_id: UUIDLike,
        actor_id: Optional[UUIDLike] = None,
        changes: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Records an action in the immutable activity timeline.
        """
        audit_log_in = AuditLogCreate(
            organization_id=organization_id,
            actor_id=actor_id,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            changes_json=changes,
        )
        audit_log_repository.create(db, obj_in=audit_log_in, organization_id=organization_id)


audit_log_service = AuditLogService()
