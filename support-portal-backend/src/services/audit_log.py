import uuid
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from src.models import ActionType
from src.repositories.audit_log import audit_log_repository
from src.schemas.audit_log import AuditLogCreate


class AuditLogService:
    def log_action(
        self,
        db: Session,
        organization_id: uuid.UUID,
        action_type: ActionType,
        entity_type: str,
        entity_id: uuid.UUID,
        actor_id: Optional[uuid.UUID] = None,
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
