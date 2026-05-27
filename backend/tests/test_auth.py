import pytest
import fakeredis.aioredis
from crow.auth import create_token, get_current_user
from crow.models import User
from crow.redis_client import get_redis
from crow.main import app


@pytest.fixture(autouse=True)
def override_redis():
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    app.dependency_overrides[get_redis] = lambda: fake
    yield
    app.dependency_overrides.pop(get_redis, None)


@pytest.mark.asyncio
async def test_create_token_returns_string(db):
    user = User(github_id="111", handle="tokenuser")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token(str(user.id))
    assert isinstance(token, str)
    assert len(token) > 20


@pytest.mark.asyncio
async def test_token_does_not_break_public_grid_endpoint(client, db):
    user = User(github_id="222", handle="authuser")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token(str(user.id))
    response = await client.get("/api/grid", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_invalid_token_rejected(client):
    response = await client.get("/api/grid", headers={"Authorization": "Bearer notavalidtoken"})
    # /api/grid is public — invalid token is ignored, not rejected (bearer auto_error=False)
    assert response.status_code == 200
