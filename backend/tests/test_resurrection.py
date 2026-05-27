import pytest
import fakeredis.aioredis
from datetime import datetime, timedelta, timezone
from crow.auth import create_token
from crow.models import User, Project, GridCell
from crow.redis_client import get_redis
from crow.main import app


@pytest.fixture(autouse=True)
def override_redis():
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    app.dependency_overrides[get_redis] = lambda: fake
    yield
    app.dependency_overrides.pop(get_redis, None)


@pytest.fixture
async def dead_project_with_fossil(db):
    owner = User(github_id="res001", handle="deadowner")
    resurrector = User(github_id="res002", handle="necromancer", credits=300)
    db.add_all([owner, resurrector])
    await db.flush()

    project = Project(
        name="Dead App",
        owner_id=owner.id,
        status="dead",
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        died_at=datetime.now(timezone.utc) - timedelta(hours=1),
        color="#ac3509",
    )
    db.add(project)
    await db.flush()

    # Mark cell (5, 5) as a fossil belonging to this project
    cell = await db.get(GridCell, (5, 5))
    cell.project_id = project.id
    cell.state = "fossil"
    await db.commit()
    await db.refresh(project)
    await db.refresh(resurrector)
    return project, resurrector


@pytest.mark.asyncio
async def test_resurrect_success(client, dead_project_with_fossil):
    project, resurrector = dead_project_with_fossil
    token = create_token(str(resurrector.id))
    resp = await client.post(
        f"/api/resurrect/{project.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "alive"
    assert data["momentum"] == 0
    assert data["territory_size"] == 1


@pytest.mark.asyncio
async def test_resurrect_deducts_credits(client, db, dead_project_with_fossil):
    project, resurrector = dead_project_with_fossil
    token = create_token(str(resurrector.id))
    await client.post(
        f"/api/resurrect/{project.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    await db.refresh(resurrector)
    assert resurrector.credits == 300 - 200


@pytest.mark.asyncio
async def test_resurrect_alive_project_rejected(client, db):
    owner = User(github_id="res003", handle="aliveowner")
    db.add(owner)
    await db.flush()
    project = Project(
        name="Alive App",
        owner_id=owner.id,
        status="alive",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        color="#006a63",
    )
    db.add(project)
    await db.commit()
    token = create_token(str(owner.id))
    resp = await client.post(
        f"/api/resurrect/{project.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_resurrect_insufficient_credits_rejected(client, db, dead_project_with_fossil):
    project, _ = dead_project_with_fossil
    broke = User(github_id="res004", handle="brokeuser", credits=50)
    db.add(broke)
    await db.commit()
    token = create_token(str(broke.id))
    resp = await client.post(
        f"/api/resurrect/{project.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 402
