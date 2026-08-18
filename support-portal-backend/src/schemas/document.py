import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from src.models import DocumentStatus

# ── Document Chunk Schemas ──────────────────────────────────────────────────


class DocumentChunkResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    chunk_index: int
    content: str
    section_title: Optional[str] = None
    page_number: Optional[int] = None
    character_count: int
    word_count: int
    content_hash: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentChunkListResponse(BaseModel):
    items: List[DocumentChunkResponse]
    total: int


# ── Document Schemas ────────────────────────────────────────────────────────


class DocumentBase(BaseModel):
    title: str
    original_filename: str
    file_url: str
    mime_type: str
    file_size: int
    page_count: Optional[int] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)


class DocumentResponse(DocumentBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    uploader_id: Optional[uuid.UUID] = None
    status: DocumentStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
