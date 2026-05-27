import asyncio
from datetime import datetime, timedelta, timezone
from .celery_app import celery_app
from ..database import AsyncSessionLocal
from ..models import Project, GridCell
from ..config import settings
from sqlalchemy import select, update
from ..redis_client import get_redis
from ..services.grid_service import invalidate_cache


@celery_app.task(name="crow.tasks.decay.decay_check")
def decay_check():
    async def _run():
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            dying_threshold = now + timedelta(hours=settings.dying_threshold_hours)
            changed = False

            # alive → dying (expires within threshold window)
            alive_result = await db.execute(
                select(Project).where(
                    Project.status == "alive",
                    Project.expires_at <= dying_threshold,
                )
            )
            for project in alive_result.scalars().all():
                project.status = "dying"
                await db.execute(
                    update(GridCell)
                    .where(GridCell.project_id == project.id, GridCell.state == "alive")
                    .values(state="dying")
                )
                changed = True

            # dying → dead (timer fully expired)
            dead_result = await db.execute(
                select(Project).where(Project.status == "dying", Project.expires_at <= now)
            )
            for project in dead_result.scalars().all():
                project.status = "dead"
                project.died_at = now
                await db.execute(
                    update(GridCell)
                    .where(GridCell.project_id == project.id, GridCell.state == "dying")
                    .values(state="fossil")
                )
                changed = True

            await db.commit()

            if changed:
                r = await get_redis()
                await invalidate_cache(r)

    asyncio.run(_run())
