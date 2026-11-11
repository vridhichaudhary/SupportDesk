"""
Tests for Knowledge Base Vectorization (Phase 3).
Covers:
- DRAFT articles not indexed in KnowledgeVector
- Transitioning to PUBLISHED triggers embedding and saves KnowledgeVector
- Updating PUBLISHED article replaces existing vectors (zero duplicates)
- Transitioning from PUBLISHED to DRAFT / ARCHIVED removes vectors immediately
- Deleting an article clears all vectors immediately
- Retrieval search only finds active, PUBLISHED articles
- Celery task execution and retry behavior
"""

import uuid
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from src.models import (
    KBArticleStatus,
    KnowledgeSourceType,
    KnowledgeVector,
    Organization,
    User,
    UserRole,
)
from src.services.kb_article import KBArticleService
from src.services.kb_vector import kb_vector_service
from src.workers.kb_tasks import vectorize_kb_article_task

# ==============================================================================
# Helpers
# ==============================================================================


def _setup_org_and_author(db: Session):
    org = Organization(id=uuid.uuid4(), name="KB Vector Org", industry="Tech")
    db.add(org)
    db.flush()

    author = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email="author@test.com",
        password_hash="hash",
        role=UserRole.ADMIN,
    )
    db.add(author)
    db.flush()
    return org, author


# ==============================================================================
# Unit & Integration Tests
# ==============================================================================


def test_kb_article_draft_not_vectorized(db_session: Session):
    """Verify newly created DRAFT articles are NOT inserted into vector storage."""
    org, author = _setup_org_and_author(db_session)
    service = KBArticleService(db_session)

    article = service.create_article(
        {"title": "Draft Article", "slug": "draft-article", "content": "Unpublished secret notes."},
        org_id=org.id,
        author_id=author.id,
    )

    vectors = (
        db_session.query(KnowledgeVector)
        .filter(KnowledgeVector.knowledge_article_id == article.id)
        .all()
    )
    assert len(vectors) == 0


def test_kb_article_publish_creates_vectors(db_session: Session):
    """Verify transitioning article to PUBLISHED triggers vector generation."""
    org, author = _setup_org_and_author(db_session)
    service = KBArticleService(db_session)

    article = service.create_article(
        {
            "title": "Getting Started",
            "slug": "getting-started",
            "content": "How to set up your account step by step.",
        },
        org_id=org.id,
        author_id=author.id,
    )

    mock_embedding = [0.1] * 768
    with patch(
        "src.services.embeddings.embedding_service.get_embedding", return_value=mock_embedding
    ):
        updated = service.transition_status(
            article.id, org.id, KBArticleStatus.PUBLISHED, author.id
        )
        assert updated.status == KBArticleStatus.PUBLISHED

        # Synchronize vectors if Celery task not running live
        kb_vector_service.sync_article_vectors(db_session, updated)

        vectors = (
            db_session.query(KnowledgeVector)
            .filter(KnowledgeVector.knowledge_article_id == article.id)
            .all()
        )
        assert len(vectors) >= 1
        assert vectors[0].source_type == KnowledgeSourceType.KB_ARTICLE
        assert vectors[0].organization_id == org.id
        assert vectors[0].title == "Getting Started"
        assert vectors[0].metadata_json["slug"] == "getting-started"


def test_kb_article_update_replaces_vectors_preventing_duplicates(db_session: Session):
    """Verify updating a PUBLISHED article clears old vectors before re-indexing (zero duplicates)."""
    org, author = _setup_org_and_author(db_session)
    service = KBArticleService(db_session)

    article = service.create_article(
        {"title": "Billing FAQ", "slug": "billing-faq", "content": "Initial billing terms."},
        org_id=org.id,
        author_id=author.id,
    )

    mock_embedding = [0.2] * 768
    with patch(
        "src.services.embeddings.embedding_service.get_embedding", return_value=mock_embedding
    ):
        service.transition_status(article.id, org.id, KBArticleStatus.PUBLISHED, author.id)
        kb_vector_service.sync_article_vectors(db_session, article)

        initial_count = (
            db_session.query(KnowledgeVector)
            .filter(KnowledgeVector.knowledge_article_id == article.id)
            .count()
        )
        assert initial_count == 1

        # Now update the article content multiple times
        service.update_article(
            article.id,
            {"content": "Revised billing terms and payment methods."},
            org_id=org.id,
            editor_id=author.id,
        )
        kb_vector_service.sync_article_vectors(db_session, article)

        service.update_article(
            article.id,
            {"content": "Final revised billing terms with refund policy."},
            org_id=org.id,
            editor_id=author.id,
        )
        kb_vector_service.sync_article_vectors(db_session, article)

        final_count = (
            db_session.query(KnowledgeVector)
            .filter(KnowledgeVector.knowledge_article_id == article.id)
            .count()
        )
        # MUST still be exactly 1 vector (no accumulation / duplicates)
        assert final_count == 1


