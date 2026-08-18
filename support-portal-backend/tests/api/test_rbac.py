import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.core.permissions import PERMISSION_REGISTRY
from src.core.security import create_access_token
from src.models import Organization, User, UserRole, UserRoleAssignment
from src.repositories.rbac import role_permission_repo, role_repo


def create_test_user(db: Session, org_id: uuid.UUID, role: UserRole, email: str) -> User:
    user = User(
        email=email,
        password_hash="hashed",
        first_name="Test",
        last_name="User",
        organization_id=org_id,
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Assign the corresponding system role to the user
    system_role = role_repo.get_by_name_system(db, role.value)
    if system_role:
        assignment = UserRoleAssignment(
            user_id=user.id, organization_id=org_id, role_id=system_role.id
        )
        db.add(assignment)
        db.commit()

    return user


@pytest.fixture
def test_org(db_session: Session) -> Organization:
    org = Organization(name="Test Org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture
def owner_user(db_session: Session, test_org: Organization) -> User:
    return create_test_user(db_session, test_org.id, UserRole.OWNER, "owner@example.com")


@pytest.fixture
def admin_user(db_session: Session, test_org: Organization) -> User:
    return create_test_user(db_session, test_org.id, UserRole.ADMIN, "admin@example.com")


@pytest.fixture
def agent_user(db_session: Session, test_org: Organization) -> User:
    return create_test_user(db_session, test_org.id, UserRole.AGENT, "agent@example.com")


def get_token_headers(user: User) -> dict:
    token = create_access_token(
        user_id=user.id, organization_id=user.organization_id, role=user.role.value
    )
    return {"Authorization": f"Bearer {token}"}


# ── Tests ────────────────────────────────────────────────────────────────────


def test_list_permissions(client: TestClient, owner_user: User):
    """Owner has manage_roles permission."""
    headers = get_token_headers(owner_user)
    response = client.get("/api/v1/rbac/permissions", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["permissions"]) == len(PERMISSION_REGISTRY)
    assert "Users" in data["grouped"]


def test_permission_denied_raises_403(client: TestClient, agent_user: User):
    """Agent does NOT have manage_roles permission."""
    headers = get_token_headers(agent_user)
    response = client.get("/api/v1/rbac/permissions", headers=headers)
    assert response.status_code == 403
    assert "You do not have permission" in response.json()["error"]["message"]


def test_get_permission_matrix(client: TestClient, owner_user: User):
    headers = get_token_headers(owner_user)
    response = client.get("/api/v1/rbac/permissions/matrix", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "OWNER" in data["matrix"]
    assert len(data["matrix"]["OWNER"]) == len(PERMISSION_REGISTRY)


def test_list_roles(client: TestClient, owner_user: User):
    headers = get_token_headers(owner_user)
    response = client.get("/api/v1/rbac/roles", headers=headers)
    assert response.status_code == 200
    roles = response.json()["data"]
    role_names = [r["name"] for r in roles]
    assert "OWNER" in role_names
    assert "ADMIN" in role_names
    assert "AGENT" in role_names


def test_create_custom_role(client: TestClient, owner_user: User):
    headers = get_token_headers(owner_user)
    payload = {
        "name": "Senior Agent",
        "description": "Can also delete tickets",
        "initial_permissions": ["create_tickets", "reply_tickets", "delete_tickets"],
    }
    response = client.post("/api/v1/rbac/roles", json=payload, headers=headers)
    assert response.status_code == 201
    role = response.json()["data"]
    assert role["name"] == "Senior Agent"
    assert role["is_custom"] is True
    assert set(role["permissions"]) == {"create_tickets", "reply_tickets", "delete_tickets"}


def test_create_custom_role_escalation_fails(
    client: TestClient, admin_user: User, db_session: Session
):
    # First give admin 'manage_roles' so they can hit the endpoint,
    # but they still can't grant 'manage_organization'
    role = role_repo.get_by_name_system(db_session, "ADMIN")
    role_permission_repo.grant(db_session, role.id, "manage_roles")
    db_session.commit()

    headers = get_token_headers(admin_user)
    payload = {
        "name": "God Mode",
        # Admin does NOT have 'manage_organization' permission, so they cannot grant it
        "initial_permissions": ["manage_organization"],
    }
    response = client.post("/api/v1/rbac/roles", json=payload, headers=headers)
    assert response.status_code == 403
    assert "do not hold it yourself" in response.json()["error"]["message"]


def test_update_custom_role(client: TestClient, owner_user: User, db_session: Session):
    # Owner creates a role
    headers_owner = get_token_headers(owner_user)
    res1 = client.post("/api/v1/rbac/roles", json={"name": "Temp Role"}, headers=headers_owner)
    role_id = res1.json()["data"]["id"]

    # Owner updates it
    res2 = client.patch(
        f"/api/v1/rbac/roles/{role_id}", json={"name": "Temp Role Updated"}, headers=headers_owner
    )
    assert res2.status_code == 200
    assert res2.json()["data"]["name"] == "Temp Role Updated"


def test_delete_system_role_fails(client: TestClient, owner_user: User, db_session: Session):
    headers = get_token_headers(owner_user)
    system_role = role_repo.get_by_name_system(db_session, "ADMIN")

    response = client.delete(f"/api/v1/rbac/roles/{system_role.id}", headers=headers)
    assert response.status_code == 422
    assert "System roles cannot be deleted" in response.json()["error"]["message"]


def test_grant_and_revoke_permission(client: TestClient, owner_user: User, admin_user: User):
    # Create role
    headers_owner = get_token_headers(owner_user)
    res1 = client.post("/api/v1/rbac/roles", json={"name": "Test Role"}, headers=headers_owner)
    role_id = res1.json()["data"]["id"]

    # Grant permission
    res2 = client.post(
        f"/api/v1/rbac/roles/{role_id}/permissions",
        json={"codename": "view_analytics"},
        headers=headers_owner,
    )
    assert res2.status_code == 201

    # Revoke permission
    res3 = client.delete(
        f"/api/v1/rbac/roles/{role_id}/permissions/view_analytics", headers=headers_owner
    )
    assert res3.status_code == 200


def test_assign_role_to_user(
    client: TestClient, owner_user: User, agent_user: User, db_session: Session
):
    # Owner assigns AGENT to another custom role
    headers = get_token_headers(owner_user)

    res1 = client.post("/api/v1/rbac/roles", json={"name": "L2 Agent"}, headers=headers)
    role_id = res1.json()["data"]["id"]

    res2 = client.post(
        f"/api/v1/rbac/users/{agent_user.id}/role", json={"role_id": role_id}, headers=headers
    )
    assert res2.status_code == 201


def test_get_my_permissions(client: TestClient, agent_user: User):
    headers = get_token_headers(agent_user)
    response = client.get("/api/v1/rbac/users/me/permissions", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]

    assert data["role"] == "AGENT"
    assert "create_tickets" in data["permissions"]
    assert "manage_organization" not in data["permissions"]


def test_cross_tenant_access_blocked(client: TestClient, db_session: Session):
    # Create Org 1 and User
    org1 = Organization(name="Org 1")
    db_session.add(org1)
    db_session.commit()
    user1 = create_test_user(db_session, org1.id, UserRole.OWNER, "user1@example.com")

    # Create Org 2 and User
    org2 = Organization(name="Org 2")
    db_session.add(org2)
    db_session.commit()
    user2 = create_test_user(db_session, org2.id, UserRole.OWNER, "user2@example.com")

    # User 1 tries to access User 2's permissions
    headers = get_token_headers(user1)
    response = client.get(f"/api/v1/rbac/users/{user2.id}/permissions", headers=headers)
    assert response.status_code == 404
