import uuid
from typing import List, Optional
from datetime import datetime

from pydantic import BaseModel, Field

from src.models import TicketStatus, TicketPriority, TicketCategory, TicketSource
from src.schemas.customer import CustomerResponse
from src.schemas.thread import ThreadResponse


class TicketBase(BaseModel):
    subject: str
    body: str
    priority: TicketPriority = TicketPriority.MEDIUM
    category: TicketCategory = TicketCategory.GENERAL
    source: TicketSource = TicketSource.WEB
    department_id: Optional[uuid.UUID] = None
    assigned_user_id: Optional[uuid.UUID] = None
    assigned_team_id: Optional[uuid.UUID] = None


class TicketCreate(TicketBase):
    customer_id: uuid.UUID
    created_by_id: Optional[uuid.UUID] = None
    ticket_number: str


class TicketUpdate(BaseModel):
    subject: Optional[str] = None
    category: Optional[TicketCategory] = None
    priority: Optional[TicketPriority] = None


class TicketAssign(BaseModel):
    assigned_user_id: Optional[uuid.UUID] = None
    assigned_team_id: Optional[uuid.UUID] = None


class TicketStatusUpdate(BaseModel):
    status: TicketStatus


class TicketPriorityUpdate(BaseModel):
    priority: TicketPriority


class TicketResponse(TicketBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    customer_id: uuid.UUID
    ticket_number: str
    status: TicketStatus
    created_by_id: Optional[uuid.UUID] = None
    merged_into_id: Optional[uuid.UUID] = None
    
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    sla_due_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TicketDetailResponse(TicketResponse):
    customer: Optional[CustomerResponse] = None
    threads: List[ThreadResponse] = []


class TicketReplyRequest(BaseModel):
    body: str
    is_internal: bool = False


class TicketMergeRequest(BaseModel):
    target_ticket_id: uuid.UUID


class BulkActionRequest(BaseModel):
    ticket_ids: List[uuid.UUID]
    
class BulkAssignRequest(BulkActionRequest):
    assigned_user_id: Optional[uuid.UUID] = None
    assigned_team_id: Optional[uuid.UUID] = None

class BulkStatusRequest(BulkActionRequest):
    status: TicketStatus
