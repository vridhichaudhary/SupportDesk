from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


class SuccessResponse(BaseModel, Generic[T]):
    data: T
    model_config = ConfigDict(arbitrary_types_allowed=True)


class PaginationMeta(BaseModel):
    total: int
    offset: int
    limit: int
    has_next: bool


class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    meta: PaginationMeta
    model_config = ConfigDict(arbitrary_types_allowed=True)
