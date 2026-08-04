import uuid
from typing import List

from sqlalchemy.orm import Session

from src.core.exceptions import SupportDeskException
from src.models import KBCategory
from src.repositories.kb_category import KBCategoryRepository


class KBCategoryService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = KBCategoryRepository(db)

    def get_category(self, category_id: uuid.UUID, org_id: uuid.UUID) -> KBCategory:
        category = self.repo.get_by_id(category_id, org_id)
        if not category:
            raise SupportDeskException(
                message="Category not found",
                code="NOT_FOUND",
                status_code=404
            )
        return category

    def list_categories(self, org_id: uuid.UUID) -> List[KBCategory]:
        return self.repo.list_all(org_id)

    def create_category(self, data: dict, org_id: uuid.UUID) -> KBCategory:
        # Check slug collision
        slug = data.get("slug")
        if slug and self.repo.get_by_slug(slug, org_id):
            raise SupportDeskException(
                message="A category with this slug already exists.",
                code="CONFLICT",
                status_code=409
            )

        # Check parent existence if provided
        parent_id = data.get("parent_id")
        if parent_id:
            parent = self.repo.get_by_id(parent_id, org_id)
            if not parent:
                raise SupportDeskException(
                    message="Parent category not found",
                    code="NOT_FOUND",
                    status_code=404
                )

        category = KBCategory(
            organization_id=org_id,
            **data
        )
        return self.repo.create(category)

    def update_category(self, category_id: uuid.UUID, data: dict, org_id: uuid.UUID) -> KBCategory:
        category = self.get_category(category_id, org_id)

        # Check slug collision
        slug = data.get("slug")
        if slug and slug != category.slug:
            if self.repo.get_by_slug(slug, org_id):
                raise SupportDeskException(
                    message="A category with this slug already exists.",
                    code="CONFLICT",
                    status_code=409
                )

        # Check parent existence if provided
        parent_id = data.get("parent_id")
        if parent_id:
            if parent_id == category_id:
                raise SupportDeskException(
                    message="Category cannot be its own parent",
                    code="VALIDATION_ERROR",
                    status_code=400
                )
            parent = self.repo.get_by_id(parent_id, org_id)
            if not parent:
                raise SupportDeskException(
                    message="Parent category not found",
                    code="NOT_FOUND",
                    status_code=404
                )

        for k, v in data.items():
            setattr(category, k, v)

        return self.repo.update(category)

    def delete_category(self, category_id: uuid.UUID, org_id: uuid.UUID) -> None:
        category = self.get_category(category_id, org_id)
        
        # Check for subcategories
        subs = self.repo.get_subcategories(category_id, org_id)
        if subs:
            raise SupportDeskException(
                message="Cannot delete a category with subcategories.",
                code="CONFLICT",
                status_code=409
            )
            
        # Optional: check if there are articles in this category. For now, rely on DB SET NULL.

        self.repo.delete(category)
