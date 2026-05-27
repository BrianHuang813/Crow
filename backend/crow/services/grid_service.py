import json
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models import GridCell, Project
from ..config import settings
import redis.asyncio as redis

GRID_CACHE_KEY = "crow:grid:snapshot"


async def build_snapshot(db: AsyncSession) -> dict:
    """Rebuild the full grid snapshot from PostgreSQL."""
    cells_result = await db.execute(select(GridCell))
    cells = {(c.x, c.y): c for c in cells_result.scalars().all()}

    # Fetch all projects at once to avoid N+1
    project_ids = {c.project_id for c in cells.values() if c.project_id is not None}
    projects: dict = {}
    if project_ids:
        proj_result = await db.execute(select(Project).where(Project.id.in_(project_ids)))
        projects = {p.id: p for p in proj_result.scalars().all()}

    snapshot_cells = []
    for y in range(settings.grid_height):
        for x in range(settings.grid_width):
            cell = cells.get((x, y))
            if cell is None or cell.state == "empty":
                snapshot_cells.append({"x": x, "y": y, "state": "empty", "project_id": None, "color": None})
            else:
                project = projects.get(cell.project_id)
                color = project.color if project else "#3a3a3a"
                snapshot_cells.append({
                    "x": x, "y": y,
                    "state": cell.state,
                    "project_id": str(cell.project_id) if cell.project_id else None,
                    "color": color,
                })

    return {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "width": settings.grid_width,
        "height": settings.grid_height,
        "cells": snapshot_cells,
    }


async def get_snapshot(db: AsyncSession, r: redis.Redis) -> dict:
    """Return cached snapshot or rebuild from DB."""
    cached = await r.get(GRID_CACHE_KEY)
    if cached:
        return json.loads(cached)
    snapshot = await build_snapshot(db)
    await r.setex(GRID_CACHE_KEY, settings.grid_cache_ttl_seconds, json.dumps(snapshot))
    return snapshot


async def invalidate_cache(r: redis.Redis) -> None:
    await r.delete(GRID_CACHE_KEY)


async def seed_empty_grid(db: AsyncSession) -> None:
    """Populate grid_cells with empty cells if table is empty. Run once after migration."""
    existing = await db.execute(select(GridCell).limit(1))
    if existing.scalar_one_or_none() is not None:
        return
    cells = [
        GridCell(x=x, y=y, state="empty")
        for y in range(settings.grid_height)
        for x in range(settings.grid_width)
    ]
    db.add_all(cells)
    await db.commit()
