import uuid
from typing import Any, Dict
from datetime import datetime

from sqlalchemy.orm import Session
from src.models import EventLog

class EventBus:
    """
    Internal event bus that persists events and triggers asynchronous webhook deliveries.
    """
    def publish(
        self, 
        db: Session, 
        organization_id: uuid.UUID, 
        event_type: str, 
        payload: Dict[str, Any], 
        target_id: str = None, 
        actor_id: uuid.UUID = None
    ) -> EventLog:
        # 1. Persist the event for audit logging
        event_log = EventLog(
            organization_id=organization_id,
            event_type=event_type,
            target_id=target_id,
            actor_id=actor_id,
            payload_json=payload
        )
        db.add(event_log)
        db.commit()
        db.refresh(event_log)
        
        # 2. Trigger asynchronous webhook delivery
        try:
            from src.workers.webhook_tasks import deliver_webhook_task
            deliver_webhook_task.delay(str(event_log.id))
        except Exception as e:
            import structlog
            structlog.get_logger().error("Failed to enqueue webhook task", error=str(e), event_id=str(event_log.id))
            
        return event_log


event_bus = EventBus()
