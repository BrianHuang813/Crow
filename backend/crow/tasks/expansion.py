import asyncio
from .celery_app import celery_app
from ..database import AsyncSessionLocal
from ..services.expansion import run_expansion
from ..redis_client import get_redis
from ..services.grid_service import invalidate_cache


@celery_app.task(name="crow.tasks.expansion.check_expansion")
def check_expansion(project_id: str):
    async def _run():
        async with AsyncSessionLocal() as db:
            expanded = await run_expansion(project_id, db)
            if expanded:
                r = await get_redis()
                await invalidate_cache(r)

    asyncio.run(_run())
