import uuid
from typing import Any, Dict, Generic, Optional, TypeVar

from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.core.database import Base
from src.core.exceptions import NotFoundException
from src.repositories.base import BaseRepository
from src.utils.pagination import PaginatedResult, PaginationParams

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, repository: BaseRepository[ModelType, CreateSchemaType, UpdateSchemaType]):
        self.repository = repository

    def get_or_404(self, db: Session, id: uuid.UUID, organization_id: uuid.UUID) -> ModelType:
        obj = self.repository.get(db, id=id, organization_id=organization_id)
        if not obj:
            raise NotFoundException(message=f"{self.repository.model.__name__} not found")
        return obj

    def list(
        self,
        db: Session,
        organization_id: uuid.UUID,
        pagination: PaginationParams,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> PaginatedResult[ModelType]:
        return self.repository.get_multi(
            db, organization_id, pagination, filters, sort_by, sort_order
        )

    def create(
        self, db: Session, obj_in: CreateSchemaType, organization_id: uuid.UUID
    ) -> ModelType:
        return self.repository.create(db, obj_in=obj_in, organization_id=organization_id)

    def update(
        self, db: Session, id: uuid.UUID, obj_in: UpdateSchemaType, organization_id: uuid.UUID
    ) -> ModelType:
        db_obj = self.get_or_404(db, id, organization_id)
        return self.repository.update(db, db_obj=db_obj, obj_in=obj_in)

    def delete(self, db: Session, id: uuid.UUID, organization_id: uuid.UUID) -> None:
        db_obj = self.get_or_404(db, id, organization_id)
        self.repository.delete(db, db_obj=db_obj)
