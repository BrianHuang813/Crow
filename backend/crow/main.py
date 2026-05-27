from contextlib import asynccontextmanager
from fastapi import FastAPI
from .database import AsyncSessionLocal
from .services.grid_service import seed_empty_grid
from .routers import grid, auth as auth_router, projects as projects_router, interact as interact_router, og as og_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as db:
        await seed_empty_grid(db)
    yield


app = FastAPI(title="Crow API", lifespan=lifespan)
app.include_router(grid.router, prefix="/api")
app.include_router(auth_router.router, prefix="/api")
app.include_router(projects_router.router, prefix="/api")
app.include_router(interact_router.router, prefix="/api")
app.include_router(og_router.router, prefix="/api")
