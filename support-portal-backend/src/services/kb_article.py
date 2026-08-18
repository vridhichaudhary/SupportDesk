import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from src.core.exceptions import SupportDeskException
from src.models import KBArticle, KBArticleStatus, KBArticleVersion, VisibilityLevel
from src.repositories.kb_article import KBArticleRepository
from src.repositories.kb_version import KBVersionRepository


class KBArticleService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = KBArticleRepository(db)
        self.version_repo = KBVersionRepository(db)

    def get_article(self, article_id: uuid.UUID, org_id: uuid.UUID) -> KBArticle:
        article = self.repo.get_by_id(article_id, org_id)
        if not article:
            raise SupportDeskException(
                message="Article not found", code="NOT_FOUND", status_code=404
            )
        return article

    def get_article_by_slug(self, slug: str, org_id: uuid.UUID) -> KBArticle:
        article = self.repo.get_by_slug(slug, org_id)
        if not article:
            raise SupportDeskException(
                message="Article not found", code="NOT_FOUND", status_code=404
            )
        return article

    def search_articles(
        self,
        org_id: uuid.UUID,
        query: Optional[str] = None,
        category_id: Optional[uuid.UUID] = None,
        status: Optional[KBArticleStatus] = None,
        visibility: Optional[VisibilityLevel] = None,
        skip: int = 0,
        limit: int = 50,
        sort_by: str = "updated_at",
    ) -> Tuple[List[KBArticle], int]:
        return self.repo.search(
            org_id, query, category_id, status, visibility, skip, limit, sort_by
        )

    def create_article(self, data: dict, org_id: uuid.UUID, author_id: uuid.UUID) -> KBArticle:
        # Check slug collision
        slug = data.get("slug")
        if slug and self.repo.get_by_slug(slug, org_id):
            raise SupportDeskException(
                message="An article with this slug already exists.",
                code="CONFLICT",
                status_code=409,
            )

        article = KBArticle(
            organization_id=org_id,
            author_id=author_id,
            status=KBArticleStatus.DRAFT,
            version=1,
            **data,
        )
        article = self.repo.create(article)

        # Snapshot initial version
        self._snapshot_version(article, author_id, "Initial creation")

        return article

    def update_article(
        self,
        article_id: uuid.UUID,
        data: dict,
        org_id: uuid.UUID,
        editor_id: uuid.UUID,
        edit_reason: Optional[str] = None,
    ) -> KBArticle:
        article = self.get_article(article_id, org_id)

        # Check slug collision
        slug = data.get("slug")
        if slug and slug != article.slug:
            if self.repo.get_by_slug(slug, org_id):
                raise SupportDeskException(
                    message="An article with this slug already exists.",
                    code="CONFLICT",
                    status_code=409,
                )

        content_changed = False
        if "content" in data and data["content"] != article.content:
            content_changed = True

        for k, v in data.items():
            if hasattr(article, k):
                setattr(article, k, v)

        if content_changed:
            article.version += 1
            self._snapshot_version(article, editor_id, edit_reason or "Content updated")

        return self.repo.update(article)

    def transition_status(
        self,
        article_id: uuid.UUID,
        org_id: uuid.UUID,
        new_status: KBArticleStatus,
        actor_id: uuid.UUID,
    ) -> KBArticle:
        article = self.get_article(article_id, org_id)

        # State machine validations could go here
        # e.g., only IN_REVIEW can become APPROVED, only APPROVED can become PUBLISHED

        if new_status == KBArticleStatus.PUBLISHED and article.status != KBArticleStatus.PUBLISHED:
            article.published_at = datetime.now(timezone.utc)

        article.status = new_status
        return self.repo.update(article)

    def delete_article(self, article_id: uuid.UUID, org_id: uuid.UUID) -> None:
        article = self.get_article(article_id, org_id)
        # Soft delete
        article.deleted_at = datetime.now(timezone.utc)
        self.repo.update(article)

    def restore_version(
        self, article_id: uuid.UUID, version_number: int, org_id: uuid.UUID, editor_id: uuid.UUID
    ) -> KBArticle:
        article = self.get_article(article_id, org_id)

        version_record = self.version_repo.get_by_version_number(article_id, version_number)
        if not version_record:
            raise SupportDeskException(
                message="Version not found", code="NOT_FOUND", status_code=404
            )

        article.title = version_record.title
        article.content = version_record.content
        article.summary = version_record.summary
        article.version += 1

        self.repo.update(article)
        self._snapshot_version(article, editor_id, f"Restored from version {version_number}")

        return article

    def _snapshot_version(self, article: KBArticle, editor_id: uuid.UUID, edit_reason: str):
        version = KBArticleVersion(
            article_id=article.id,
            editor_id=editor_id,
            version_number=article.version,
            title=article.title,
            content=article.content,
            summary=article.summary,
            edit_reason=edit_reason,
        )
        self.version_repo.create(version)

    def increment_view(self, article_id: uuid.UUID, org_id: uuid.UUID) -> None:
        self.get_article(article_id, org_id)  # Validate existence
        self.repo.increment_view(article_id)

    def vote_helpful(self, article_id: uuid.UUID, org_id: uuid.UUID, helpful: bool) -> None:
        article = self.get_article(article_id, org_id)
        if helpful:
            article.helpful_count += 1
        else:
            article.not_helpful_count += 1
        self.repo.update(article)
