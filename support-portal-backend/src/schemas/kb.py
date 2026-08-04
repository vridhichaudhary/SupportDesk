import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from src.models import KBArticleStatus, VisibilityLevel


# ── Category Schemas ────────────────────────────────────────────────────────

class KBCategoryBase(BaseModel):
    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=255)
    description: Optional[str] = None
    display_order: int = 0
    parent_id: Optional[uuid.UUID] = None

class KBCategoryCreate(KBCategoryBase):
    pass

class KBCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    display_order: Optional[int] = None
    parent_id: Optional[uuid.UUID] = None

class KBCategoryResponse(KBCategoryBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Article Version Schemas ─────────────────────────────────────────────────

class KBArticleVersionResponse(BaseModel):
    id: uuid.UUID
    article_id: uuid.UUID
    editor_id: Optional[uuid.UUID] = None
    version_number: int
    title: str
    content: str
    summary: Optional[str] = None
    edit_reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Article Schemas ─────────────────────────────────────────────────────────

class KBArticleBase(BaseModel):
    title: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=255)
    summary: Optional[str] = None
    content: str
    category_id: Optional[uuid.UUID] = None
    visibility: VisibilityLevel = VisibilityLevel.INTERNAL

class KBArticleCreate(KBArticleBase):
    pass

class KBArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    summary: Optional[str] = None
    content: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    visibility: Optional[VisibilityLevel] = None
    edit_reason: Optional[str] = None

class KBArticleWorkflowUpdate(BaseModel):
    status: KBArticleStatus

class KBArticleResponse(KBArticleBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    author_id: Optional[uuid.UUID] = None
    reviewer_id: Optional[uuid.UUID] = None
    status: KBArticleStatus
    version: int
    reading_time_minutes: int
    views: int
    helpful_count: int
    not_helpful_count: int
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class KBArticleListResponse(BaseModel):
    items: List[KBArticleResponse]
    total: int
    page: int
    size: int
    pages: int
