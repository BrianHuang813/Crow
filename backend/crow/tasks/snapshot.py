import asyncio
from .celery_app import celery_app
from ..database import AsyncSessionLocal
from ..models import GridSnapshot
from ..services.grid_service import build_snapshot


@celery_app.task(name="crow.tasks.snapshot.snapshot_grid")
def snapshot_grid():
    async def _run():
        async with AsyncSessionLocal() as db:
            snapshot_data = await build_snapshot(db)
            record = GridSnapshot(snapshot_data=snapshot_data)
            db.add(record)
            await db.commit()

    asyncio.run(_run())
