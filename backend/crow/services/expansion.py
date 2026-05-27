import random
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models import Project, GridCell
from ..config import settings

NEIGHBORS = [(-1, 0), (1, 0), (0, -1), (0, 1)]


async def run_expansion(project_id: str, db: AsyncSession) -> bool:
    """
    If project momentum >= 100, claim one adjacent empty or fossil cell.
    Prefers empty cells over fossil cells. Returns True if expansion occurred.
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project or project.momentum < 100 or project.status == "dead":
        return False

    cells_result = await db.execute(
        select(GridCell).where(
            GridCell.project_id == project.id,
            GridCell.state.in_(["alive", "dying"]),
        )
    )
    owned_cells = cells_result.scalars().all()

    # Collect adjacent eligible cells, deduplicated
    seen: set[tuple[int, int]] = set()
    candidates: dict[str, list[tuple[int, int]]] = {"empty": [], "fossil": []}
    for cell in owned_cells:
        for dx, dy in NEIGHBORS:
            nx, ny = cell.x + dx, cell.y + dy
            if not (0 <= nx < settings.grid_width and 0 <= ny < settings.grid_height):
                continue
            if (nx, ny) in seen:
                continue
            neighbor_result = await db.execute(
                select(GridCell).where(GridCell.x == nx, GridCell.y == ny)
            )
            neighbor = neighbor_result.scalar_one_or_none()
            if neighbor and neighbor.state in ("empty", "fossil"):
                seen.add((nx, ny))
                candidates[neighbor.state].append((nx, ny))

    eligible = candidates["empty"] or candidates["fossil"]
    if not eligible:
        return False

    tx, ty = random.choice(eligible)
    target_result = await db.execute(select(GridCell).where(GridCell.x == tx, GridCell.y == ty))
    target = target_result.scalar_one()
    target.project_id = project.id
    target.state = "alive"
    target.claimed_at = datetime.now(timezone.utc)

    project.momentum -= 100
    project.territory_size += 1
    await db.commit()
    return True
