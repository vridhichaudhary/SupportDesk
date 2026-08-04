import uuid
from typing import List, Optional, Tuple

from sqlalchemy import select, or_, func, desc
from sqlalchemy.orm import Session, selectinload

from src.models import KBArticle, KBArticleStatus, VisibilityLevel, Tag


class KBArticleRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, article_id: uuid.UUID, organization_id: uuid.UUID) -> Optional[KBArticle]:
        stmt = select(KBArticle).options(
            selectinload(KBArticle.tags),
            selectinload(KBArticle.author),
            selectinload(KBArticle.category),
        ).where(
            KBArticle.id == article_id,
            KBArticle.organization_id == organization_id,
            KBArticle.deleted_at.is_(None)
        )
        return self.db.execute(stmt).scalar_one_or_none()
        
    def get_by_slug(self, slug: str, organization_id: uuid.UUID) -> Optional[KBArticle]:
        stmt = select(KBArticle).options(
            selectinload(KBArticle.tags),
            selectinload(KBArticle.author),
            selectinload(KBArticle.category),
        ).where(
            KBArticle.slug == slug,
            KBArticle.organization_id == organization_id,
            KBArticle.deleted_at.is_(None)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def search(
        self,
        organization_id: uuid.UUID,
        query: Optional[str] = None,
        category_id: Optional[uuid.UUID] = None,
        status: Optional[KBArticleStatus] = None,
        visibility: Optional[VisibilityLevel] = None,
        skip: int = 0,
        limit: int = 50,
        sort_by: str = "updated_at",
    ) -> Tuple[List[KBArticle], int]:
        stmt = select(KBArticle).where(
            KBArticle.organization_id == organization_id,
            KBArticle.deleted_at.is_(None)
        )

        if category_id:
            stmt = stmt.where(KBArticle.category_id == category_id)

        if status:
            stmt = stmt.where(KBArticle.status == status)

        if visibility:
            stmt = stmt.where(KBArticle.visibility == visibility)

        if query:
            # Fallback ILIKE search for title and summary
            # We also search tags via an exists subquery for better coverage
            search_pattern = f"%{query}%"
            stmt = stmt.where(
                or_(
                    KBArticle.title.ilike(search_pattern),
                    KBArticle.summary.ilike(search_pattern),
                    KBArticle.tags.any(Tag.name.ilike(search_pattern))
                )
            )

        # Count total before limit/offset
        total_stmt = select(func.count()).select_from(stmt.subquery())
        total = self.db.execute(total_stmt).scalar_one()

        # Sorting
        if sort_by == "views":
            stmt = stmt.order_by(desc(KBArticle.views))
        elif sort_by == "helpful_count":
            stmt = stmt.order_by(desc(KBArticle.helpful_count))
        elif sort_by == "title":
            stmt = stmt.order_by(KBArticle.title.asc())
        else:
            # Default to recently updated
            stmt = stmt.order_by(desc(KBArticle.updated_at))

        stmt = stmt.options(
            selectinload(KBArticle.tags),
            selectinload(KBArticle.author),
            selectinload(KBArticle.category),
        ).offset(skip).limit(limit)

        items = list(self.db.execute(stmt).scalars().all())
        return items, total

    def create(self, article: KBArticle) -> KBArticle:
        self.db.add(article)
        self.db.flush()
        return article

    def update(self, article: KBArticle) -> KBArticle:
        self.db.add(article)
        self.db.flush()
        return article

    def delete(self, article: KBArticle) -> None:
        self.db.delete(article)
        self.db.flush()
        
    def increment_view(self, article_id: uuid.UUID) -> None:
        stmt = select(KBArticle).where(KBArticle.id == article_id)
        article = self.db.execute(stmt).scalar_one_or_none()
        if article:
            article.views += 1
            self.db.flush()
