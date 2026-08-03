import uuid
from typing import Any, Dict, Generic, Optional, Type, TypeVar

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.core.database import Base
from src.utils.filtering import apply_filters
from src.utils.pagination import PaginatedResult, PaginationParams
from src.utils.sorting import apply_sorting

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get(self, db: Session, id: uuid.UUID, organization_id: uuid.UUID) -> Optional[ModelType]:
        query = select(self.model).where(
            self.model.id == id, self.model.organization_id == organization_id
        )
        if hasattr(self.model, "deleted_at"):
            query = query.where(self.model.deleted_at.is_(None))
        return db.execute(query).scalar_one_or_none()

    def get_multi(
        self,
        db: Session,
        organization_id: uuid.UUID,
        pagination: PaginationParams,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> PaginatedResult[ModelType]:
        query = select(self.model).where(self.model.organization_id == organization_id)
        if hasattr(self.model, "deleted_at"):
            query = query.where(self.model.deleted_at.is_(None))

        if filters:
            query = apply_filters(query, self.model, filters)

        query = apply_sorting(query, self.model, sort_by, sort_order)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = db.execute(count_query).scalar_one()

        # Paginate
        query = query.offset(pagination.offset).limit(pagination.limit)
        items = db.execute(query).scalars().all()

        return PaginatedResult.create(items=list(items), total=total, params=pagination)

    def create(
        self, db: Session, obj_in: CreateSchemaType, organization_id: uuid.UUID
    ) -> ModelType:
        obj_in_data = obj_in.model_dump(exclude_unset=True)
        obj_in_data["organization_id"] = organization_id
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: ModelType, obj_in: UpdateSchemaType) -> ModelType:
        obj_data = obj_in.model_dump(exclude_unset=True)
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, db_obj: ModelType) -> None:
        if hasattr(self.model, "deleted_at"):
            from datetime import datetime

            db_obj.deleted_at = datetime.utcnow()
            db.add(db_obj)
        else:
            db.delete(db_obj)
        db.commit()
