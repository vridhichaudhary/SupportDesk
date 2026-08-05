import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.core.permissions import permission_engine
from src.models import Document, DocumentChunk, DocumentStatus, User
from src.schemas.document import DocumentChunkListResponse, DocumentListResponse, DocumentResponse
from src.services.storage import document_storage_provider
from src.workers.document_tasks import process_document_task

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a document for processing",
)
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Uploads a file, saves it to storage, creates a Document record,
    and enqueues a background task for processing.
    """
    if not permission_engine.has_permission(
        db, None, current_user.id, current_user.role, current_user.organization_id, "upload_documents"
    ):
        raise HTTPException(status_code=403, detail="Not authorized to upload documents")

    # Validate file extension
    allowed_types = [
        "application/pdf", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
        "text/plain", 
        "text/markdown"
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: PDF, DOCX, TXT, MD. Got: {file.content_type}"
        )
        
    # Read file size (up to ~50MB limit)
    file_bytes = file.file.read()
    file_size = len(file_bytes)
    if file_size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
    
    # Save file using storage provider
    file_url = document_storage_provider.upload_file(file_bytes, file.filename or "unknown.pdf", file.content_type)
    
    # Create DB record
    doc = Document(
        organization_id=current_user.organization_id,
        uploader_id=current_user.id,
        title=file.filename or "Untitled Document",
        original_filename=file.filename or "unknown.pdf",
        file_url=file_url,
        mime_type=file.content_type,
        file_size=file_size,
        status=DocumentStatus.QUEUED
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    # Enqueue celery task
    process_document_task.delay(str(doc.id))
    
    return doc


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List organization documents",
)
def list_documents(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[DocumentStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not permission_engine.has_permission(
        db, None, current_user.id, current_user.role, current_user.organization_id, "view_documents"
    ):
        raise HTTPException(status_code=403, detail="Not authorized to view documents")

    query = db.query(Document).filter(Document.organization_id == current_user.organization_id)
    
    if status_filter:
        query = query.filter(Document.status == status_filter)
        
    total = query.count()
    items = query.order_by(desc(Document.created_at)).offset(skip).limit(limit).all()
    
    return {"items": items, "total": total}


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get document details",
)
def get_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not permission_engine.has_permission(
        db, None, current_user.id, current_user.role, current_user.organization_id, "view_documents"
    ):
        raise HTTPException(status_code=403, detail="Not authorized")

    doc = db.query(Document).filter(
        Document.id == document_id, 
        Document.organization_id == current_user.organization_id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return doc


@router.get(
    "/{document_id}/chunks",
    response_model=DocumentChunkListResponse,
    summary="List chunks for a document",
)
def list_document_chunks(
    document_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not permission_engine.has_permission(
        db, None, current_user.id, current_user.role, current_user.organization_id, "view_documents"
    ):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Verify doc belongs to org
    doc = db.query(Document).filter(
        Document.id == document_id, 
        Document.organization_id == current_user.organization_id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    query = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id)
    total = query.count()
    items = query.order_by(DocumentChunk.chunk_index).offset(skip).limit(limit).all()
    
    return {"items": items, "total": total}


@router.post(
    "/{document_id}/retry",
    response_model=DocumentResponse,
    summary="Retry processing a failed document",
)
def retry_document_processing(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not permission_engine.has_permission(
        db, None, current_user.id, current_user.role, current_user.organization_id, "manage_documents"
    ):
        raise HTTPException(status_code=403, detail="Not authorized to manage documents")

    doc = db.query(Document).filter(
        Document.id == document_id, 
        Document.organization_id == current_user.organization_id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.status not in (DocumentStatus.FAILED, DocumentStatus.UPLOADED):
        raise HTTPException(status_code=400, detail="Can only retry failed or pending uploads")
        
    # Clear existing chunks
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()
    
    doc.status = DocumentStatus.QUEUED
    doc.error_message = None
    db.commit()
    db.refresh(doc)
    
    process_document_task.delay(str(doc.id))
    
    return doc


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document",
)
def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not permission_engine.has_permission(
        db, None, current_user.id, current_user.role, current_user.organization_id, "manage_documents"
    ):
        raise HTTPException(status_code=403, detail="Not authorized to manage documents")

    doc = db.query(Document).filter(
        Document.id == document_id, 
        Document.organization_id == current_user.organization_id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete file from storage
    document_storage_provider.delete_file(doc.file_url)
    
    # Delete DB record (cascade will handle chunks)
    db.delete(doc)
    db.commit()
    return None
