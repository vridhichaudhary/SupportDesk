from typing import Any

from sqlalchemy import Select, asc, desc


def apply_sorting(query: Select, model: Any, sort_by: str, sort_order: str = "asc") -> Select:
    """
    Applies sorting to a SQLAlchemy select query.
    """
    if hasattr(model, sort_by):
        column = getattr(model, sort_by)
        if sort_order.lower() == "desc":
            query = query.order_by(desc(column))
        else:
            query = query.order_by(asc(column))
    return query
