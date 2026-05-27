from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as redis

from ..database import get_db
from ..redis_client import get_redis
from ..auth import get_current_user
from ..models import User, Project, Interaction
from ..schemas.interaction import InteractionCreate, InteractionOut
from ..config import settings
from ..services.grid_service import invalidate_cache

router = APIRouter()

COOLDOWN_KEY = "crow:cd:{user_id}:{project_id}"


@router.post("/interact/{project_id}", response_model=InteractionOut)
async def interact(
    project_id: str,
    body: InteractionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    r: redis.Redis = Depends(get_redis),
):
    if body.type not in ("click", "boost"):
        raise HTTPException(status_code=400, detail="type must be 'click' or 'boost'")

    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status == "dead":
        raise HTTPException(status_code=409, detail="Cannot interact with a dead project")

    credits_earned = 0
    if body.type == "click":
        # Check cooldown
        cd_key = COOLDOWN_KEY.format(user_id=user.id, project_id=project_id)
        if await r.exists(cd_key):
            raise HTTPException(
                status_code=429,
                detail=f"Cooldown: wait {settings.click_cooldown_seconds}s between clicks on the same project",
            )
        momentum_add = settings.click_momentum
        time_add = settings.click_time_seconds
        # Credits only for interacting with someone else's project
        if project.owner_id != user.id:
            credits_earned = settings.click_credit_reward
            user.credits += credits_earned
        # Set cooldown
        await r.setex(cd_key, settings.click_cooldown_seconds, "1")
    else:  # boost
        if user.credits < settings.boost_credit_cost:
            raise HTTPException(
                status_code=402,
                detail=f"Need {settings.boost_credit_cost} Credits to boost (you have {user.credits})",
            )
        user.credits -= settings.boost_credit_cost
        momentum_add = settings.boost_momentum
        time_add = settings.boost_time_seconds

    project.momentum += momentum_add
    project.expires_at = project.expires_at + timedelta(seconds=time_add)

    interaction = Interaction(
        project_id=project.id,
        user_id=user.id,
        type=body.type,
        momentum_granted=momentum_add,
        time_granted=time_add,
        credits_granted=credits_earned,
    )
    db.add(interaction)
    await db.commit()
    await db.refresh(project)

    # Trigger expansion check if momentum >= 100
    if project.momentum >= 100:
        from ..tasks.expansion import check_expansion
        check_expansion.delay(str(project.id))

    await invalidate_cache(r)

    return InteractionOut(
        momentum_added=momentum_add,
        time_added_seconds=time_add,
        credits_earned=credits_earned,
        new_momentum=project.momentum,
        new_expires_at=project.expires_at.isoformat(),
    )
