from typing import Generic, List, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    offset: int = Field(0, ge=0)
    limit: int = Field(100, ge=1, le=1000)


class PaginatedResult(BaseModel, Generic[T]):
    items: List[T]
    total: int
    offset: int
    limit: int
    has_next: bool

    model_config = ConfigDict(arbitrary_types_allowed=True)

    @classmethod
    def create(cls, items: List[T], total: int, params: PaginationParams) -> "PaginatedResult[T]":
        has_next = (params.offset + params.limit) < total
        return cls(
            items=items,
            total=total,
            offset=params.offset,
            limit=params.limit,
            has_next=has_next,
        )