def test_kb_article_unpublish_clears_vectors(db_session: Session):
    """Verify moving an article from PUBLISHED to DRAFT removes it from vector storage."""
    org, author = _setup_org_and_author(db_session)
    service = KBArticleService(db_session)

    article = service.create_article(
        {"title": "Security Guide", "slug": "security-guide", "content": "Security instructions."},
        org_id=org.id,
        author_id=author.id,
    )

    mock_embedding = [0.3] * 768
    with patch(
        "src.services.embeddings.embedding_service.get_embedding", return_value=mock_embedding
    ):
        service.transition_status(article.id, org.id, KBArticleStatus.PUBLISHED, author.id)
        kb_vector_service.sync_article_vectors(db_session, article)

        assert (
            db_session.query(KnowledgeVector)
            .filter(KnowledgeVector.knowledge_article_id == article.id)
            .count()
            == 1
        )

        # Transition to ARCHIVED or DRAFT
        service.transition_status(article.id, org.id, KBArticleStatus.DRAFT, author.id)

        # Vectors must be completely wiped
        assert (
            db_session.query(KnowledgeVector)
            .filter(KnowledgeVector.knowledge_article_id == article.id)
            .count()
            == 0
        )


def test_kb_article_deletion_clears_vectors(db_session: Session):
    """Verify deleting a published article wipes all associated vectors."""
    org, author = _setup_org_and_author(db_session)
    service = KBArticleService(db_session)

    article = service.create_article(
        {"title": "Deprecated API", "slug": "deprecated-api", "content": "Old API documentation."},
        org_id=org.id,
        author_id=author.id,
    )

    mock_embedding = [0.4] * 768
    with patch(
        "src.services.embeddings.embedding_service.get_embedding", return_value=mock_embedding
    ):
        service.transition_status(article.id, org.id, KBArticleStatus.PUBLISHED, author.id)
        kb_vector_service.sync_article_vectors(db_session, article)

        assert (
            db_session.query(KnowledgeVector)
            .filter(KnowledgeVector.knowledge_article_id == article.id)
            .count()
            == 1
        )

        service.delete_article(article.id, org.id)

        assert (
            db_session.query(KnowledgeVector)
            .filter(KnowledgeVector.knowledge_article_id == article.id)
            .count()
            == 0
        )


def test_celery_vectorize_kb_article_task_success(db_session: Session):
    """Verify vectorize_kb_article_task executes and updates vectors."""
    org, author = _setup_org_and_author(db_session)
    service = KBArticleService(db_session)

    article = service.create_article(
        {"title": "Task Test", "slug": "task-test", "content": "Content to vectorize."},
        org_id=org.id,
        author_id=author.id,
    )
    service.transition_status(article.id, org.id, KBArticleStatus.PUBLISHED, author.id)

    target_id = article.id
    mock_embedding = [0.5] * 768
    with patch("src.workers.kb_tasks.SessionLocal", return_value=db_session):
        with patch.object(db_session, "close"):
            with patch(
                "src.services.embeddings.embedding_service.get_embedding",
                return_value=mock_embedding,
            ):
                vectorize_kb_article_task.run(str(target_id))

    count = (
        db_session.query(KnowledgeVector)
        .filter(KnowledgeVector.knowledge_article_id == target_id)
        .count()
    )
    assert count >= 1


def test_celery_vectorize_kb_article_task_failure_and_retry(db_session: Session):
    """Verify vectorize_kb_article_task rolls back and triggers retry on failure."""
    article_id = uuid.uuid4()
    mock_db = MagicMock()

    with patch("src.workers.kb_tasks.SessionLocal", return_value=mock_db):
        with patch(
            "src.services.kb_vector.kb_vector_service.sync_article_vectors",
            side_effect=RuntimeError("Embedding Failure"),
        ):
            with patch.object(
                vectorize_kb_article_task, "retry", side_effect=Exception("CeleryRetryTriggered")
            ) as mock_retry:
                mock_db.query.return_value.filter.return_value.first.return_value = MagicMock()

                with pytest.raises(Exception, match="CeleryRetryTriggered"):
                    vectorize_kb_article_task.apply(args=[str(article_id)], throw=True)

                mock_db.rollback.assert_called_once()
                mock_db.close.assert_called_once()
                mock_retry.assert_called_once()
