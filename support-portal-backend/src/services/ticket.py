import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

from sqlalchemy.orm import Session

from src.models import (
    Ticket, TicketStatus, ThreadType, ActionType, User, TicketTimeline, TicketMerge
)
from src.core.exceptions import ValidationException, NotFoundException
from src.core.ticket_states import is_valid_transition
from src.repositories.ticket import ticket_repository
from src.repositories.thread import thread_repository
from src.repositories.customer import customer_repository
from src.schemas.ticket import TicketCreate, TicketUpdate, BulkAssignRequest, BulkStatusRequest
from src.schemas.thread import ThreadCreate
from src.services.base import BaseService


class TicketService(BaseService[Ticket, TicketCreate, TicketUpdate]):
    def __init__(self):
        super().__init__(ticket_repository)

    def _create_timeline_event(
        self, db: Session, ticket_id: uuid.UUID, event_type: str, 
        actor_user_id: Optional[uuid.UUID] = None, event_data: Optional[Dict] = None
    ):
        event = TicketTimeline(
            ticket_id=ticket_id,
            actor_user_id=actor_user_id,
            event_type=event_type,
            event_data=event_data or {}
        )
        db.add(event)

    def _log_audit(
        self, db: Session, org_id: uuid.UUID, actor_id: uuid.UUID, 
        action: ActionType, entity_id: uuid.UUID, changes: Dict
    ):
        from src.models import AuditLog
        log = AuditLog(
            organization_id=org_id,
            actor_id=actor_id,
            action_type=action,
            entity_type="Ticket",
            entity_id=entity_id,
            changes_json=changes
        )
        db.add(log)

    def create_ticket(
        self, db: Session, obj_in: TicketCreate, organization_id: uuid.UUID, actor_id: uuid.UUID
    ) -> Ticket:
        # Generate ticket number if not provided
        if not obj_in.ticket_number:
            obj_in.ticket_number = self.repository.generate_ticket_number(db, organization_id)
            
        ticket = self.repository.create(db, obj_in, organization_id)
        
        # Initial Thread Message
        thread_in = ThreadCreate(
            ticket_id=ticket.id,
            thread_type=ThreadType.CUSTOMER_REPLY,
            body=obj_in.body,
            sender_user_id=obj_in.created_by_id
        )
        thread_repository.create(db, thread_in, organization_id)
        
        # Timeline and Audit
        self._create_timeline_event(db, ticket.id, "TICKET_CREATED", actor_user_id=actor_id)
        self._log_audit(db, organization_id, actor_id, ActionType.TICKET_CREATED, ticket.id, {"status": ticket.status.value})
        
        db.commit()
        db.refresh(ticket)
        return ticket

    def assign_ticket(
        self, db: Session, ticket_id: uuid.UUID, org_id: uuid.UUID, actor_id: uuid.UUID,
        assigned_user_id: Optional[uuid.UUID], assigned_team_id: Optional[uuid.UUID]
    ) -> Ticket:
        ticket = self.get_or_404(db, ticket_id, org_id)
        
        old_user = str(ticket.assigned_user_id)
        old_team = str(ticket.assigned_team_id)
        
        ticket.assigned_user_id = assigned_user_id
        ticket.assigned_team_id = assigned_team_id
        
        # State transition to ASSIGNED if currently NEW or OPEN
        if ticket.status in [TicketStatus.NEW, TicketStatus.OPEN] and (assigned_user_id or assigned_team_id):
            ticket.status = TicketStatus.ASSIGNED
            
        db.add(ticket)
        
        # Events
        changes = {
            "old_user": old_user, "new_user": str(assigned_user_id),
            "old_team": old_team, "new_team": str(assigned_team_id)
        }
        self._create_timeline_event(db, ticket.id, "TICKET_ASSIGNED", actor_id, changes)
        self._log_audit(db, org_id, actor_id, ActionType.TICKET_ASSIGNED, ticket.id, changes)
        
        db.commit()
        db.refresh(ticket)
        return ticket

    def update_status(
        self, db: Session, ticket_id: uuid.UUID, org_id: uuid.UUID, actor_id: uuid.UUID, new_status: TicketStatus
    ) -> Ticket:
        ticket = self.get_or_404(db, ticket_id, org_id)
        
        if not is_valid_transition(ticket.status, new_status):
            raise ValidationException(f"Invalid state transition from {ticket.status.value} to {new_status.value}")
            
        old_status = ticket.status
        ticket.status = new_status
        
        if new_status == TicketStatus.RESOLVED:
            ticket.resolved_at = datetime.utcnow()
        elif new_status == TicketStatus.CLOSED:
            ticket.closed_at = datetime.utcnow()
            
        db.add(ticket)
        
        changes = {"old_status": old_status.value, "new_status": new_status.value}
        self._create_timeline_event(db, ticket.id, "TICKET_STATUS_CHANGED", actor_id, changes)
        self._log_audit(db, org_id, actor_id, ActionType.TICKET_STATUS_CHANGED, ticket.id, changes)
        
        db.commit()
        db.refresh(ticket)
        return ticket

    def reply(
        self, db: Session, ticket_id: uuid.UUID, org_id: uuid.UUID, actor_id: uuid.UUID, 
        body: str, is_internal: bool = False
    ) -> Ticket:
        ticket = self.get_or_404(db, ticket_id, org_id)
        
        thread_type = ThreadType.INTERNAL_NOTE if is_internal else ThreadType.AGENT_REPLY
        thread_in = ThreadCreate(
            ticket_id=ticket.id,
            thread_type=thread_type,
            body=body,
            sender_user_id=actor_id
        )
        thread_repository.create(db, thread_in, org_id)
        
        if not is_internal and ticket.status in [TicketStatus.NEW, TicketStatus.ASSIGNED, TicketStatus.REOPENED]:
             # Auto transition to pending customer
             self.update_status(db, ticket.id, org_id, actor_id, TicketStatus.PENDING_CUSTOMER)
             
        self._create_timeline_event(db, ticket.id, "REPLY_ADDED", actor_id, {"is_internal": is_internal})
        db.refresh(ticket)
        return ticket

    def merge_tickets(
        self, db: Session, source_id: uuid.UUID, target_id: uuid.UUID, org_id: uuid.UUID, actor_id: uuid.UUID
    ) -> Ticket:
        source_ticket = self.get_or_404(db, source_id, org_id)
        target_ticket = self.get_or_404(db, target_id, org_id)
        
        if source_id == target_id:
            raise ValidationException("Cannot merge a ticket into itself")
            
        merge_record = TicketMerge(
            source_ticket_id=source_id,
            target_ticket_id=target_id,
            merged_by_id=actor_id
        )
        db.add(merge_record)
        
        # Soft delete source
        source_ticket.deleted_at = datetime.utcnow()
        source_ticket.merged_into_id = target_id
        source_ticket.status = TicketStatus.CLOSED
        db.add(source_ticket)
        
        # Move threads
        from src.models import TicketThread
        db.execute(
            TicketThread.__table__.update()
            .where(TicketThread.ticket_id == source_id)
            .values(ticket_id=target_id)
        )
        
        self._create_timeline_event(db, target_ticket.id, "TICKET_MERGED_IN", actor_id, {"source_id": str(source_id)})
        self._create_timeline_event(db, source_ticket.id, "TICKET_MERGED_OUT", actor_id, {"target_id": str(target_id)})
        
        db.commit()
        db.refresh(target_ticket)
        return target_ticket


ticket_service = TicketService()
