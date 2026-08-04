"""
Test suite for SPEC-010: Enterprise Knowledge Base Management System.
Covers: categories CRUD, article lifecycle, version history, workflow, feedback.
"""
import uuid

from fastapi.testclient import TestClient


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _signup_and_login(client: TestClient, email: str, org_name: str) -> dict:
    """Signup as OWNER and return {access_token, org_id, user_id}."""
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "organization_name": org_name,
            "industry": "Technology",
            "first_name": "KB",
            "last_name": "Admin",
            "email": email,
            "password": "Password123!",
        },
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["data"]["access_token"]
    me = client.get("/api/v1/auth/me", headers=_auth(token)).json()["data"]
    return {"access_token": token, "org_id": me["organization_id"], "user_id": me["id"]}


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_category(client: TestClient, token: str, name: str = "Getting Started") -> dict:
    resp = client.post(
        "/api/v1/knowledge/categories",
        json={"name": name, "slug": name.lower().replace(" ", "-"), "display_order": 0},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _create_article(client: TestClient, token: str, title: str = "Hello World", category_id: str = None) -> dict:
    payload = {
        "title": title,
        "slug": title.lower().replace(" ", "-"),
        "content": "## Introduction\n\nThis is the article content.",
        "summary": "A short summary.",
        "visibility": "INTERNAL",
    }
    if category_id:
        payload["category_id"] = category_id
    resp = client.post("/api/v1/knowledge/articles", json=payload, headers=_auth(token))
    assert resp.status_code == 201, resp.text
    return resp.json()


# ─────────────────────────────────────────────────────────────────────────────
# Category Tests
# ─────────────────────────────────────────────────────────────────────────────


class TestKBCategories:
    def test_create_category(self, client: TestClient):
        ctx = _signup_and_login(client, "cat_owner@test.com", "CatOrg")
        cat = _create_category(client, ctx["access_token"])
        assert cat["name"] == "Getting Started"
        assert cat["slug"] == "getting-started"
        assert "id" in cat

    def test_list_categories(self, client: TestClient):
        ctx = _signup_and_login(client, "cat_list@test.com", "CatListOrg")
        token = ctx["access_token"]
        _create_category(client, token, "FAQs")
        _create_category(client, token, "Tutorials")
        resp = client.get("/api/v1/knowledge/categories", headers=_auth(token))
        assert resp.status_code == 200
        assert len(resp.json()) >= 2

    def test_create_category_slug_collision(self, client: TestClient):
        ctx = _signup_and_login(client, "slug_collision@test.com", "SlugOrg")
        token = ctx["access_token"]
        _create_category(client, token, "Duplicate")
        resp = client.post(
            "/api/v1/knowledge/categories",
            json={"name": "Duplicate2", "slug": "duplicate", "display_order": 0},
            headers=_auth(token),
        )
        assert resp.status_code == 409

    def test_update_category(self, client: TestClient):
        ctx = _signup_and_login(client, "cat_update@test.com", "CatUpdateOrg")
        token = ctx["access_token"]
        cat = _create_category(client, token, "Old Name")
        resp = client.put(
            f"/api/v1/knowledge/categories/{cat['id']}",
            json={"name": "New Name"},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"

    def test_subcategory(self, client: TestClient):
        ctx = _signup_and_login(client, "subcat@test.com", "SubCatOrg")
        token = ctx["access_token"]
        parent = _create_category(client, token, "Parent")
        resp = client.post(
            "/api/v1/knowledge/categories",
            json={"name": "Child", "slug": "child", "display_order": 0, "parent_id": parent["id"]},
            headers=_auth(token),
        )
        assert resp.status_code == 201
        assert resp.json()["parent_id"] == parent["id"]


# ─────────────────────────────────────────────────────────────────────────────
# Article CRUD Tests
# ─────────────────────────────────────────────────────────────────────────────


class TestKBArticleCRUD:
    def test_create_article(self, client: TestClient):
        ctx = _signup_and_login(client, "art_create@test.com", "ArtCreateOrg")
        art = _create_article(client, ctx["access_token"])
        assert art["title"] == "Hello World"
        assert art["status"] == "DRAFT"
        assert art["version"] == 1
        assert "id" in art

    def test_get_article(self, client: TestClient):
        ctx = _signup_and_login(client, "art_get@test.com", "ArtGetOrg")
        token = ctx["access_token"]
        art = _create_article(client, token)
        resp = client.get(f"/api/v1/knowledge/articles/{art['id']}", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json()["id"] == art["id"]

    def test_get_article_not_found(self, client: TestClient):
        ctx = _signup_and_login(client, "art_notfound@test.com", "ArtNFOrg")
        resp = client.get(
            f"/api/v1/knowledge/articles/{uuid.uuid4()}",
            headers=_auth(ctx["access_token"]),
        )
        assert resp.status_code == 404

    def test_list_articles(self, client: TestClient):
        ctx = _signup_and_login(client, "art_list@test.com", "ArtListOrg")
        token = ctx["access_token"]
        _create_article(client, token, "Article One")
        _create_article(client, token, "Article Two")
        resp = client.get("/api/v1/knowledge/articles", headers=_auth(token))
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] >= 2
        assert "items" in body

    def test_search_articles(self, client: TestClient):
        ctx = _signup_and_login(client, "art_search@test.com", "ArtSearchOrg")
        token = ctx["access_token"]
        _create_article(client, token, "How to reset password")
        _create_article(client, token, "Billing overview")
        resp = client.get("/api/v1/knowledge/articles?query=reset+password", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_update_article(self, client: TestClient):
        ctx = _signup_and_login(client, "art_update@test.com", "ArtUpdateOrg")
        token = ctx["access_token"]
        art = _create_article(client, token)
        resp = client.put(
            f"/api/v1/knowledge/articles/{art['id']}",
            json={"title": "Updated Title", "slug": "updated-title", "content": "New content here.", "edit_reason": "Title update"},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"

    def test_update_increments_version_when_content_changes(self, client: TestClient):
        ctx = _signup_and_login(client, "art_ver@test.com", "ArtVerOrg")
        token = ctx["access_token"]
        art = _create_article(client, token)
        assert art["version"] == 1
        updated = client.put(
            f"/api/v1/knowledge/articles/{art['id']}",
            json={"title": art["title"], "slug": art["slug"], "content": "Brand new content!"},
            headers=_auth(token),
        ).json()
        assert updated["version"] == 2

    def test_slug_collision_on_create(self, client: TestClient):
        ctx = _signup_and_login(client, "art_slugcol@test.com", "ArtSlugColOrg")
        token = ctx["access_token"]
        _create_article(client, token, "Duplicate Slug")
        resp = client.post(
            "/api/v1/knowledge/articles",
            json={"title": "Another Article", "slug": "duplicate-slug", "content": "content"},
            headers=_auth(token),
        )
        assert resp.status_code == 409

    def test_delete_article(self, client: TestClient):
        ctx = _signup_and_login(client, "art_del@test.com", "ArtDelOrg")
        token = ctx["access_token"]
        art = _create_article(client, token)
        resp = client.delete(f"/api/v1/knowledge/articles/{art['id']}", headers=_auth(token))
        assert resp.status_code == 204
        # Verify soft-deleted
        get_resp = client.get(f"/api/v1/knowledge/articles/{art['id']}", headers=_auth(token))
        assert get_resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Workflow Tests
# ─────────────────────────────────────────────────────────────────────────────


class TestKBWorkflow:
    def test_publish_article(self, client: TestClient):
        ctx = _signup_and_login(client, "wf_publish@test.com", "WFPublishOrg")
        token = ctx["access_token"]
        art = _create_article(client, token)
        assert art["status"] == "DRAFT"

        resp = client.post(
            f"/api/v1/knowledge/articles/{art['id']}/workflow",
            json={"status": "PUBLISHED"},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "PUBLISHED"
        assert data["published_at"] is not None

    def test_archive_article(self, client: TestClient):
        ctx = _signup_and_login(client, "wf_archive@test.com", "WFArchiveOrg")
        token = ctx["access_token"]
        art = _create_article(client, token)
        # Publish first
        client.post(
            f"/api/v1/knowledge/articles/{art['id']}/workflow",
            json={"status": "PUBLISHED"},
            headers=_auth(token),
        )
        # Now archive
        resp = client.post(
            f"/api/v1/knowledge/articles/{art['id']}/workflow",
            json={"status": "ARCHIVED"},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "ARCHIVED"


# ─────────────────────────────────────────────────────────────────────────────
# Version History Tests
# ─────────────────────────────────────────────────────────────────────────────


class TestKBVersions:
    def test_list_versions(self, client: TestClient):
        ctx = _signup_and_login(client, "ver_list@test.com", "VerListOrg")
        token = ctx["access_token"]
        art = _create_article(client, token)
        # Update content to create v2
        client.put(
            f"/api/v1/knowledge/articles/{art['id']}",
            json={"title": art["title"], "slug": art["slug"], "content": "New content v2"},
            headers=_auth(token),
        )
        resp = client.get(f"/api/v1/knowledge/articles/{art['id']}/versions", headers=_auth(token))
        assert resp.status_code == 200
        versions = resp.json()
        assert len(versions) >= 2

    def test_restore_version(self, client: TestClient):
        ctx = _signup_and_login(client, "ver_restore@test.com", "VerRestoreOrg")
        token = ctx["access_token"]
        art = _create_article(client, token)
        original_content = art["content"]
        # Update to v2
        client.put(
            f"/api/v1/knowledge/articles/{art['id']}",
            json={"title": art["title"], "slug": art["slug"], "content": "Content that will be replaced"},
            headers=_auth(token),
        )
        # Restore to v1
        resp = client.post(
            f"/api/v1/knowledge/articles/{art['id']}/restore/1",
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["version"] == 3  # Restore creates a new version

    def test_restore_invalid_version(self, client: TestClient):
        ctx = _signup_and_login(client, "ver_invalid@test.com", "VerInvalidOrg")
        token = ctx["access_token"]
        art = _create_article(client, token)
        resp = client.post(
            f"/api/v1/knowledge/articles/{art['id']}/restore/999",
            headers=_auth(token),
        )
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Analytics Tests
# ─────────────────────────────────────────────────────────────────────────────


class TestKBAnalytics:
    def test_record_view(self, client: TestClient):
        ctx = _signup_and_login(client, "anl_view@test.com", "AnlViewOrg")
        token = ctx["access_token"]
        art = _create_article(client, token)
        assert art["views"] == 0

        client.post(f"/api/v1/knowledge/articles/{art['id']}/view", headers=_auth(token))
        client.post(f"/api/v1/knowledge/articles/{art['id']}/view", headers=_auth(token))

        updated = client.get(f"/api/v1/knowledge/articles/{art['id']}", headers=_auth(token)).json()
        assert updated["views"] == 2

    def test_vote_helpful(self, client: TestClient):
        ctx = _signup_and_login(client, "anl_vote@test.com", "AnlVoteOrg")
        token = ctx["access_token"]
        art = _create_article(client, token)

        client.post(f"/api/v1/knowledge/articles/{art['id']}/vote?helpful=true", headers=_auth(token))
        client.post(f"/api/v1/knowledge/articles/{art['id']}/vote?helpful=false", headers=_auth(token))

        updated = client.get(f"/api/v1/knowledge/articles/{art['id']}", headers=_auth(token)).json()
        assert updated["helpful_count"] == 1
        assert updated["not_helpful_count"] == 1
