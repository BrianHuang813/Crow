from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..database import get_db
from ..auth import get_current_user, get_optional_user
from ..models import User, Project, Follow
from ..schemas.user import (
    UserProfileOut,
    FollowStateOut,
    UserSearchItemOut,
    UserSearchOut,
)

router = APIRouter()


async def _follower_count(db: AsyncSession, user_id) -> int:
    return await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.followee_id == user_id)
    ) or 0


@router.get("/users/search", response_model=UserSearchOut)
async def search_users(
    db: AsyncSession = Depends(get_db),
    q: str = Query(..., min_length=1),
    limit: int = Query(20),
    offset: int = Query(0),
):
    if limit < 0 or offset < 0:
        raise HTTPException(status_code=400, detail="limit/offset must be >= 0")
    limit = min(limit, 50)

    pattern = f"%{q}%"
    base = select(User).where(User.handle.ilike(pattern))

    total = await db.scalar(select(func.count()).select_from(base.subquery()))

    users = (
        await db.execute(base.order_by(User.handle.asc()).limit(limit).offset(offset))
    ).scalars().all()

    if not users:
        return UserSearchOut(items=[], total=total or 0, limit=limit, offset=offset)

    user_ids = [u.id for u in users]

    # Aggregate stats in one query each to avoid per-row N+1.
    project_counts = dict(
        (
            await db.execute(
                select(Project.owner_id, func.count())
                .where(Project.owner_id.in_(user_ids))
                .group_by(Project.owner_id)
            )
        ).all()
    )
    territory_totals = dict(
        (
            await db.execute(
                select(Project.owner_id, func.coalesce(func.sum(Project.territory_size), 0))
                .where(
                    Project.owner_id.in_(user_ids),
                    Project.status.in_(["alive", "dying"]),
                )
                .group_by(Project.owner_id)
            )
        ).all()
    )
    follower_counts = dict(
        (
            await db.execute(
                select(Follow.followee_id, func.count())
                .where(Follow.followee_id.in_(user_ids))
                .group_by(Follow.followee_id)
            )
        ).all()
    )

    items = [
        UserSearchItemOut(
            handle=u.handle,
            avatar_url=u.avatar_url,
            project_count=project_counts.get(u.id, 0),
            territory_total=territory_totals.get(u.id, 0),
            follower_count=follower_counts.get(u.id, 0),
        )
        for u in users
    ]
    return UserSearchOut(items=items, total=total or 0, limit=limit, offset=offset)


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


@router.post("/users/{handle}/follow", response_model=FollowStateOut)
async def follow_user(
    handle: str,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    target = (
        await db.execute(select(User).where(User.handle == handle))
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == me.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    existing = await db.scalar(
        select(Follow).where(Follow.follower_id == me.id, Follow.followee_id == target.id)
    )
    if not existing:
        db.add(Follow(follower_id=me.id, followee_id=target.id))
        await db.commit()

    return FollowStateOut(is_following=True, follower_count=await _follower_count(db, target.id))


@router.delete("/users/{handle}/follow", response_model=FollowStateOut)
async def unfollow_user(
    handle: str,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    target = (
        await db.execute(select(User).where(User.handle == handle))
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.scalar(
        select(Follow).where(Follow.follower_id == me.id, Follow.followee_id == target.id)
    )
    if existing:
        await db.delete(existing)
        await db.commit()

    return FollowStateOut(is_following=False, follower_count=await _follower_count(db, target.id))
