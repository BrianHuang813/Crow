from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import redis.asyncio as redis

from ..database import get_db
from ..redis_client import get_redis
from ..auth import get_current_user
from ..models import User, Project, GridCell
from ..schemas.project import ProjectCreate, ProjectOut
from ..palette import pick_color
from ..config import settings
from ..services.grid_service import invalidate_cache

router = APIRouter()


async def _get_random_empty_cell(db: AsyncSession) -> GridCell | None:
    result = await db.execute(
        select(GridCell).where(GridCell.state == "empty").order_by(func.random()).limit(1)
    )
    return result.scalar_one_or_none()


@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    r: redis.Redis = Depends(get_redis),
):
    # Enforce 1-project-per-user limit
    existing = await db.execute(
        select(Project).where(Project.owner_id == user.id, Project.status.in_(["alive", "dying"]))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You already have an active project. Abandon it first.")

    # Find an empty cell
    cell = await _get_random_empty_cell(db)
    if cell is None:
        raise HTTPException(status_code=503, detail="Grid is currently full — try again when a project dies.")

    # Pick a color not recently used (rough approximation: last 10 projects)
    recent_colors_result = await db.execute(
        select(Project.color).order_by(Project.created_at.desc()).limit(10)
    )
    recent_colors = [row[0] for row in recent_colors_result.all()]
    color = pick_color(exclude=recent_colors)

    project = Project(
        name=body.name,
        description=body.description,
        url=body.url,
        tech_tags=body.tech_tags,
        owner_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.initial_lifespan_hours),
        color=color,
    )
    db.add(project)
    await db.flush()

    cell.project_id = project.id
    cell.state = "alive"
    cell.claimed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)
    await invalidate_cache(r)
    return project


@router.get("/projects/mine", response_model=ProjectOut | None)
async def get_my_project(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.owner_id == user.id, Project.status.in_(["alive", "dying"]))
    )
    return result.scalar_one_or_none()


@router.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/projects/{project_id}/abandon", response_model=ProjectOut)
async def abandon_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    r: redis.Redis = Depends(get_redis),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your project")
    if project.status == "dead":
        raise HTTPException(status_code=409, detail="Project is already dead")

    project.status = "dead"
    project.died_at = datetime.now(timezone.utc)

    cells_result = await db.execute(select(GridCell).where(GridCell.project_id == project.id))
    for cell in cells_result.scalars().all():
        cell.state = "fossil"

    await db.commit()
    await db.refresh(project)
    await invalidate_cache(r)
    return project


@router.post("/resurrect/{project_id}", response_model=ProjectOut)
async def resurrect_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    r: redis.Redis = Depends(get_redis),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != "dead":
        raise HTTPException(status_code=409, detail="Only dead projects can be resurrected")

    # Enforce 1-project limit for the calling user
    existing = await db.execute(
        select(Project).where(Project.owner_id == user.id, Project.status.in_(["alive", "dying"]))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Abandon your current project before resurrecting another")

    if user.credits < settings.resurrection_credit_cost:
        raise HTTPException(
            status_code=402,
            detail=f"Need {settings.resurrection_credit_cost} Credits to resurrect (you have {user.credits})",
        )

    user.credits -= settings.resurrection_credit_cost
    user.resurrection_count += 1

    # Restore surviving fossil cells belonging to this project
    cells_result = await db.execute(
        select(GridCell).where(GridCell.project_id == project.id, GridCell.state == "fossil")
    )
    surviving_cells = cells_result.scalars().all()

    if not surviving_cells:
        # All cells were claimed; take one random empty cell instead
        cell = await _get_random_empty_cell(db)
        if cell is None:
            raise HTTPException(status_code=503, detail="Grid is full — cannot resurrect")
        cell.project_id = project.id
        cell.state = "alive"
        cell.claimed_at = datetime.now(timezone.utc)
        surviving_cells = [cell]

    for cell in surviving_cells:
        cell.state = "alive"

    original_id = project.resurrected_from if project.resurrected_from else project.id
    project.status = "alive"
    project.expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.resurrection_lifespan_hours)
    project.momentum = 0
    project.territory_size = len(surviving_cells)
    project.died_at = None
    project.owner_id = user.id
    project.resurrected_from = original_id

    await db.commit()
    await db.refresh(project)
    await invalidate_cache(r)
    return project
