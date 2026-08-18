import uuid
from datetime import timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import AuthToken, AuthTokenType, User
from src.repositories.base import BaseRepository


class UserRepository(BaseRepository[User, Any, Any]):
    def __init__(self) -> None:
        super().__init__(User)

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        query = select(User).where(
            User.email == email.lower().strip(),
            User.deleted_at.is_(None),
        )
        return db.execute(query).scalar_one_or_none()

    def get_by_id(self, db: Session, user_id: uuid.UUID) -> Optional[User]:
        query = select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
        )
        return db.execute(query).scalar_one_or_none()

    def create_auth_token(
        self,
        db: Session,
        user_id: uuid.UUID,
        token_hash: str,
        token_type: AuthTokenType,
        expires_at: Any,
    ) -> AuthToken:
        token = AuthToken(
            user_id=user_id,
            token_hash=token_hash,
            token_type=token_type,
            expires_at=expires_at,
        )
        db.add(token)
        db.commit()
        db.refresh(token)
        return token

    def get_auth_token(
        self, db: Session, token_hash: str, token_type: AuthTokenType
    ) -> Optional[AuthToken]:
        from datetime import datetime

        query = select(AuthToken).where(
            AuthToken.token_hash == token_hash,
            AuthToken.token_type == token_type,
            AuthToken.is_used.is_(False),
            AuthToken.expires_at > datetime.now(timezone.utc),
        )
        return db.execute(query).scalar_one_or_none()


user_repository = UserRepository()
