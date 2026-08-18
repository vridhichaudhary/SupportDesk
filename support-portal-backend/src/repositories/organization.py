import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models import (
    Customer,
    KBArticle,
    Organization,
    Team,
    ThreadType,
    Ticket,
    TicketStatus,
    TicketThread,
    User,
)
from src.repositories.base import BaseRepository
from src.schemas.organization import OrganizationCreate, OrganizationUpdate
from src.utils.filtering import apply_filters
from src.utils.pagination import PaginatedResult, PaginationParams
from src.utils.sorting import apply_sorting


class OrganizationRepository(BaseRepository[Organization, OrganizationCreate, OrganizationUpdate]):
    def __init__(self) -> None:
        super().__init__(Organization)

    # ------------------------------------------------------------------
    # Override BaseRepository methods — Organization has NO organization_id
    # column; it IS the root. We filter purely on id.
    # ------------------------------------------------------------------

    def get(  # type: ignore[override]
        self,
        db: Session,
        id: uuid.UUID,
        organization_id: uuid.UUID,  # kept for API compatibility; treated as id
    ) -> Optional[Organization]:
        query = select(Organization).where(
            Organization.id == id,
            Organization.deleted_at.is_(None),
        )
        return db.execute(query).scalar_one_or_none()

    def get_multi(  # type: ignore[override]
        self,
        db: Session,
        organization_id: uuid.UUID,  # ignored for cross-tenant listing
        pagination: PaginationParams,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> PaginatedResult[Organization]:
        query = select(Organization).where(Organization.deleted_at.is_(None))

        if filters:
            query = apply_filters(query, Organization, filters)

        query = apply_sorting(query, Organization, sort_by, sort_order)

        count_query = select(func.count()).select_from(query.subquery())
        total = db.execute(count_query).scalar_one()

        query = query.offset(pagination.offset).limit(pagination.limit)
        items = db.execute(query).scalars().all()

        return PaginatedResult.create(items=list(items), total=total, params=pagination)

    def create(  # type: ignore[override]
        self,
        db: Session,
        obj_in: OrganizationCreate,
        organization_id: uuid.UUID,  # used as the new org's id
    ) -> Organization:
        """
        For Organizations the caller supplies a pre-generated UUID that
        becomes both the record's id and its logical tenant root.
        """
        data = obj_in.model_dump(exclude_unset=True)
        # Serialise Pydantic special types to plain strings
        for field in ("support_email", "website", "logo_url"):
            if data.get(field) is not None:
                data[field] = str(data[field])

        org = Organization(id=organization_id, settings={}, **data)
        db.add(org)
        db.commit()
        db.refresh(org)
        return org

    def update(  # type: ignore[override]
        self,
        db: Session,
        db_obj: Organization,
        obj_in: OrganizationUpdate,
    ) -> Organization:
        data = obj_in.model_dump(exclude_unset=True)
        for field in ("support_email", "website", "logo_url"):
            if data.get(field) is not None:
                data[field] = str(data[field])
        for field, value in data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(  # type: ignore[override]
        self,
        db: Session,
        db_obj: Organization,
    ) -> None:
        db_obj.deleted_at = datetime.now(timezone.utc)
        db.add(db_obj)
        db.commit()

    # ------------------------------------------------------------------
    # Dashboard
    # ------------------------------------------------------------------

    def get_dashboard_summary(self, db: Session, organization_id: uuid.UUID) -> Dict[str, int]:
        def _count(model: Any, extra_filters: Optional[List[Any]] = None) -> int:
            q = (
                select(func.count())
                .select_from(model)
                .where(model.organization_id == organization_id)
            )
            if hasattr(model, "deleted_at"):
                q = q.where(model.deleted_at.is_(None))
            if extra_filters:
                for f in extra_filters:
                    q = q.where(f)
            result = db.execute(q).scalar()
            return result or 0

        total_teams = _count(Team)
        total_agents = _count(User)
        total_customers = _count(Customer)
        total_tickets = _count(Ticket)
        open_tickets = _count(Ticket, [Ticket.status == TicketStatus.OPEN])
        resolved_tickets = _count(Ticket, [Ticket.status == TicketStatus.RESOLVED])
        knowledge_articles = _count(KBArticle)

        # AI usage = tickets that received at least one SYSTEM_EVENT thread
        ai_usage_query = (
            select(func.count(func.distinct(TicketThread.ticket_id)))
            .join(Ticket, Ticket.id == TicketThread.ticket_id)
            .where(
                Ticket.organization_id == organization_id,
                TicketThread.thread_type == ThreadType.SYSTEM_EVENT,
            )
        )
        ai_usage = db.execute(ai_usage_query).scalar() or 0

        return {
            "total_teams": total_teams,
            "total_agents": total_agents,
            "total_customers": total_customers,
            "total_tickets": total_tickets,
            "knowledge_articles": knowledge_articles,
            "open_tickets": open_tickets,
            "resolved_tickets": resolved_tickets,
            "ai_usage": ai_usage,
        }


organization_repository = OrganizationRepository()
