import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from src.core.exceptions import ResourceNotFoundException, ValidationException
from src.core.security import hash_password, validate_password_complexity, verify_password
from src.models import ActionType, User
from src.repositories.user import UserRepository, user_repository
from src.schemas.user import UserPreferencesUpdateRequest, UserUpdateProfileRequest
from src.services.audit_log import audit_log_service
from src.services.base import BaseService
from src.services.storage import storage_provider


class UserService(BaseService[User, Any, Any]):
    def __init__(self, repository: UserRepository) -> None:
        super().__init__(repository)

    def get_by_id(self, db: Session, user_id: uuid.UUID) -> User:
        user = self.repository.get_by_id(db, user_id)
        if not user:
            raise ResourceNotFoundException("User not found")
        return user

    def update_profile(self, db: Session, user: User, payload: UserUpdateProfileRequest) -> User:
        data = payload.model_dump(exclude_unset=True)
        for field, value in data.items():
            setattr(user, field, value)

        if payload.first_name or payload.last_name:
            user.display_name = f"{user.first_name or ''} {user.last_name or ''}".strip()

        db.add(user)
        db.commit()
        db.refresh(user)

        audit_log_service.log_action(
            db=db,
            organization_id=user.organization_id,
            action_type=ActionType.PROFILE_UPDATE,
            entity_type="User",
            entity_id=user.id,
            actor_id=user.id,
            changes=data,
        )
        return user

    def update_preferences(
        self, db: Session, user: User, payload: UserPreferencesUpdateRequest
    ) -> User:
        data = payload.model_dump(exclude_unset=True)
        if "notification_preferences" in data and data["notification_preferences"] is not None:
            current = dict(user.notification_preferences or {})
            current.update(data["notification_preferences"])
            user.notification_preferences = current
            del data["notification_preferences"]

        for field, value in data.items():
            setattr(user, field, value)

        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def upload_avatar(
        self, db: Session, user: User, file_content: bytes, filename: str, content_type: str
    ) -> User:
        # Delete old avatar if stored
        if user.avatar_url:
            storage_provider.delete_file(user.avatar_url)

        avatar_url = storage_provider.upload_file(file_content, filename, content_type)
        user.avatar_url = avatar_url

        db.add(user)
        db.commit()
        db.refresh(user)

        audit_log_service.log_action(
            db=db,
            organization_id=user.organization_id,
            action_type=ActionType.AVATAR_CHANGE,
            entity_type="User",
            entity_id=user.id,
            actor_id=user.id,
            changes={"avatar_url": avatar_url},
        )
        return user

    def change_password(
        self, db: Session, user: User, current_password: str, new_password: str
    ) -> None:
        if not verify_password(current_password, user.password_hash):
            raise ValidationException("Incorrect current password")

        validate_password_complexity(new_password)
        user.password_hash = hash_password(new_password)

        db.add(user)
        db.commit()

        audit_log_service.log_action(
            db=db,
            organization_id=user.organization_id,
            action_type=ActionType.PASSWORD_CHANGE,
            entity_type="User",
            entity_id=user.id,
            actor_id=user.id,
        )

    def delete_account(self, db: Session, user: User) -> None:
        user.is_active = False
        user.deleted_at = datetime.now(timezone.utc)
        db.add(user)
        db.commit()


user_service = UserService(user_repository)
