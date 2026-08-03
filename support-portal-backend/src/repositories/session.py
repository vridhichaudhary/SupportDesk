import uuid
from datetime import datetime
from typing import Any, List, Optional

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.models import UserSession
from src.repositories.base import BaseRepository


class SessionRepository(BaseRepository[UserSession, Any, Any]):
    def __init__(self) -> None:
        super().__init__(UserSession)

    def get_by_token_hash(self, db: Session, token_hash: str) -> Optional[UserSession]:
        query = select(UserSession).where(
            UserSession.refresh_token_hash == token_hash,
            UserSession.is_revoked.is_(False),
            UserSession.expires_at > datetime.utcnow(),
        )
        return db.execute(query).scalar_one_or_none()

    def get_user_sessions(self, db: Session, user_id: uuid.UUID) -> List[UserSession]:
        query = (
            select(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.is_revoked.is_(False),
                UserSession.expires_at > datetime.utcnow(),
            )
            .order_by(UserSession.last_accessed_at.desc())
        )
        return list(db.execute(query).scalars().all())

    def revoke_session(self, db: Session, session_id: uuid.UUID) -> None:
        db.execute(update(UserSession).where(UserSession.id == session_id).values(is_revoked=True))
        db.commit()

    def revoke_all_user_sessions(self, db: Session, user_id: uuid.UUID) -> None:
        db.execute(
            update(UserSession).where(UserSession.user_id == user_id).values(is_revoked=True)
        )
        db.commit()


session_repository = SessionRepository()
