import math
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.core.dependencies import get_current_user, get_db
from src.core.permissions import permission_engine
from src.models import KBArticleStatus, User, VisibilityLevel
from src.schemas.kb import (
    KBArticleCreate,
    KBArticleListResponse,
    KBArticleResponse,
    KBArticleUpdate,
    KBArticleVersionResponse,
    KBArticleWorkflowUpdate,
    KBCategoryCreate,
    KBCategoryResponse,
    KBCategoryUpdate,
)
from src.services.kb_article import KBArticleService
from src.services.kb_category import KBCategoryService

router = APIRouter(prefix="/knowledge", tags=["Knowledge"])


# ── Categories ──────────────────────────────────────────────────────────────


@router.get("/categories", response_model=List[KBCategoryResponse])
def list_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all categories for the organization"""
    permission_engine.has_any_permission(
        db,
        None,
        current_user.id,
        current_user.role,
        current_user.organization_id,
        "view_knowledge_base",
        "manage_knowledge_base",
    )  # In production we pass redis client, passing None since permission engine gracefully handles it

    service = KBCategoryService(db)
    return service.list_categories(current_user.organization_id)


@router.post("/categories", response_model=KBCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: KBCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new knowledge base category"""
    permission_engine.has_permission(
        db,
        None,
        current_user.id,
        current_user.role,
        current_user.organization_id,
        "manage_knowledge_base",
    )

    service = KBCategoryService(db)
    return service.create_category(data.model_dump(), current_user.organization_id)


@router.put("/categories/{category_id}", response_model=KBCategoryResponse)
def update_category(
    category_id: uuid.UUID,
    data: KBCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a knowledge base category"""
    permission_engine.has_permission(
        db,
        None,
        current_user.id,
        current_user.role,
        current_user.organization_id,
        "manage_knowledge_base",
    )

    service = KBCategoryService(db)
    return service.update_category(
        category_id, data.model_dump(exclude_unset=True), current_user.organization_id
    )


# ── Articles ────────────────────────────────────────────────────────────────


@router.get("/articles", response_model=KBArticleListResponse)
def list_articles(
    query: Optional[str] = Query(None, description="Search term"),
    category_id: Optional[uuid.UUID] = Query(None),
    status: Optional[KBArticleStatus] = Query(None),
    visibility: Optional[VisibilityLevel] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    sort_by: str = Query("updated_at"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List and search articles"""
    permission_engine.has_any_permission(
        db,
        None,
        current_user.id,
        current_user.role,
        current_user.organization_id,
        "view_knowledge_base",
        "manage_knowledge_base",
    )

    service = KBArticleService(db)
    skip = (page - 1) * size

    # If not an admin/manager, restrict them to viewing published articles
    # (simplification for this version)
    actual_status = status
    if current_user.role.value == "AGENT" and not status:
        actual_status = KBArticleStatus.PUBLISHED

    items, total = service.search_articles(
        current_user.organization_id,
        query,
        category_id,
        actual_status,
        visibility,
        skip,
        size,
        sort_by,
    )

    pages = math.ceil(total / size) if total > 0 else 0

    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


@router.get("/articles/{article_id}", response_model=KBArticleResponse)
def get_article(
    article_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific article by ID"""
    permission_engine.has_any_permission(
        db,
        None,
        current_user.id,
        current_user.role,
        current_user.organization_id,
        "view_knowledge_base",
        "manage_knowledge_base",
    )

    service = KBArticleService(db)
    return service.get_article(article_id, current_user.organization_id)


@router.post("/articles", response_model=KBArticleResponse, status_code=status.HTTP_201_CREATED)
def create_article(
    data: KBArticleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new article"""
    permission_engine.has_any_permission(
        db,
        None,
        current_user.id,
        current_user.role,
        current_user.organization_id,
        "create_kb_articles",
        "manage_knowledge_base",
    )

    service = KBArticleService(db)
    return service.create_article(data.model_dump(), current_user.organization_id, current_user.id)


@router.put("/articles/{article_id}", response_model=KBArticleResponse)
def update_article(
    article_id: uuid.UUID,
    data: KBArticleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an article"""
    permission_engine.has_any_permission(
        db,
        None,
        current_user.id,
        current_user.role,
        current_user.organization_id,
        "edit_kb_articles",
        "manage_knowledge_base",
    )

    service = KBArticleService(db)
    return service.update_article(
        article_id,
        data.model_dump(exclude_unset=True),
        current_user.organization_id,
        current_user.id,
        data.edit_reason,
    )


@router.post("/articles/{article_id}/workflow", response_model=KBArticleResponse)
def transition_article(
    article_id: uuid.UUID,
    data: KBArticleWorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change article status (e.g. DRAFT -> PUBLISHED)"""
    permission_engine.has_any_permission(
        db,
        None,
        current_user.id,
        current_user.role,
        current_user.organization_id,
        "publish_kb_articles",
        "manage_knowledge_base",
    )

    service = KBArticleService(db)
    return service.transition_status(
        article_id, current_user.organization_id, data.status, current_user.id
    )


@router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(
    article_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete an article"""
    permission_engine.has_any_permission(
        db,
        None,
        current_user.id,
        current_user.role,
        current_user.organization_id,
        "delete_kb_articles",
        "manage_knowledge_base",
    )

    service = KBArticleService(db)
    service.delete_article(article_id, current_user.organization_id)
    return None


# ── Versions ────────────────────────────────────────────────────────────────


@router.get("/articles/{article_id}/versions", response_model=List[KBArticleVersionResponse])
def get_article_versions(
    article_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all versions of an article"""
    permission_engine.has_any_permission(
        db,
        None,
        current_user.id,
        current_user.role,
        current_user.organization_id,
        "view_knowledge_base",
        "manage_knowledge_base",
    )

    # We just need to verify the article belongs to the org
    KBArticleService(db).get_article(article_id, current_user.organization_id)

    from src.repositories.kb_version import KBVersionRepository

    repo = KBVersionRepository(db)
    return repo.list_by_article(article_id)


@router.post("/articles/{article_id}/restore/{version}", response_model=KBArticleResponse)
def restore_article_version(
    article_id: uuid.UUID,
    version: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Restore an article to a previous version"""
    permission_engine.has_any_permission(
        db,
        None,
        current_user.id,
        current_user.role,
        current_user.organization_id,
        "edit_kb_articles",
        "manage_knowledge_base",
    )

    service = KBArticleService(db)
    return service.restore_version(
        article_id, version, current_user.organization_id, current_user.id
    )


# ── Analytics ───────────────────────────────────────────────────────────────


@router.post("/articles/{article_id}/view", status_code=status.HTTP_204_NO_CONTENT)
def record_article_view(
    article_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a view for an article"""
    service = KBArticleService(db)
    service.increment_view(article_id, current_user.organization_id)
    return None


@router.post("/articles/{article_id}/vote", status_code=status.HTTP_204_NO_CONTENT)
def vote_article(
    article_id: uuid.UUID,
    helpful: bool = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Vote on an article"""
    service = KBArticleService(db)
    service.vote_helpful(article_id, current_user.organization_id, helpful)
    return None
