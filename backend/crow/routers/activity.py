from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import Project, Interaction, User
from ..schemas.activity import ActivityEventOut, ActivityOut

router = APIRouter()


@router.get("/activity", response_model=ActivityOut)
async def get_activity(db: AsyncSession = Depends(get_db), limit: int = Query(20)):
    limit = min(max(limit, 1), 50)
    events: list[ActivityEventOut] = []

    claimed = (
        await db.execute(select(Project).order_by(Project.created_at.desc()).limit(limit))
    ).scalars().all()
    for p in claimed:
        events.append(ActivityEventOut(
            type="claimed", project_id=p.id, project_name=p.name,
            color=p.color, actor_handle=None, at=p.created_at,
        ))

    faded = (
        await db.execute(
            select(Project).where(Project.died_at.is_not(None))
            .order_by(Project.died_at.desc()).limit(limit)
        )
    ).scalars().all()
    for p in faded:
        events.append(ActivityEventOut(
            type="faded", project_id=p.id, project_name=p.name,
            color=p.color, actor_handle=None, at=p.died_at,
        ))

    boosts = (
        await db.execute(
            select(Interaction, Project, User)
            .join(Project, Interaction.project_id == Project.id)
            .outerjoin(User, Interaction.user_id == User.id)
            .where(Interaction.type == "boost")
            .order_by(Interaction.created_at.desc())
            .limit(limit)
        )
    ).all()
    for inter, proj, usr in boosts:
        events.append(ActivityEventOut(
            type="boosted", project_id=proj.id, project_name=proj.name,
            color=proj.color, actor_handle=(usr.handle if usr else None),
            at=inter.created_at,
        ))

    events.sort(key=lambda e: e.at, reverse=True)
    return ActivityOut(events=events[:limit])
