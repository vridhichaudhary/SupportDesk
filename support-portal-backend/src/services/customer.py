import uuid
from typing import Optional

from sqlalchemy.orm import Session

from src.models import Customer
from src.repositories.customer import customer_repository
from src.schemas.customer import CustomerCreate, CustomerUpdate
from src.services.base import BaseService


class CustomerService(BaseService[Customer, CustomerCreate, CustomerUpdate]):
    def __init__(self):
        super().__init__(customer_repository)

    def get_by_email(
        self, db: Session, email: str, organization_id: uuid.UUID
    ) -> Optional[Customer]:
        return self.repository.get_by_email(db, email, organization_id)

    def get_or_create(
        self, db: Session, email: str, organization_id: uuid.UUID, **kwargs
    ) -> Customer:
        return self.repository.get_or_create(db, email, organization_id, **kwargs)


customer_service = CustomerService()
