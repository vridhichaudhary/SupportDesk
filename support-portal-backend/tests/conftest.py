from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.core.database import Base
from src.core.dependencies import get_db, get_redis
from src.main import app

# Use an in-memory SQLite database for fast, always-fresh isolated testing
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    # Required to keep the in-memory DB alive for the entire session
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)

    # Seed RBAC tables since tests don't run alembic migrations

    from src.core.permissions import DEFAULT_ROLE_PERMISSIONS, PERMISSION_REGISTRY
    from src.models import Permission, Role, RolePermission, UserRole

    with TestingSessionLocal() as db:
        if not db.query(Permission).first():
            # 1. Seed Permissions
            for p in PERMISSION_REGISTRY:
                db.add(
                    Permission(
                        codename=p.codename,
                        display_name=p.display_name,
                        description=p.description,
                        module=p.module,
                    )
                )

            # 2. Seed System Roles and Role Permissions
            role_map = {}
            for role_enum in [UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER]:
                role = Role(
                    name=role_enum.value,
                    description=f"System {role_enum.value} role",
                    is_system=True,
                    is_custom=False,
                )
                db.add(role)
                role_map[role_enum.value] = role

            db.commit()

            for role_enum, codenames in DEFAULT_ROLE_PERMISSIONS.items():
                role = role_map[role_enum.value]
                for codename in codenames:
                    db.add(RolePermission(role_id=role.id, permission_codename=codename))
            db.commit()

    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine) -> Generator:
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


class MockRedis:
    def __init__(self):
        self._data = {}

    def ping(self):
        return True

    def close(self):
        pass

    def get(self, key):
        return self._data.get(key)

    def setex(self, key, time, value):
        self._data[key] = value

    def delete(self, *keys):
        for key in keys:
            self._data.pop(key, None)


@pytest.fixture(scope="function")
def client(db_session) -> Generator:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_get_redis():
        yield MockRedis()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = override_get_redis

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
