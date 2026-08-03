from typing import Any, Dict

from sqlalchemy import Select


def apply_filters(query: Select, model: Any, filters: Dict[str, Any]) -> Select:
    """
    Dynamically applies equality filters to a SQLAlchemy select query based on a dictionary.
    Excludes None values.
    """
    for key, value in filters.items():
        if value is not None and hasattr(model, key):
            query = query.where(getattr(model, key) == value)
    return query
