import math
import uuid
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import (
    Document,
    DocumentStatus,
    KBArticle,
    KBArticleStatus,
    KnowledgeSourceType,
    KnowledgeVector,
)
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
        min_similarity: float = 0.0,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves the top_k most relevant knowledge chunks using vector similarity.
        Enforces tenant isolation and guarantees only PUBLISHED non-deleted KB articles
        and COMPLETED non-deleted documents are returned.
        """
        # Generate query embedding
        query_embedding = embedding_service.get_embedding(query, task_type="retrieval_query")

        if not query_embedding:
            logger.error("Failed to generate query embedding", query=query)
            return []

        # Check SQL dialect (SQLite in unit tests vs PostgreSQL in dev/production)
        is_sqlite = bool(db.bind and db.bind.dialect.name == "sqlite")

        if is_sqlite:
            # SQLite fallback for test suites: manual distance calculation
            stmt = (
                select(KnowledgeVector)
                .outerjoin(KBArticle, KnowledgeVector.knowledge_article_id == KBArticle.id)
                .outerjoin(Document, KnowledgeVector.document_id == Document.id)
                .filter(KnowledgeVector.organization_id == organization_id)
                .filter(
                    (KnowledgeVector.knowledge_article_id.is_(None))
                    | (
                        (KBArticle.status == KBArticleStatus.PUBLISHED)
                        & (KBArticle.deleted_at.is_(None))
                    )
                )
                .filter(
                    (KnowledgeVector.document_id.is_(None))
                    | (
                        (Document.status == DocumentStatus.COMPLETED)
                        & (Document.deleted_at.is_(None))
                    )
                )
            )
            if source_types:
                stmt = stmt.filter(KnowledgeVector.source_type.in_(source_types))

            candidates = db.scalars(stmt).all()
            scored = []
            for r in candidates:
                if r.embedding is not None and len(r.embedding) > 0:
                    dist = math.sqrt(
                        sum(
                            (float(a) - float(b)) ** 2
                            for a, b in zip(r.embedding, query_embedding, strict=False)
                        )
                    )
                else:
                    dist = 1.0
                scored.append((r, dist))
            scored.sort(key=lambda x: x[1])
            results_with_dist = scored[:top_k]
        else:
            # PostgreSQL with pgvector and HNSW index acceleration
            dist_col = KnowledgeVector.embedding.l2_distance(query_embedding).label("dist")
            stmt = (
                select(KnowledgeVector, dist_col)
                .outerjoin(KBArticle, KnowledgeVector.knowledge_article_id == KBArticle.id)
                .outerjoin(Document, KnowledgeVector.document_id == Document.id)
                .filter(KnowledgeVector.organization_id == organization_id)
                .filter(
                    (KnowledgeVector.knowledge_article_id.is_(None))
                    | (
                        (KBArticle.status == KBArticleStatus.PUBLISHED)
                        & (KBArticle.deleted_at.is_(None))
                    )
                )
                .filter(
                    (KnowledgeVector.document_id.is_(None))
                    | (
                        (Document.status == DocumentStatus.COMPLETED)
                        & (Document.deleted_at.is_(None))
                    )
                )
            )

            if source_types:
                stmt = stmt.filter(KnowledgeVector.source_type.in_(source_types))

            stmt = stmt.order_by(dist_col).limit(top_k)
            rows = db.execute(stmt).all()
            results_with_dist = [(row[0], float(row[1])) for row in rows]

        output = []
        for r, dist in results_with_dist:
            sim = round(1.0 / (1.0 + dist), 4)
            if sim >= min_similarity:
                source_val = (
                    r.source_type.value if hasattr(r.source_type, "value") else str(r.source_type)
                )
                output.append(
                    {
                        "id": str(r.id),
                        "source_type": source_val,
                        "title": r.title or "Untitled Knowledge Source",
                        "content": r.content,
                        "metadata": r.metadata_json or {},
                        "document_id": str(r.document_id) if r.document_id else None,
                        "kb_article_id": (
                            str(r.knowledge_article_id) if r.knowledge_article_id else None
                        ),
                        "similarity": sim,
                        "distance": round(dist, 4),
                    }
                )

        return output


retrieval_service = RetrievalService()
