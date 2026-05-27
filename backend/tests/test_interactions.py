import pytest
import fakeredis.aioredis
from datetime import datetime, timedelta, timezone
from crow.auth import create_token
from crow.models import User, Project
from crow.redis_client import get_redis
from crow.main import app


@pytest.fixture(autouse=True)
def override_redis():
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    app.dependency_overrides[get_redis] = lambda: fake
    yield
    app.dependency_overrides.pop(get_redis, None)


@pytest.fixture
async def user_and_project(db):
    owner = User(github_id="int001", handle="owner")
    clicker = User(github_id="int002", handle="clicker", credits=100)
    db.add_all([owner, clicker])
    await db.flush()
    project = Project(
        name="Clickable",
        owner_id=owner.id,
        status="alive",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
        color="#ac3509",
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    await db.refresh(owner)
    await db.refresh(clicker)
    return owner, clicker, project


@pytest.mark.asyncio
async def test_click_adds_momentum_and_time(client, user_and_project):
    owner, clicker, project = user_and_project
    token = create_token(str(clicker.id))
    resp = await client.post(
        f"/api/interact/{project.id}",
        json={"type": "click"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["momentum_added"] == 5
    assert data["time_added_seconds"] == 300
    assert data["credits_earned"] == 5
    assert data["new_momentum"] == 5


@pytest.mark.asyncio
async def test_click_on_own_project_earns_no_credits(client, user_and_project):
    owner, clicker, project = user_and_project
    token = create_token(str(owner.id))
    resp = await client.post(
        f"/api/interact/{project.id}",
        json={"type": "click"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["credits_earned"] == 0


@pytest.mark.asyncio
async def test_boost_adds_more_momentum(client, user_and_project):
    owner, clicker, project = user_and_project
    token = create_token(str(clicker.id))
    resp = await client.post(
        f"/api/interact/{project.id}",
        json={"type": "boost"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["momentum_added"] == 25
    assert data["time_added_seconds"] == 1800
    assert data["credits_earned"] == 0


@pytest.mark.asyncio
async def test_boost_requires_enough_credits(client, db, user_and_project):
    owner, clicker, project = user_and_project
    broke = User(github_id="int003", handle="broke", credits=5)
    db.add(broke)
    await db.commit()
    token = create_token(str(broke.id))
    resp = await client.post(
        f"/api/interact/{project.id}",
        json={"type": "boost"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 402


@pytest.mark.asyncio
async def test_click_cooldown_enforced(client, user_and_project):
    owner, clicker, project = user_and_project
    token = create_token(str(clicker.id))
    headers = {"Authorization": f"Bearer {token}"}
    first = await client.post(f"/api/interact/{project.id}", json={"type": "click"}, headers=headers)
    assert first.status_code == 200
    second = await client.post(f"/api/interact/{project.id}", json={"type": "click"}, headers=headers)
    assert second.status_code == 429


@pytest.mark.asyncio
async def test_interact_with_dead_project_rejected(client, db, user_and_project):
    owner, clicker, project = user_and_project
    project.status = "dead"
    await db.commit()
    token = create_token(str(clicker.id))
    resp = await client.post(
        f"/api/interact/{project.id}",
        json={"type": "click"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 409
