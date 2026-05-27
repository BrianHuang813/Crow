import asyncio
import json
from .celery_app import celery_app
from ..database import AsyncSessionLocal
from ..services.grid_service import build_snapshot, GRID_CACHE_KEY
from ..redis_client import get_redis
from ..config import settings


@celery_app.task(name="crow.tasks.grid_cache.refresh_grid_cache")
def refresh_grid_cache():
    async def _run():
        async with AsyncSessionLocal() as db:
            snapshot = await build_snapshot(db)
            r = await get_redis()
            await r.setex(GRID_CACHE_KEY, settings.grid_cache_ttl_seconds, json.dumps(snapshot))

    asyncio.run(_run())
