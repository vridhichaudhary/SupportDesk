import structlog
import uuid
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, select
from pgvector.sqlalchemy import Vector

from src.models import KnowledgeVector, KnowledgeSourceType
from src.services.embeddings import embedding_service

logger = structlog.get_logger()

class RetrievalService:
    def search(
        self,
        db: Session,
        organization_id: uuid.UUID,
        query: str,
        top_k: int = 5,
        source_types: Optional[List[KnowledgeSourceType]] = None,
        min_similarity: float = 0.5,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves the top_k most relevant knowledge chunks using vector similarity.
        """
        # Generate query embedding
        query_embedding = embedding_service.get_embedding(query, task_type="retrieval_query")
        
        if not query_embedding:
            logger.error("Failed to generate query embedding", query=query)
            return []

        # Start base query, filtering by organization
        stmt = select(KnowledgeVector).filter(KnowledgeVector.organization_id == organization_id)
        
        if source_types:
            stmt = stmt.filter(KnowledgeVector.source_type.in_(source_types))

        # Vector similarity search using L2 distance (<->)
        # We order by distance, which implies the smallest distance comes first
        stmt = stmt.order_by(KnowledgeVector.embedding.l2_distance(query_embedding)).limit(top_k)

        results = db.scalars(stmt).all()
        
        return [
            {
                "id": str(r.id),
                "source_type": r.source_type.value,
                "title": r.title,
                "content": r.content,
                "metadata": r.metadata_json,
                "document_id": str(r.document_id) if r.document_id else None,
                "kb_article_id": str(r.knowledge_article_id) if r.knowledge_article_id else None,
            }
            for r in results
        ]

retrieval_service = RetrievalService()
