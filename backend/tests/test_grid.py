import pytest
import fakeredis.aioredis
from crow.redis_client import get_redis
from crow.main import app


@pytest.fixture(autouse=True)
def override_redis():
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    app.dependency_overrides[get_redis] = lambda: fake
    yield
    app.dependency_overrides.pop(get_redis, None)


@pytest.mark.asyncio
async def test_get_grid_returns_3600_cells(client):
    response = await client.get("/api/grid")
    assert response.status_code == 200
    data = response.json()
    assert data["width"] == 60
    assert data["height"] == 60
    assert len(data["cells"]) == 3600


@pytest.mark.asyncio
async def test_get_grid_all_empty_initially(client):
    response = await client.get("/api/grid")
    cells = response.json()["cells"]
    assert all(c["state"] == "empty" for c in cells)
    assert all(c["project_id"] is None for c in cells)
