import pytest
import fakeredis.aioredis
from crow.auth import create_token
from crow.models import User
from crow.redis_client import get_redis
from crow.main import app


@pytest.fixture(autouse=True)
def override_redis():
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    app.dependency_overrides[get_redis] = lambda: fake
    yield
    app.dependency_overrides.pop(get_redis, None)


@pytest.fixture
async def authed_user(db):
    user = User(github_id="proj001", handle="projuser")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
def auth_headers(authed_user):
    return {"Authorization": f"Bearer {create_token(str(authed_user.id))}"}


@pytest.mark.asyncio
async def test_create_project_success(client, auth_headers):
    resp = await client.post(
        "/api/projects",
        json={"name": "My App", "description": "A test app", "tech_tags": ["Python"]},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My App"
    assert data["status"] == "alive"
    assert data["momentum"] == 0
    assert data["territory_size"] == 1
    assert data["color"] is not None


@pytest.mark.asyncio
async def test_create_project_rejects_duplicate(client, auth_headers):
    await client.post("/api/projects", json={"name": "First App"}, headers=auth_headers)
    resp = await client.post("/api/projects", json={"name": "Second App"}, headers=auth_headers)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_get_my_project_returns_active(client, auth_headers):
    await client.post("/api/projects", json={"name": "Mine"}, headers=auth_headers)
    resp = await client.get("/api/projects/mine", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Mine"


@pytest.mark.asyncio
async def test_abandon_project(client, auth_headers):
    create_resp = await client.post("/api/projects", json={"name": "Doomed App"}, headers=auth_headers)
    project_id = create_resp.json()["id"]
    resp = await client.patch(f"/api/projects/{project_id}/abandon", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "dead"


@pytest.mark.asyncio
async def test_get_my_project_after_abandon_returns_none(client, auth_headers):
    create_resp = await client.post("/api/projects", json={"name": "Gone App"}, headers=auth_headers)
    project_id = create_resp.json()["id"]
    await client.patch(f"/api/projects/{project_id}/abandon", headers=auth_headers)
    resp = await client.get("/api/projects/mine", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() is None


@pytest.mark.asyncio
async def test_get_project_by_id(client, auth_headers):
    create_resp = await client.post("/api/projects", json={"name": "Findable"}, headers=auth_headers)
    project_id = create_resp.json()["id"]
    resp = await client.get(f"/api/projects/{project_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Findable"


@pytest.mark.asyncio
async def test_get_project_not_found(client):
    resp = await client.get("/api/projects/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_unauthenticated_cannot_create_project(client):
    resp = await client.post("/api/projects", json={"name": "Sneaky"})
    assert resp.status_code == 401
