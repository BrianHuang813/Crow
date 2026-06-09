from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..database import get_db
from ..models import User, Project
from ..schemas.user import UserProfileOut

router = APIRouter()


@router.get("/users/{handle}", response_model=UserProfileOut)
async def get_user_profile(handle: str, db: AsyncSession = Depends(get_db)):
    user = (
        await db.execute(select(User).where(User.handle == handle))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    project_count = await db.scalar(
        select(func.count()).select_from(Project).where(Project.owner_id == user.id)
    )
    territory_total = await db.scalar(
        select(func.coalesce(func.sum(Project.territory_size), 0)).where(
            Project.owner_id == user.id,
            Project.status.in_(["alive", "dying"]),
        )
    )
    return UserProfileOut(
        handle=user.handle,
        avatar_url=user.avatar_url,
        resurrection_count=user.resurrection_count,
        created_at=user.created_at,
        project_count=project_count or 0,
        territory_total=territory_total or 0,
    )
