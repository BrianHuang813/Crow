from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..database import get_db
from ..auth import get_current_user, get_optional_user
from ..models import User, Project, Follow
from ..schemas.user import UserProfileOut, FollowStateOut

router = APIRouter()


async def _follower_count(db: AsyncSession, user_id) -> int:
    return await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.followee_id == user_id)
    ) or 0


@router.get("/users/{handle}", response_model=UserProfileOut)
async def get_user_profile(
    handle: str,
    db: AsyncSession = Depends(get_db),
    viewer: User | None = Depends(get_optional_user),
):
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
    follower_count = await _follower_count(db, user.id)
    following_count = await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.follower_id == user.id)
    )

    is_following = False
    if viewer and viewer.id != user.id:
        row = await db.scalar(
            select(Follow).where(
                Follow.follower_id == viewer.id,
                Follow.followee_id == user.id,
            )
        )
        is_following = row is not None

    return UserProfileOut(
        handle=user.handle,
        avatar_url=user.avatar_url,
        resurrection_count=user.resurrection_count,
        created_at=user.created_at,
        project_count=project_count or 0,
        territory_total=territory_total or 0,
        follower_count=follower_count,
        following_count=following_count or 0,
        is_following=is_following,
    )
