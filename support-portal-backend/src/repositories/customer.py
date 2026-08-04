import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import Customer
from src.repositories.base import BaseRepository
from src.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerRepository(BaseRepository[Customer, CustomerCreate, CustomerUpdate]):
    def __init__(self):
        super().__init__(Customer)

    def get_by_email(
        self, db: Session, email: str, organization_id: uuid.UUID
    ) -> Optional[Customer]:
        query = select(self.model).where(
            self.model.email == email, self.model.organization_id == organization_id
        )
        return db.execute(query).scalar_one_or_none()

    def get_or_create(
        self, db: Session, email: str, organization_id: uuid.UUID, **kwargs
    ) -> Customer:
        customer = self.get_by_email(db, email, organization_id)
        if not customer:
            # Create a new CustomerCreate internally
            # We bypass the standard create method slightly since we dynamically construct it
            customer_data = {"email": email, "organization_id": organization_id, **kwargs}
            db_obj = self.model(**customer_data)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            customer = db_obj
        return customer


customer_repository = CustomerRepository()
