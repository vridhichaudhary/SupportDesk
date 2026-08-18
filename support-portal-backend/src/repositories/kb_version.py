import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import KBArticleVersion


class KBVersionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, version_id: uuid.UUID) -> Optional[KBArticleVersion]:
        stmt = select(KBArticleVersion).where(KBArticleVersion.id == version_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_version_number(
        self, article_id: uuid.UUID, version_number: int
    ) -> Optional[KBArticleVersion]:
        stmt = select(KBArticleVersion).where(
            KBArticleVersion.article_id == article_id,
            KBArticleVersion.version_number == version_number,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_by_article(self, article_id: uuid.UUID) -> List[KBArticleVersion]:
        stmt = (
            select(KBArticleVersion)
            .where(KBArticleVersion.article_id == article_id)
            .order_by(KBArticleVersion.version_number.desc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_latest_version(self, article_id: uuid.UUID) -> Optional[KBArticleVersion]:
        stmt = (
            select(KBArticleVersion)
            .where(KBArticleVersion.article_id == article_id)
            .order_by(KBArticleVersion.version_number.desc())
            .limit(1)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, version: KBArticleVersion) -> KBArticleVersion:
        self.db.add(version)
        self.db.flush()
        return version

    def delete_by_article(self, article_id: uuid.UUID) -> None:
        stmt = select(KBArticleVersion).where(KBArticleVersion.article_id == article_id)
        versions = self.db.execute(stmt).scalars().all()
        for v in versions:
            self.db.delete(v)
        self.db.flush()
