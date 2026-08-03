import uuid
from typing import Dict

from sqlalchemy.orm import Session

from src.models import ActionType, Organization
from src.repositories.organization import OrganizationRepository, organization_repository
from src.schemas.organization import OrganizationCreate, OrganizationSettings, OrganizationUpdate
from src.services.audit_log import audit_log_service
from src.services.base import BaseService


class OrganizationService(BaseService[Organization, OrganizationCreate, OrganizationUpdate]):
    def __init__(self, repository: OrganizationRepository) -> None:
        super().__init__(repository)

    # ------------------------------------------------------------------
    # Create — generates a self-referential tenant root
    # ------------------------------------------------------------------
    def create_organization(self, db: Session, obj_in: OrganizationCreate) -> Organization:
        """
        Creates a brand-new Organization. Generates a fresh UUID that
        serves as both the record primary key and its tenant root id.
        """
        new_id = uuid.uuid4()
        org = self.repository.create(db, obj_in=obj_in, organization_id=new_id)

        audit_log_service.log_action(
            db=db,
            organization_id=org.id,
            action_type=ActionType.CREATE,
            entity_type="Organization",
            entity_id=org.id,
            changes=obj_in.model_dump(mode="json", exclude_none=True),
        )
        return org

    # ------------------------------------------------------------------
    # Update profile
    # ------------------------------------------------------------------
    def update(  # type: ignore[override]
        self,
        db: Session,
        id: uuid.UUID,
        obj_in: OrganizationUpdate,
        organization_id: uuid.UUID,
    ) -> Organization:
        org = self.get_or_404(db, id, organization_id)
        updated = self.repository.update(db, db_obj=org, obj_in=obj_in)

        audit_log_service.log_action(
            db=db,
            organization_id=updated.id,
            action_type=ActionType.UPDATE,
            entity_type="Organization",
            entity_id=updated.id,
            changes=obj_in.model_dump(exclude_unset=True, mode="json"),
        )
        return updated

    # ------------------------------------------------------------------
    # Settings (merge, not replace)
    # ------------------------------------------------------------------
    def update_settings(
        self,
        db: Session,
        id: uuid.UUID,
        settings_in: OrganizationSettings,
        organization_id: uuid.UUID,
    ) -> Organization:
        org = self.get_or_404(db, id, organization_id)

        current = dict(org.settings or {})
        current.update(settings_in.model_dump(exclude_unset=True))
        org.settings = current
        db.add(org)
        db.commit()
        db.refresh(org)

        audit_log_service.log_action(
            db=db,
            organization_id=org.id,
            action_type=ActionType.UPDATE,
            entity_type="OrganizationSettings",
            entity_id=org.id,
            changes=settings_in.model_dump(exclude_unset=True, mode="json"),
        )
        return org

    # ------------------------------------------------------------------
    # Soft Delete
    # ------------------------------------------------------------------
    def delete(  # type: ignore[override]
        self,
        db: Session,
        id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> None:
        org = self.get_or_404(db, id, organization_id)
        self.repository.delete(db, db_obj=org)

        audit_log_service.log_action(
            db=db,
            organization_id=id,
            action_type=ActionType.DELETE,
            entity_type="Organization",
            entity_id=id,
        )

    # ------------------------------------------------------------------
    # Dashboard
    # ------------------------------------------------------------------
    def get_dashboard_summary(
        self,
        db: Session,
        id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> Dict[str, int]:
        self.get_or_404(db, id, organization_id)
        return self.repository.get_dashboard_summary(db, id)  # type: ignore[return-value]


organization_service = OrganizationService(organization_repository)
