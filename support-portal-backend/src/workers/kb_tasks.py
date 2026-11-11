"""
Celery background tasks for Knowledge Base vectorization.
"""

import uuid

import structlog

from src.core.celery_app import celery_app
from src.core.database import SessionLocal
from src.models import KBArticle
from src.services.kb_vector import kb_vector_service

logger = structlog.get_logger()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=15)
def vectorize_kb_article_task(self, article_id_str: str):
    """
    Background Celery task: Vectorizes or cleans up vectors for a KB article.
    """
    logger.info("Starting KB article vectorization task", article_id=article_id_str)
    db = SessionLocal()
    try:
        article_id = uuid.UUID(article_id_str)
        article = db.query(KBArticle).filter(KBArticle.id == article_id).first()
        if not article:
            logger.warning(
                "KB article not found for vectorization, clearing vectors",
                article_id=article_id_str,
            )
            kb_vector_service.delete_article_vectors(db, article_id)
            return

        kb_vector_service.sync_article_vectors(db, article)
    except Exception as e:
        logger.error(
            "KB article vectorization task failed", article_id=article_id_str, error=str(e)
        )
        db.rollback()
        raise self.retry(exc=e) from e
    finally:
        db.close()
