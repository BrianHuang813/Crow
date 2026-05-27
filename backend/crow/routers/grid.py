from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis
from ..database import get_db
from ..redis_client import get_redis
from ..services.grid_service import get_snapshot
from ..schemas.grid import GridSnapshotOut

router = APIRouter()


@router.get("/grid", response_model=GridSnapshotOut)
async def get_grid(
    db: AsyncSession = Depends(get_db),
    r: redis.Redis = Depends(get_redis),
):
    return await get_snapshot(db, r)
