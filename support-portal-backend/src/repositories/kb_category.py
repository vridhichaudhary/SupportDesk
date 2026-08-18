import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import KBCategory


class KBCategoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, category_id: uuid.UUID, organization_id: uuid.UUID) -> Optional[KBCategory]:
        stmt = select(KBCategory).where(
            KBCategory.id == category_id, KBCategory.organization_id == organization_id
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_slug(self, slug: str, organization_id: uuid.UUID) -> Optional[KBCategory]:
        stmt = select(KBCategory).where(
            KBCategory.slug == slug, KBCategory.organization_id == organization_id
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_all(self, organization_id: uuid.UUID) -> List[KBCategory]:
        """Returns all categories for building the tree in memory"""
        stmt = (
            select(KBCategory)
            .where(KBCategory.organization_id == organization_id)
            .order_by(KBCategory.display_order.asc(), KBCategory.name.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_subcategories(
        self, parent_id: Optional[uuid.UUID], organization_id: uuid.UUID
    ) -> List[KBCategory]:
        stmt = (
            select(KBCategory)
            .where(KBCategory.parent_id == parent_id, KBCategory.organization_id == organization_id)
            .order_by(KBCategory.display_order.asc(), KBCategory.name.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def create(self, category: KBCategory) -> KBCategory:
        self.db.add(category)
        self.db.flush()
        return category

    def update(self, category: KBCategory) -> KBCategory:
        self.db.add(category)
        self.db.flush()
        return category

    def delete(self, category: KBCategory) -> None:
        self.db.delete(category)
        self.db.flush()
