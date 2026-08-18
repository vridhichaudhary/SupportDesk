import uuid
from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import ThreadType, TicketThread
from src.repositories.base import BaseRepository
from src.schemas.thread import ThreadCreate, ThreadUpdate


class TicketThreadRepository(BaseRepository[TicketThread, ThreadCreate, ThreadUpdate]):
    def __init__(self):
        super().__init__(TicketThread)

    def create(self, db: Session, obj_in: ThreadCreate, organization_id: uuid.UUID) -> TicketThread:
        # TicketThread does not have organization_id
        obj_in_data = obj_in.model_dump(exclude_unset=True)
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_for_ticket(
        self, db: Session, ticket_id: uuid.UUID, include_internal: bool = False
    ) -> List[TicketThread]:
        """
        Retrieves all threads for a ticket chronologically.
        If include_internal is False, it filters out INTERNAL_NOTE.
        """
        query = select(self.model).where(self.model.ticket_id == ticket_id)

        if not include_internal:
            query = query.where(self.model.thread_type != ThreadType.INTERNAL_NOTE)

        query = query.order_by(self.model.created_at.asc())
        return list(db.execute(query).scalars().all())


thread_repository = TicketThreadRepository()
