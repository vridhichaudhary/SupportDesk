import uuid
from typing import Optional, Dict, Any

from sqlalchemy import select, String, or_, desc, asc
from sqlalchemy.orm import Session

from src.models import Ticket
from src.repositories.base import BaseRepository
from src.schemas.ticket import TicketCreate, TicketUpdate
from src.utils.pagination import PaginatedResult, PaginationParams


class TicketRepository(BaseRepository[Ticket, TicketCreate, TicketUpdate]):
    def __init__(self):
        super().__init__(Ticket)

    def get_by_ticket_number(
        self, db: Session, ticket_number: str, organization_id: uuid.UUID
    ) -> Optional[Ticket]:
        query = select(self.model).where(
            self.model.ticket_number == ticket_number,
            self.model.organization_id == organization_id,
            self.model.deleted_at.is_(None),
        )
        return db.execute(query).scalar_one_or_none()

    def generate_ticket_number(self, db: Session, organization_id: uuid.UUID) -> str:
        """
        Generates a semi-random but unique ticket number for the org.
        A real production system would use a Postgres sequence, but this is sufficient.
        Format: SUP-XXXXXX
        """
        import random
        import string
        
        while True:
            random_part = ''.join(random.choices(string.digits, k=6))
            candidate = f"SUP-{random_part}"
            
            # Check if it exists
            exists = db.execute(
                select(self.model).where(self.model.ticket_number == candidate)
            ).first()
            if not exists:
                return candidate

    def search(
        self,
        db: Session,
        organization_id: uuid.UUID,
        pagination: PaginationParams,
        query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> PaginatedResult[Ticket]:
        stmt = select(self.model).where(
            self.model.organization_id == organization_id,
            self.model.deleted_at.is_(None)
        )
        
        # Free-text search
        if query:
            search_term = f"%{query}%"
            # Join with customer to search by email as well (needs proper join)
            from src.models import Customer
            stmt = stmt.outerjoin(Customer, self.model.customer_id == Customer.id)
            stmt = stmt.where(
                or_(
                    self.model.subject.ilike(search_term),
                    self.model.ticket_number.ilike(search_term),
                    Customer.email.ilike(search_term),
                )
            )
            
        # Apply standard filters
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key) and value is not None:
                    stmt = stmt.where(getattr(self.model, key) == value)
                    
        # Apply Sorting
        order_col = getattr(self.model, sort_by, self.model.created_at)
        if sort_order == "desc":
            stmt = stmt.order_by(desc(order_col))
        else:
            stmt = stmt.order_by(asc(order_col))
            
        # Total count
        from sqlalchemy import func
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = db.execute(count_stmt).scalar_one()
        
        # Paginate
        stmt = stmt.offset(pagination.offset).limit(pagination.limit)
        items = db.execute(stmt).scalars().all()
        
        return PaginatedResult.create(items=list(items), total=total, params=pagination)


ticket_repository = TicketRepository()
