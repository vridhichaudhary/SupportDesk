"""
Knowledge Base Vectorization Service
===================================
Handles vector embedding generation, synchronization, and deletion for KB articles.
Guarantees:
- Only PUBLISHED and non-deleted articles have vectors in KnowledgeVector.
- Re-vectorizing an article replaces existing vectors (zero duplicates).
- Deleting or unpublishing an article immediately removes its vectors from vector storage.
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy.orm import Session

from src.models import KBArticle, KBArticleStatus, KnowledgeSourceType, KnowledgeVector
from src.services.document_chunker import document_chunker
from src.services.embeddings import embedding_service

logger = structlog.get_logger()


class KBVectorService:
    def sync_article_vectors(self, db: Session, article: KBArticle) -> int:
        """
        Synchronizes KnowledgeVector rows for a given KB article.
        - If article is deleted or not PUBLISHED: clears all vectors for this article.
        - If article is PUBLISHED and active: removes old vectors, chunks content,
          embeds each chunk, and inserts new KnowledgeVector rows.
        Returns the number of vectors created (or 0 if unindexed).
        """
        article_id = article.id
        org_id = article.organization_id

        # If article is soft-deleted or not PUBLISHED, it must not exist in vector index
        if article.deleted_at is not None or article.status != KBArticleStatus.PUBLISHED:
            deleted_count = self.delete_article_vectors(db, article_id)
            logger.info(
                "Removed vectors for unpublished or deleted KB article",
                article_id=str(article_id),
                deleted_count=deleted_count,
            )
            return 0

        # Delete any existing vectors first to guarantee zero duplicate vectors on updates
        self.delete_article_vectors(db, article_id)

        # Prepare full text (Title + Summary + Content)
        text_parts = [article.title]
        if article.summary:
            text_parts.append(article.summary)
        if article.content:
            text_parts.append(article.content)
        full_text = "\n\n".join(text_parts).strip()

        if not full_text:
            return 0

        # Chunk text
        chunks = document_chunker.chunk(full_text, str(article_id))

        vectors_created = 0
        for c in chunks:
            chunk_content = c["content"]
            embedding = embedding_service.get_embedding(
                chunk_content, task_type="retrieval_document"
            )

            if embedding is not None:
                vector_entry = KnowledgeVector(
                    organization_id=org_id,
                    embedding=embedding,
                    source_type=KnowledgeSourceType.KB_ARTICLE,
                    knowledge_article_id=article_id,
                    title=(
                        f"{article.title} (Part {c['chunk_index'] + 1})"
                        if len(chunks) > 1
                        else article.title
                    ),
                    content=chunk_content,
                    metadata_json={
                        "slug": article.slug,
                        "version": article.version,
                        "chunk_index": c["chunk_index"],
                        "total_chunks": len(chunks),
                        "visibility": (
                            article.visibility.value
                            if hasattr(article.visibility, "value")
                            else str(article.visibility)
                        ),
                    },
                )
                db.add(vector_entry)
                vectors_created += 1

        db.commit()
        logger.info(
            "KB article vectorization complete",
            article_id=str(article_id),
            vectors_created=vectors_created,
        )
        return vectors_created

    def delete_article_vectors(self, db: Session, article_id: uuid.UUID) -> int:
        """
        Removes all KnowledgeVector entries associated with a KB article.
        """
        deleted_count = (
            db.query(KnowledgeVector)
            .filter(KnowledgeVector.knowledge_article_id == article_id)
            .delete(synchronize_session=False)
        )
        db.commit()
        return deleted_count


kb_vector_service = KBVectorService()
