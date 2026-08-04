import uuid
from typing import Optional
from datetime import datetime

from pydantic import BaseModel
from src.models import ThreadType


class ThreadBase(BaseModel):
    body: str


class ThreadCreate(ThreadBase):
    ticket_id: uuid.UUID
    thread_type: ThreadType
    sender_user_id: Optional[uuid.UUID] = None
    sender_customer_id: Optional[uuid.UUID] = None


class ThreadUpdate(BaseModel):
    body: str


class ThreadResponse(ThreadBase):
    id: uuid.UUID
    ticket_id: uuid.UUID
    thread_type: ThreadType
    sender_user_id: Optional[uuid.UUID] = None
    sender_customer_id: Optional[uuid.UUID] = None
    is_edited: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
