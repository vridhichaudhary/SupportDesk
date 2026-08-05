import time
import uuid
import structlog
from pathlib import Path

from src.core.celery_app import celery_app
from src.core.database import SessionLocal
from src.models import Document, DocumentChunk, DocumentStatus
from src.services.document_parser import document_parser
from src.services.document_chunker import document_chunker

logger = structlog.get_logger()

# We need the base dir to construct absolute path to the local file for parsing
BASE_DIR = Path(__file__).resolve().parent.parent.parent

@celery_app.task(bind=True, max_retries=3)
def process_document_task(self, document_id_str: str):
    """
    Background job to parse a document and extract chunks.
    """
    logger.info("Starting document processing", document_id=document_id_str)
    
    db = SessionLocal()
    try:
        document_id = uuid.UUID(document_id_str)
        doc = db.query(Document).filter(Document.id == document_id).first()
        
        if not doc:
            logger.error("Document not found for processing", document_id=document_id_str)
            return

        # Update status to processing
        doc.status = DocumentStatus.PROCESSING
        db.commit()

        start_time = time.time()

        # Parse local file path
        # In a real cloud setup, we would download from S3 to a temp file here.
        # Since file_url is e.g. /static/uploads/documents/...
        # we map it back to the file system path
        relative_path = doc.file_url.lstrip("/")
        file_path = str(BASE_DIR / relative_path)

        # 1. Extract text and metadata
        extracted_text, metadata = document_parser.extract(file_path, doc.mime_type)
        
        # Merge metadata
        if metadata:
            current_meta = dict(doc.metadata_json)
            current_meta.update(metadata)
            doc.metadata_json = current_meta
            
            if "page_count" in metadata:
                doc.page_count = metadata["page_count"]

        # 2. Chunk text
        chunks_data = document_chunker.chunk(extracted_text, document_id_str)

        # 3. Save chunks
        for c in chunks_data:
            chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=c["chunk_index"],
                content=c["content"],
                page_number=c["page_number"],
                character_count=c["character_count"],
                word_count=c["word_count"],
                content_hash=c["content_hash"]
            )
            db.add(chunk)

        # Update document completion
        end_time = time.time()
        current_meta = dict(doc.metadata_json)
        current_meta["processing_time_seconds"] = round(end_time - start_time, 2)
        current_meta["total_chunks"] = len(chunks_data)
        doc.metadata_json = current_meta
        
        doc.status = DocumentStatus.COMPLETED
        db.commit()
        
        logger.info("Document processing completed", document_id=document_id_str, chunks=len(chunks_data))

    except Exception as e:
        logger.error("Document processing failed", error=str(e), document_id=document_id_str)
        db.rollback()
        # Mark as failed in DB
        try:
            doc = db.query(Document).filter(Document.id == uuid.UUID(document_id_str)).first()
            if doc:
                doc.status = DocumentStatus.FAILED
                doc.error_message = str(e)
                db.commit()
        except Exception as inner_e:
            logger.error("Failed to update document error status", error=str(inner_e))
        
        # Retry logic
        raise self.retry(exc=e, countdown=60)
    finally:
        db.close()
