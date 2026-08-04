import uuid
from typing import Optional, Dict, Any
from datetime import datetime

from pydantic import BaseModel, EmailStr


class CustomerBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    timezone: str = "UTC"
    language: str = "en"
    metadata_json: Optional[Dict[str, Any]] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None


class CustomerResponse(CustomerBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    is_vip: bool
    total_tickets: int
    avg_satisfaction: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
