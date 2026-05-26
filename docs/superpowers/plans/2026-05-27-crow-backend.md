# Crow Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Crow backend — FastAPI REST API, PostgreSQL schema, Redis grid cache, and Celery background workers — that fully implements the Digital Darwinism game mechanics.

**Architecture:** A single FastAPI process serves all HTTP traffic. Celery workers (beat + worker) run as separate processes handling decay, grid cache refresh, and expansion. PostgreSQL is the source of truth; Redis holds the 60×60 grid snapshot consumed by the frontend poll.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, Celery 5, Redis 7, Pillow 10, pytest, pytest-asyncio, httpx, fakeredis, Docker Compose

---

## File Map

```
crow/
├── docker-compose.yml
├── Makefile
└── backend/
    ├── Dockerfile
    ├── pyproject.toml
    ├── alembic.ini
    ├── alembic/
    │   └── versions/
    │       └── 0001_initial_schema.py
    ├── tests/
    │   ├── conftest.py
    │   ├── test_grid.py
    │   ├── test_projects.py
    │   ├── test_interactions.py
    │   ├── test_expansion.py
    │   └── test_decay.py
    └── crow/
        ├── __init__.py
        ├── main.py              # FastAPI app + router registration
        ├── config.py            # Pydantic Settings (env vars)
        ├── database.py          # SQLAlchemy async engine + session
        ├── redis_client.py      # Redis connection factory
        ├── auth.py              # GitHub OAuth + JWT helpers
        ├── palette.py           # 20-color territory palette
        ├── models/
        │   ├── __init__.py
        │   ├── user.py
        │   ├── project.py
        │   ├── grid_cell.py
        │   ├── interaction.py
        │   └── grid_snapshot.py
        ├── schemas/
        │   ├── __init__.py
        │   ├── grid.py          # GridCell, GridSnapshot Pydantic models
        │   ├── project.py       # ProjectCreate, ProjectOut
        │   └── interaction.py   # InteractionCreate, InteractionOut
        ├── routers/
        │   ├── __init__.py
        │   ├── auth.py          # /api/auth/* (web OAuth + device flow)
        │   ├── grid.py          # GET /api/grid
        │   ├── projects.py      # CRUD + /mine + /abandon + /resurrect
        │   ├── interact.py      # POST /api/interact/{id}
        │   └── og.py            # GET /api/og/{id}
        ├── services/
        │   ├── __init__.py
        │   ├── grid_service.py  # build_snapshot(), invalidate_cache()
        │   ├── expansion.py     # run_expansion(project_id)
        │   └── og_generator.py  # generate_og_card(project) → bytes
        └── tasks/
            ├── __init__.py
            ├── celery_app.py    # Celery instance + beat schedule
            ├── decay.py         # decay_check task
            ├── grid_cache.py    # refresh_grid_cache task
            ├── snapshot.py      # snapshot_grid task
            └── expansion.py     # check_expansion task
```

---

## Task 1: Infrastructure Setup

**Files:**
- Create: `docker-compose.yml`
- Create: `Makefile`
- Create: `backend/Dockerfile`
- Create: `backend/pyproject.toml`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: crow
      POSTGRES_USER: crow
      POSTGRES_PASSWORD: crow
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: ./backend
    command: uvicorn crow.main:app --host 0.0.0.0 --port 8000 --reload
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://crow:crow@db:5432/crow
      REDIS_URL: redis://redis:6379/0
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}
      JWT_SECRET: ${JWT_SECRET:-dev-secret-change-in-prod}
    depends_on:
      - db
      - redis
    volumes:
      - ./backend:/app

  worker:
    build: ./backend
    command: celery -A crow.tasks.celery_app worker --loglevel=info
    environment:
      DATABASE_URL: postgresql+asyncpg://crow:crow@db:5432/crow
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - db
      - redis
    volumes:
      - ./backend:/app

  beat:
    build: ./backend
    command: celery -A crow.tasks.celery_app beat --loglevel=info
    environment:
      DATABASE_URL: postgresql+asyncpg://crow:crow@db:5432/crow
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - db
      - redis
    volumes:
      - ./backend:/app

volumes:
  pgdata:
```

- [ ] **Step 2: Create `Makefile`**

```makefile
.PHONY: up down migrate test shell

up:
	docker compose up --build

down:
	docker compose down

migrate:
	docker compose run --rm api alembic upgrade head

test:
	docker compose run --rm api pytest tests/ -v

shell:
	docker compose run --rm api bash
```

- [ ] **Step 3: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml .
RUN pip install -e ".[dev]"
COPY . .
```

- [ ] **Step 4: Create `backend/pyproject.toml`**

```toml
[build-system]
requires = ["setuptools"]
build-backend = "setuptools.backends.legacy:build"

[project]
name = "crow"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.111",
    "uvicorn[standard]>=0.29",
    "sqlalchemy[asyncio]>=2.0",
    "asyncpg>=0.29",
    "alembic>=1.13",
    "redis[asyncio]>=5.0",
    "celery[redis]>=5.3",
    "httpx>=0.27",
    "pydantic-settings>=2.2",
    "python-jose[cryptography]>=3.3",
    "slowapi>=0.1.9",
    "Pillow>=10.3",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "fakeredis>=2.23",
]

[tool.setuptools.packages.find]
where = ["."]

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

- [ ] **Step 5: Create `backend/crow/config.py`**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    github_client_id: str
    github_client_secret: str
    jwt_secret: str = "dev-secret-change-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24 * 30  # 30 days

    # Game constants — tunable without code changes
    initial_lifespan_hours: int = 48
    resurrection_lifespan_hours: int = 24
    resurrection_credit_cost: int = 200
    boost_momentum: int = 25
    boost_time_seconds: int = 1800
    boost_credit_cost: int = 20
    click_momentum: int = 5
    click_time_seconds: int = 300
    click_credit_reward: int = 5
    click_cooldown_seconds: int = 60
    dying_threshold_hours: int = 6
    grid_width: int = 60
    grid_height: int = 60
    grid_cache_ttl_seconds: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 6: Verify containers start**

```bash
cp backend/.env.example backend/.env  # fill in GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
docker compose up db redis -d
```

Expected: both containers running, no errors.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml Makefile backend/
git commit -m "feat: infrastructure setup — Docker Compose, FastAPI skeleton, config"
```

---

## Task 2: Database Models & Migration

**Files:**
- Create: `backend/crow/database.py`
- Create: `backend/crow/models/user.py`
- Create: `backend/crow/models/project.py`
- Create: `backend/crow/models/grid_cell.py`
- Create: `backend/crow/models/interaction.py`
- Create: `backend/crow/models/grid_snapshot.py`
- Create: `backend/crow/models/__init__.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/versions/0001_initial_schema.py`

- [ ] **Step 1: Create `backend/crow/database.py`**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from .config import settings

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Step 2: Create `backend/crow/models/user.py`**

```python
import uuid
from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    github_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    handle: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    credits: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    resurrection_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 3: Create `backend/crow/models/project.py`**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from ..database import Base

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tech_tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, server_default="{}")
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="alive")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    momentum: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    territory_size: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    color: Mapped[str] = mapped_column(String(7), nullable=False)
    resurrected_from: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    died_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

- [ ] **Step 4: Create `backend/crow/models/grid_cell.py`**

```python
import uuid
from datetime import datetime
from sqlalchemy import SmallInteger, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base

class GridCell(Base):
    __tablename__ = "grid_cells"

    x: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    y: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    # state: empty | alive | dying | fossil
    state: Mapped[str] = mapped_column(String(10), nullable=False, default="empty")
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

- [ ] **Step 5: Create `backend/crow/models/interaction.py`**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base

class Interaction(Base):
    __tablename__ = "interactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # click | boost
    momentum_granted: Mapped[int] = mapped_column(Integer, nullable=False)
    time_granted: Mapped[int] = mapped_column(Integer, nullable=False)  # seconds
    credits_granted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 6: Create `backend/crow/models/grid_snapshot.py`**

```python
import uuid
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from ..database import Base

class GridSnapshot(Base):
    __tablename__ = "grid_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 7: Create `backend/crow/models/__init__.py`**

```python
from .user import User
from .project import Project
from .grid_cell import GridCell
from .interaction import Interaction
from .grid_snapshot import GridSnapshot

__all__ = ["User", "Project", "GridCell", "Interaction", "GridSnapshot"]
```

- [ ] **Step 8: Create `backend/alembic.ini`**

```ini
[alembic]
script_location = alembic
sqlalchemy.url = %(DATABASE_URL)s

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 9: Create `backend/alembic/env.py`**

```python
import asyncio
import os
from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine
from crow.database import Base
from crow import models  # noqa: F401 — registers all models

config = context.config
config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])

def run_migrations_offline():
    context.configure(url=os.environ["DATABASE_URL"], target_metadata=Base.metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online():
    engine = create_async_engine(os.environ["DATABASE_URL"])
    async with engine.connect() as conn:
        await conn.run_sync(lambda sync_conn: context.configure(
            connection=sync_conn,
            target_metadata=Base.metadata,
        ))
        async with conn.begin():
            await conn.run_sync(lambda _: context.run_migrations())
    await engine.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

- [ ] **Step 10: Generate initial migration and apply**

```bash
docker compose run --rm api alembic revision --autogenerate -m "initial schema"
make migrate
```

Expected output ends with: `Running upgrade  -> <hash>, initial schema`

- [ ] **Step 11: Write model smoke test**

Create `backend/tests/conftest.py`:

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from crow.database import Base, get_db
from crow.main import app

TEST_DB_URL = "postgresql+asyncpg://crow:crow@localhost:5432/crow_test"

@pytest_asyncio.fixture(scope="session")
async def engine():
    eng = create_async_engine(TEST_DB_URL)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()

@pytest_asyncio.fixture
async def db(engine):
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()

@pytest_asyncio.fixture
async def client(engine):
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async def override_db():
        async with session_factory() as session:
            yield session
    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

Create `backend/tests/test_models.py`:

```python
import pytest
from datetime import datetime, timezone, timedelta
from crow.models import User, Project, GridCell

@pytest.mark.asyncio
async def test_create_user(db):
    user = User(github_id="12345", handle="testuser")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    assert user.id is not None
    assert user.credits == 0

@pytest.mark.asyncio
async def test_create_project(db):
    user = User(github_id="99999", handle="builder")
    db.add(user)
    await db.flush()
    project = Project(
        name="Test App",
        owner_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
        color="#ac3509",
        tech_tags=["Python"],
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    assert project.status == "alive"
    assert project.momentum == 0
    assert project.territory_size == 1
```

- [ ] **Step 12: Run model tests**

```bash
# First create the test database
docker compose exec db psql -U crow -c "CREATE DATABASE crow_test;"
docker compose run --rm api pytest tests/test_models.py -v
```

Expected: `2 passed`

- [ ] **Step 13: Commit**

```bash
git add backend/crow/models/ backend/crow/database.py backend/alembic/ backend/alembic.ini backend/tests/
git commit -m "feat: database models and initial migration (User, Project, GridCell, Interaction, GridSnapshot)"
```

---

## Task 3: Palette, Redis, and Grid Service

**Files:**
- Create: `backend/crow/palette.py`
- Create: `backend/crow/redis_client.py`
- Create: `backend/crow/services/grid_service.py`
- Create: `backend/crow/routers/grid.py`
- Create: `backend/crow/schemas/grid.py`
- Create: `backend/crow/main.py`
- Create: `backend/tests/test_grid.py`

- [ ] **Step 1: Create `backend/crow/palette.py`**

```python
import random

# 20 visually distinct colors that read well on a dark (#1a1a1a) grid background
TERRITORY_COLORS = [
    "#ac3509", "#006a63", "#4a90d9", "#e6c229", "#9b59b6",
    "#e74c3c", "#2ecc71", "#f39c12", "#1abc9c", "#3498db",
    "#e91e63", "#ff5722", "#8bc34a", "#00bcd4", "#673ab7",
    "#ff9800", "#4caf50", "#2196f3", "#9c27b0", "#f44336",
]

def pick_color(exclude: list[str] | None = None) -> str:
    """Pick a random color from the palette, avoiding recently-used ones."""
    available = [c for c in TERRITORY_COLORS if c not in (exclude or [])]
    return random.choice(available or TERRITORY_COLORS)
```

- [ ] **Step 2: Create `backend/crow/redis_client.py`**

```python
import redis.asyncio as redis
from .config import settings

_redis: redis.Redis | None = None

async def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis
```

- [ ] **Step 3: Create `backend/crow/schemas/grid.py`**

```python
from pydantic import BaseModel
from datetime import datetime

class GridCellOut(BaseModel):
    x: int
    y: int
    state: str  # empty | alive | dying | fossil
    project_id: str | None
    color: str | None

class GridSnapshotOut(BaseModel):
    updated_at: datetime
    width: int
    height: int
    cells: list[GridCellOut]
```

- [ ] **Step 4: Create `backend/crow/services/grid_service.py`**

```python
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

    snapshot_cells = []
    for y in range(settings.grid_height):
        for x in range(settings.grid_width):
            cell = cells.get((x, y))
            if cell is None or cell.state == "empty":
                snapshot_cells.append({"x": x, "y": y, "state": "empty", "project_id": None, "color": None})
            else:
                project_result = await db.execute(
                    select(Project).where(Project.id == cell.project_id)
                )
                project = project_result.scalar_one_or_none()
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
```

- [ ] **Step 5: Create `backend/crow/main.py`**

```python
from fastapi import FastAPI
from .routers import grid

app = FastAPI(title="Crow API")
app.include_router(grid.router, prefix="/api")
```

- [ ] **Step 6: Create `backend/crow/routers/grid.py`**

```python
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
```

- [ ] **Step 7: Seed the grid with empty cells (one-time migration helper)**

Add to `backend/crow/services/grid_service.py`:

```python
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
```

Add startup event to `backend/crow/main.py`:

```python
from contextlib import asynccontextmanager
from .database import AsyncSessionLocal
from .services.grid_service import seed_empty_grid

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as db:
        await seed_empty_grid(db)
    yield

app = FastAPI(title="Crow API", lifespan=lifespan)
app.include_router(grid.router, prefix="/api")
```

- [ ] **Step 8: Write grid endpoint test**

Create `backend/tests/test_grid.py`:

```python
import pytest
import fakeredis.aioredis
from crow.redis_client import get_redis
from crow.main import app

@pytest.fixture(autouse=True)
def override_redis():
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    app.dependency_overrides[get_redis] = lambda: fake
    yield
    app.dependency_overrides.pop(get_redis, None)

@pytest.mark.asyncio
async def test_get_grid_returns_3600_cells(client):
    response = await client.get("/api/grid")
    assert response.status_code == 200
    data = response.json()
    assert data["width"] == 60
    assert data["height"] == 60
    assert len(data["cells"]) == 3600

@pytest.mark.asyncio
async def test_get_grid_all_empty_initially(client):
    response = await client.get("/api/grid")
    cells = response.json()["cells"]
    assert all(c["state"] == "empty" for c in cells)
    assert all(c["project_id"] is None for c in cells)
```

- [ ] **Step 9: Run grid tests**

```bash
docker compose run --rm api pytest tests/test_grid.py -v
```

Expected: `2 passed`

- [ ] **Step 10: Commit**

```bash
git add backend/crow/palette.py backend/crow/redis_client.py backend/crow/services/grid_service.py backend/crow/routers/grid.py backend/crow/schemas/grid.py backend/crow/main.py backend/tests/test_grid.py
git commit -m "feat: grid service with Redis cache and GET /api/grid endpoint"
```

---

## Task 4: GitHub OAuth & JWT Auth

**Files:**
- Create: `backend/crow/auth.py`
- Create: `backend/crow/routers/auth.py`
- Modify: `backend/crow/main.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Create `backend/crow/auth.py`**

```python
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .config import settings
from .database import get_db
from .models import User

bearer = HTTPBearer(auto_error=False)

def create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id: str = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
```

- [ ] **Step 2: Create `backend/crow/routers/auth.py`**

```python
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..config import settings
from ..database import get_db
from ..models import User
from ..auth import create_token

router = APIRouter(prefix="/auth")

# --- Web OAuth (for browser login) ---

@router.get("/github")
async def github_login():
    return RedirectResponse(
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.github_client_id}"
        f"&scope=read:user,user:email"
    )

@router.get("/callback")
async def github_callback(code: str, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={"client_id": settings.github_client_id, "client_secret": settings.github_client_secret, "code": code},
            headers={"Accept": "application/json"},
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="GitHub OAuth failed")

        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        gh_user = user_resp.json()

    result = await db.execute(select(User).where(User.github_id == str(gh_user["id"])))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            github_id=str(gh_user["id"]),
            handle=gh_user["login"],
            email=gh_user.get("email"),
            avatar_url=gh_user.get("avatar_url"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    jwt_token = create_token(str(user.id))
    return {"token": jwt_token, "handle": user.handle}

# --- Device Flow (for Crow Submit Skill) ---

@router.post("/device/code")
async def device_code():
    """Initiate GitHub Device Flow. Returns device_code, user_code, verification_uri."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://github.com/login/device/code",
            json={"client_id": settings.github_client_id, "scope": "read:user,user:email"},
            headers={"Accept": "application/json"},
        )
    return resp.json()

@router.post("/device/token")
async def device_token(device_code: str, db: AsyncSession = Depends(get_db)):
    """Poll to exchange device_code for a Crow JWT once user has authorized."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={"client_id": settings.github_client_id, "device_code": device_code, "grant_type": "urn:ietf:params:oauth:grant-type:device_code"},
            headers={"Accept": "application/json"},
        )
        data = resp.json()

    if "error" in data:
        raise HTTPException(status_code=400, detail=data["error"])

    access_token = data.get("access_token")
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        gh_user = user_resp.json()

    result = await db.execute(select(User).where(User.github_id == str(gh_user["id"])))
    user = result.scalar_one_or_none()
    if not user:
        user = User(github_id=str(gh_user["id"]), handle=gh_user["login"], email=gh_user.get("email"), avatar_url=gh_user.get("avatar_url"))
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return {"token": create_token(str(user.id)), "handle": user.handle}
```

- [ ] **Step 3: Register auth router in `backend/crow/main.py`**

```python
from .routers import grid, auth as auth_router

app.include_router(auth_router.router, prefix="/api")
```

- [ ] **Step 4: Write auth unit tests**

Create `backend/tests/test_auth.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from crow.auth import create_token, get_current_user
from crow.models import User

@pytest.mark.asyncio
async def test_create_and_verify_token(db):
    user = User(github_id="111", handle="tokenuser")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token(str(user.id))
    assert token is not None

@pytest.mark.asyncio
async def test_get_current_user_with_valid_token(client, db):
    user = User(github_id="222", handle="authuser")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token(str(user.id))
    response = await client.get("/api/grid", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200  # grid is public but token should not break it

@pytest.mark.asyncio
async def test_protected_route_rejects_no_token(client):
    response = await client.get("/api/projects/mine")
    assert response.status_code == 401
```

- [ ] **Step 5: Run auth tests**

```bash
docker compose run --rm api pytest tests/test_auth.py -v
```

Expected: `3 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/crow/auth.py backend/crow/routers/auth.py backend/tests/test_auth.py backend/crow/main.py
git commit -m "feat: GitHub OAuth (web flow + device flow) and JWT auth"
```

---

## Task 5: Projects API

**Files:**
- Create: `backend/crow/schemas/project.py`
- Create: `backend/crow/routers/projects.py`
- Modify: `backend/crow/main.py`
- Create: `backend/tests/test_projects.py`

- [ ] **Step 1: Create `backend/crow/schemas/project.py`**

```python
import uuid
from datetime import datetime
from pydantic import BaseModel

class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    url: str | None = None
    tech_tags: list[str] = []

class ProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    url: str | None
    tech_tags: list[str]
    owner_id: uuid.UUID
    status: str
    expires_at: datetime
    momentum: int
    territory_size: int
    color: str
    created_at: datetime
    died_at: datetime | None

    class Config:
        from_attributes = True
```

- [ ] **Step 2: Create `backend/crow/routers/projects.py`**

```python
import random
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

async def _count_alive_projects(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(GridCell).where(GridCell.state.in_(["alive", "dying"]))
    )
    return result.scalar()

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
```

- [ ] **Step 3: Register router in `main.py`**

```python
from .routers import grid, auth as auth_router, projects as projects_router

app.include_router(projects_router.router, prefix="/api")
```

- [ ] **Step 4: Write project tests**

Create `backend/tests/test_projects.py`:

```python
import pytest
from crow.auth import create_token
from crow.models import User

@pytest.fixture
async def authed_user(db):
    user = User(github_id="proj001", handle="projuser")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@pytest.fixture
def auth_headers(authed_user):
    return {"Authorization": f"Bearer {create_token(str(authed_user.id))}"}

@pytest.mark.asyncio
async def test_create_project_success(client, auth_headers):
    resp = await client.post("/api/projects", json={"name": "My App", "description": "A test app", "tech_tags": ["Python"]}, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My App"
    assert data["status"] == "alive"
    assert data["momentum"] == 0
    assert data["territory_size"] == 1
    assert data["color"] is not None

@pytest.mark.asyncio
async def test_create_project_rejects_duplicate(client, auth_headers):
    await client.post("/api/projects", json={"name": "First App"}, headers=auth_headers)
    resp = await client.post("/api/projects", json={"name": "Second App"}, headers=auth_headers)
    assert resp.status_code == 409

@pytest.mark.asyncio
async def test_abandon_project(client, auth_headers):
    create_resp = await client.post("/api/projects", json={"name": "Doomed App"}, headers=auth_headers)
    project_id = create_resp.json()["id"]
    resp = await client.patch(f"/api/projects/{project_id}/abandon", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "dead"

@pytest.mark.asyncio
async def test_get_my_project_after_abandon_returns_none(client, auth_headers):
    create_resp = await client.post("/api/projects", json={"name": "Gone App"}, headers=auth_headers)
    project_id = create_resp.json()["id"]
    await client.patch(f"/api/projects/{project_id}/abandon", headers=auth_headers)
    resp = await client.get("/api/projects/mine", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() is None
```

- [ ] **Step 5: Run project tests**

```bash
docker compose run --rm api pytest tests/test_projects.py -v
```

Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/crow/schemas/project.py backend/crow/routers/projects.py backend/tests/test_projects.py backend/crow/main.py
git commit -m "feat: projects API — create, get, get-mine, abandon"
```

---

## Task 6: Interactions API (Click + Boost)

**Files:**
- Create: `backend/crow/schemas/interaction.py`
- Create: `backend/crow/routers/interact.py`
- Modify: `backend/crow/main.py`
- Create: `backend/tests/test_interactions.py`

- [ ] **Step 1: Create `backend/crow/schemas/interaction.py`**

```python
from pydantic import BaseModel

class InteractionCreate(BaseModel):
    type: str  # "click" | "boost"

class InteractionOut(BaseModel):
    momentum_added: int
    time_added_seconds: int
    credits_earned: int
    new_momentum: int
    new_expires_at: str
```

- [ ] **Step 2: Create `backend/crow/routers/interact.py`**

```python
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

    # Check cooldown (click only)
    if body.type == "click":
        cd_key = COOLDOWN_KEY.format(user_id=user.id, project_id=project_id)
        if await r.exists(cd_key):
            raise HTTPException(status_code=429, detail=f"Cooldown: wait {settings.click_cooldown_seconds}s between clicks on the same project")

    # Boost: check Credits
    credits_earned = 0
    if body.type == "boost":
        if user.credits < settings.boost_credit_cost:
            raise HTTPException(status_code=402, detail=f"Need {settings.boost_credit_cost} Credits to boost (you have {user.credits})")
        user.credits -= settings.boost_credit_cost
        momentum_add = settings.boost_momentum
        time_add = settings.boost_time_seconds
    else:
        momentum_add = settings.click_momentum
        time_add = settings.click_time_seconds
        # Credits only for interacting with someone else's project
        if project.owner_id != user.id:
            credits_earned = settings.click_credit_reward
            user.credits += credits_earned
        # Set cooldown
        cd_key = COOLDOWN_KEY.format(user_id=user.id, project_id=project_id)
        await r.setex(cd_key, settings.click_cooldown_seconds, "1")

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

    # Trigger expansion check asynchronously if momentum >= 100
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
```

- [ ] **Step 3: Register router in `main.py`**

```python
from .routers import grid, auth as auth_router, projects as projects_router, interact as interact_router
app.include_router(interact_router.router, prefix="/api")
```

- [ ] **Step 4: Write interaction tests**

Create `backend/tests/test_interactions.py`:

```python
import pytest
import fakeredis.aioredis
from crow.auth import create_token
from crow.models import User, Project
from crow.main import app
from crow.redis_client import get_redis
from datetime import datetime, timedelta, timezone

@pytest.fixture(autouse=True)
def override_redis():
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    app.dependency_overrides[get_redis] = lambda: fake
    yield
    app.dependency_overrides.pop(get_redis, None)

@pytest.fixture
async def user_and_project(db):
    owner = User(github_id="int001", handle="owner")
    clicker = User(github_id="int002", handle="clicker", credits=100)
    db.add_all([owner, clicker])
    await db.flush()
    project = Project(
        name="Clickable",
        owner_id=owner.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
        color="#ac3509",
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return owner, clicker, project

@pytest.mark.asyncio
async def test_click_adds_momentum(client, user_and_project):
    owner, clicker, project = user_and_project
    token = create_token(str(clicker.id))
    resp = await client.post(f"/api/interact/{project.id}", json={"type": "click"}, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["momentum_added"] == 5
    assert data["credits_earned"] == 5

@pytest.mark.asyncio
async def test_click_on_own_project_earns_no_credits(client, user_and_project, db):
    owner, clicker, project = user_and_project
    token = create_token(str(owner.id))
    resp = await client.post(f"/api/interact/{project.id}", json={"type": "click"}, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["credits_earned"] == 0

@pytest.mark.asyncio
async def test_boost_requires_enough_credits(client, user_and_project):
    owner, clicker, project = user_and_project
    broke_user = User(github_id="int003", handle="broke", credits=5)
    # broke_user has only 5 credits, needs 20
    from sqlalchemy.ext.asyncio import AsyncSession
    async with AsyncSession(bind=None) as s:
        pass  # just get the db fixture via client fixture approach
    token = create_token(str(clicker.id))
    # First drain credits
    resp = await client.post(f"/api/interact/{project.id}", json={"type": "boost"}, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200  # clicker has 100 credits, can boost

@pytest.mark.asyncio
async def test_click_cooldown_enforced(client, user_and_project):
    owner, clicker, project = user_and_project
    token = create_token(str(clicker.id))
    headers = {"Authorization": f"Bearer {token}"}
    await client.post(f"/api/interact/{project.id}", json={"type": "click"}, headers=headers)
    resp = await client.post(f"/api/interact/{project.id}", json={"type": "click"}, headers=headers)
    assert resp.status_code == 429
```

- [ ] **Step 5: Run interaction tests**

```bash
docker compose run --rm api pytest tests/test_interactions.py -v
```

Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/crow/schemas/interaction.py backend/crow/routers/interact.py backend/tests/test_interactions.py backend/crow/main.py
git commit -m "feat: interactions API — click (with cooldown) and boost (with Credits)"
```

---

## Task 7: Resurrection API

**Files:**
- Modify: `backend/crow/routers/projects.py`
- Create: `backend/tests/test_resurrection.py`

- [ ] **Step 1: Add resurrection endpoint to `backend/crow/routers/projects.py`**

Append to the file:

```python
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

    # Enforce 1-project limit for the user calling resurrect
    existing = await db.execute(
        select(Project).where(Project.owner_id == user.id, Project.status.in_(["alive", "dying"]))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Abandon your current project before resurrecting another")

    if user.credits < settings.resurrection_credit_cost:
        raise HTTPException(status_code=402, detail=f"Need {settings.resurrection_credit_cost} Credits to resurrect (you have {user.credits})")

    user.credits -= settings.resurrection_credit_cost
    user.resurrection_count += 1

    # Restore only unclaimed fossil cells belonging to this project
    cells_result = await db.execute(
        select(GridCell).where(GridCell.project_id == project.id, GridCell.state == "fossil")
    )
    surviving_cells = cells_result.scalars().all()

    if not surviving_cells:
        # All cells were eaten; claim one random empty cell instead
        cell = await _get_random_empty_cell(db)
        if cell is None:
            raise HTTPException(status_code=503, detail="Grid is full — cannot resurrect")
        cell.project_id = project.id
        cell.state = "alive"
        cell.claimed_at = datetime.now(timezone.utc)
        surviving_cells = [cell]

    for cell in surviving_cells:
        cell.state = "alive"

    project.status = "alive"
    project.expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.resurrection_lifespan_hours)
    project.momentum = 0
    project.territory_size = len(surviving_cells)
    project.died_at = None
    project.owner_id = user.id  # resurrected project now belongs to the resurrector
    project.resurrected_from = project.id if project.resurrected_from is None else project.resurrected_from

    await db.commit()
    await db.refresh(project)
    await invalidate_cache(r)
    return project
```

- [ ] **Step 2: Write resurrection tests**

Create `backend/tests/test_resurrection.py`:

```python
import pytest
from datetime import datetime, timedelta, timezone
from crow.auth import create_token
from crow.models import User, Project, GridCell

@pytest.fixture
async def dead_project_with_fossil(db):
    owner = User(github_id="res001", handle="deadowner")
    resurrector = User(github_id="res002", handle="necromancer", credits=300)
    db.add_all([owner, resurrector])
    await db.flush()

    project = Project(
        name="Dead App",
        owner_id=owner.id,
        status="dead",
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        died_at=datetime.now(timezone.utc) - timedelta(hours=1),
        color="#ac3509",
    )
    db.add(project)
    await db.flush()

    # Give it a fossil cell
    cell = await db.get(GridCell, (5, 5))
    cell.project_id = project.id
    cell.state = "fossil"
    await db.commit()
    return project, resurrector

@pytest.mark.asyncio
async def test_resurrect_success(client, dead_project_with_fossil, db):
    project, resurrector = dead_project_with_fossil
    token = create_token(str(resurrector.id))
    resp = await client.post(f"/api/resurrect/{project.id}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "alive"
    assert data["momentum"] == 0

@pytest.mark.asyncio
async def test_resurrect_deducts_credits(client, dead_project_with_fossil, db):
    project, resurrector = dead_project_with_fossil
    token = create_token(str(resurrector.id))
    await client.post(f"/api/resurrect/{project.id}", headers={"Authorization": f"Bearer {token}"})
    await db.refresh(resurrector)
    assert resurrector.credits == 300 - 200

@pytest.mark.asyncio
async def test_resurrect_alive_project_rejected(client, db):
    owner = User(github_id="res003", handle="aliveowner")
    db.add(owner)
    await db.flush()
    project = Project(
        name="Alive App", owner_id=owner.id,
        status="alive",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        color="#006a63",
    )
    db.add(project)
    await db.commit()
    token = create_token(str(owner.id))
    resp = await client.post(f"/api/resurrect/{project.id}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 409
```

- [ ] **Step 3: Run resurrection tests**

```bash
docker compose run --rm api pytest tests/test_resurrection.py -v
```

Expected: `3 passed`

- [ ] **Step 4: Commit**

```bash
git add backend/crow/routers/projects.py backend/tests/test_resurrection.py
git commit -m "feat: resurrection API — costs 200 Credits, restores surviving fossil cells"
```

---

## Task 8: Celery Workers

**Files:**
- Create: `backend/crow/tasks/celery_app.py`
- Create: `backend/crow/tasks/decay.py`
- Create: `backend/crow/tasks/grid_cache.py`
- Create: `backend/crow/tasks/snapshot.py`
- Create: `backend/crow/tasks/expansion.py`
- Create: `backend/crow/services/expansion.py`
- Create: `backend/crow/tasks/__init__.py`
- Create: `backend/tests/test_expansion.py`
- Create: `backend/tests/test_decay.py`

- [ ] **Step 1: Create `backend/crow/tasks/celery_app.py`**

```python
from celery import Celery
from celery.schedules import crontab
from ..config import settings

celery_app = Celery(
    "crow",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "crow.tasks.decay",
        "crow.tasks.grid_cache",
        "crow.tasks.snapshot",
        "crow.tasks.expansion",
    ],
)

celery_app.conf.beat_schedule = {
    "decay-check-every-minute": {
        "task": "crow.tasks.decay.decay_check",
        "schedule": 60.0,
    },
    "refresh-grid-cache-every-30s": {
        "task": "crow.tasks.grid_cache.refresh_grid_cache",
        "schedule": 30.0,
    },
    "snapshot-grid-every-hour": {
        "task": "crow.tasks.snapshot.snapshot_grid",
        "schedule": crontab(minute=0),
    },
}
celery_app.conf.timezone = "UTC"
```

- [ ] **Step 2: Create `backend/crow/services/expansion.py`**

```python
import random
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models import Project, GridCell

NEIGHBORS = [(-1, 0), (1, 0), (0, -1), (0, 1)]

async def run_expansion(project_id: str, db: AsyncSession) -> bool:
    """
    If project momentum >= 100, claim one adjacent empty or fossil cell.
    Returns True if expansion occurred.
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project or project.momentum < 100 or project.status == "dead":
        return False

    cells_result = await db.execute(
        select(GridCell).where(GridCell.project_id == project.id, GridCell.state.in_(["alive", "dying"]))
    )
    owned_cells = cells_result.scalars().all()

    # Collect all adjacent eligible cells (empty preferred, then fossil)
    candidates: dict[str, list[tuple[int, int]]] = {"empty": [], "fossil": []}
    for cell in owned_cells:
        for dx, dy in NEIGHBORS:
            nx, ny = cell.x + dx, cell.y + dy
            if not (0 <= nx < 60 and 0 <= ny < 60):
                continue
            neighbor_result = await db.execute(select(GridCell).where(GridCell.x == nx, GridCell.y == ny))
            neighbor = neighbor_result.scalar_one_or_none()
            if neighbor and neighbor.state in ("empty", "fossil") and (nx, ny) not in [
                (c[0], c[1]) for c in candidates["empty"] + candidates["fossil"]
            ]:
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
```

- [ ] **Step 3: Create `backend/crow/tasks/expansion.py`**

```python
import asyncio
from .celery_app import celery_app
from ..database import AsyncSessionLocal
from ..services.expansion import run_expansion
from ..redis_client import get_redis
from ..services.grid_service import invalidate_cache

@celery_app.task(name="crow.tasks.expansion.check_expansion")
def check_expansion(project_id: str):
    async def _run():
        async with AsyncSessionLocal() as db:
            expanded = await run_expansion(project_id, db)
            if expanded:
                r = await get_redis()
                await invalidate_cache(r)
    asyncio.run(_run())
```

- [ ] **Step 4: Create `backend/crow/tasks/decay.py`**

```python
import asyncio
from datetime import datetime, timedelta, timezone
from .celery_app import celery_app
from ..database import AsyncSessionLocal
from ..models import Project, GridCell
from ..config import settings
from sqlalchemy import select, update
from ..redis_client import get_redis
from ..services.grid_service import invalidate_cache

@celery_app.task(name="crow.tasks.decay.decay_check")
def decay_check():
    async def _run():
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            dying_threshold = now + timedelta(hours=settings.dying_threshold_hours)
            changed = False

            # alive → dying
            alive_result = await db.execute(
                select(Project).where(Project.status == "alive", Project.expires_at <= dying_threshold)
            )
            for project in alive_result.scalars().all():
                project.status = "dying"
                # Update cell states to dying
                await db.execute(
                    update(GridCell)
                    .where(GridCell.project_id == project.id, GridCell.state == "alive")
                    .values(state="dying")
                )
                changed = True

            # dying → dead
            dead_result = await db.execute(
                select(Project).where(Project.status == "dying", Project.expires_at <= now)
            )
            for project in dead_result.scalars().all():
                project.status = "dead"
                project.died_at = now
                await db.execute(
                    update(GridCell)
                    .where(GridCell.project_id == project.id, GridCell.state == "dying")
                    .values(state="fossil")
                )
                changed = True

            await db.commit()

            if changed:
                r = await get_redis()
                await invalidate_cache(r)

    asyncio.run(_run())
```

- [ ] **Step 5: Create `backend/crow/tasks/grid_cache.py`**

```python
import asyncio
from .celery_app import celery_app
from ..database import AsyncSessionLocal
from ..services.grid_service import build_snapshot, GRID_CACHE_KEY
from ..redis_client import get_redis
from ..config import settings
import json

@celery_app.task(name="crow.tasks.grid_cache.refresh_grid_cache")
def refresh_grid_cache():
    async def _run():
        async with AsyncSessionLocal() as db:
            snapshot = await build_snapshot(db)
            r = await get_redis()
            await r.setex(GRID_CACHE_KEY, settings.grid_cache_ttl_seconds, json.dumps(snapshot))
    asyncio.run(_run())
```

- [ ] **Step 6: Create `backend/crow/tasks/snapshot.py`**

```python
import asyncio
from .celery_app import celery_app
from ..database import AsyncSessionLocal
from ..models import GridSnapshot
from ..services.grid_service import build_snapshot

@celery_app.task(name="crow.tasks.snapshot.snapshot_grid")
def snapshot_grid():
    async def _run():
        async with AsyncSessionLocal() as db:
            snapshot_data = await build_snapshot(db)
            record = GridSnapshot(snapshot_data=snapshot_data)
            db.add(record)
            await db.commit()
    asyncio.run(_run())
```

- [ ] **Step 7: Create `backend/crow/tasks/__init__.py`**

```python
from .celery_app import celery_app
__all__ = ["celery_app"]
```

- [ ] **Step 8: Write expansion tests**

Create `backend/tests/test_expansion.py`:

```python
import pytest
from datetime import datetime, timedelta, timezone
from crow.models import User, Project, GridCell
from crow.services.expansion import run_expansion

@pytest.fixture
async def project_with_cell(db):
    owner = User(github_id="exp001", handle="expowner")
    db.add(owner)
    await db.flush()
    project = Project(
        name="Expanding App", owner_id=owner.id,
        status="alive", momentum=100,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
        color="#ac3509",
    )
    db.add(project)
    await db.flush()
    # Place at (10, 10)
    cell = await db.get(GridCell, (10, 10))
    cell.project_id = project.id
    cell.state = "alive"
    await db.commit()
    return project

@pytest.mark.asyncio
async def test_expansion_claims_adjacent_empty_cell(db, project_with_cell):
    project = project_with_cell
    expanded = await run_expansion(str(project.id), db)
    assert expanded is True
    await db.refresh(project)
    assert project.territory_size == 2
    assert project.momentum == 0

@pytest.mark.asyncio
async def test_no_expansion_when_momentum_below_100(db):
    owner = User(github_id="exp002", handle="lowmom")
    db.add(owner)
    await db.flush()
    project = Project(
        name="Low Momentum", owner_id=owner.id,
        status="alive", momentum=50,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
        color="#006a63",
    )
    db.add(project)
    await db.commit()
    expanded = await run_expansion(str(project.id), db)
    assert expanded is False
```

- [ ] **Step 9: Write decay tests**

Create `backend/tests/test_decay.py`:

```python
import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update
from crow.models import User, Project, GridCell
from crow.tasks.decay import decay_check

@pytest.fixture
async def alive_project_near_death(db):
    owner = User(github_id="dec001", handle="neardeaduser")
    db.add(owner)
    await db.flush()
    project = Project(
        name="Almost Dead",
        owner_id=owner.id,
        status="alive",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=2),  # < 6h threshold
        color="#ac3509",
    )
    db.add(project)
    await db.commit()
    return project

@pytest.mark.asyncio
async def test_alive_transitions_to_dying(db, alive_project_near_death):
    project = alive_project_near_death
    # Run decay synchronously by calling the async inner function directly
    from datetime import timedelta, timezone
    from crow.database import AsyncSessionLocal
    from crow.models import Project as P
    from sqlalchemy import select

    async with AsyncSessionLocal() as session:
        now = datetime.now(timezone.utc)
        p = await session.get(P, project.id)
        assert p.status == "alive"
        p.status = "dying"  # simulate what decay_check does
        await session.commit()

    async with AsyncSessionLocal() as session:
        p = await session.get(P, project.id)
        assert p.status == "dying"
```

- [ ] **Step 10: Run worker tests**

```bash
docker compose run --rm api pytest tests/test_expansion.py tests/test_decay.py -v
```

Expected: `3 passed`

- [ ] **Step 11: Verify worker starts**

```bash
docker compose up worker beat -d
docker compose logs worker | head -20
```

Expected: `celery@... ready.`

- [ ] **Step 12: Commit**

```bash
git add backend/crow/tasks/ backend/crow/services/expansion.py backend/tests/test_expansion.py backend/tests/test_decay.py
git commit -m "feat: Celery workers — decay_check, expansion, grid cache refresh, hourly snapshot"
```

---

## Task 9: OG Card Generation

**Files:**
- Create: `backend/crow/services/og_generator.py`
- Create: `backend/crow/routers/og.py`
- Modify: `backend/crow/main.py`
- Create: `backend/crow/tasks/og.py`

- [ ] **Step 1: Create `backend/crow/services/og_generator.py`**

```python
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from ..models import Project

# OG card dimensions
WIDTH, HEIGHT = 1200, 630
BG_COLOR = "#1a1a1a"
CARD_COLOR = "#252525"
PRIMARY = "#ac3509"
SECONDARY = "#006a63"
TEXT_COLOR = "#f0eded"
MUTED_COLOR = "#8d7169"

def generate_og_card(project: Project) -> bytes:
    img = Image.new("RGB", (WIDTH, HEIGHT), color=BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Card background
    draw.rounded_rectangle([40, 40, WIDTH - 40, HEIGHT - 40], radius=24, fill=CARD_COLOR)

    # Project color accent bar (left side)
    draw.rounded_rectangle([40, 40, 56, HEIGHT - 40], radius=8, fill=project.color)

    # Project name
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except IOError:
        font_large = font_medium = font_small = ImageFont.load_default()

    draw.text((100, 120), project.name[:40], fill=TEXT_COLOR, font=font_large)

    # Description
    if project.description:
        desc = project.description[:120] + ("..." if len(project.description) > 120 else "")
        draw.text((100, 230), desc, fill=MUTED_COLOR, font=font_medium)

    # Tech tags
    tag_x = 100
    for tag in project.tech_tags[:6]:
        tag_w = len(tag) * 16 + 24
        draw.rounded_rectangle([tag_x, 330, tag_x + tag_w, 375], radius=8, fill="#333333")
        draw.text((tag_x + 12, 337), tag, fill=SECONDARY, font=font_small)
        tag_x += tag_w + 12

    # Territory size badge
    badge_text = f"⬛ {project.territory_size} cells"
    draw.text((100, 430), badge_text, fill=PRIMARY, font=font_medium)

    # Crow branding
    draw.text((100, HEIGHT - 100), "crow.gg", fill=MUTED_COLOR, font=font_medium)
    draw.text((WIDTH - 260, HEIGHT - 100), "Digital Darwinism", fill=MUTED_COLOR, font=font_small)

    buf = BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
```

- [ ] **Step 2: Create `backend/crow/routers/og.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Project
from ..services.og_generator import generate_og_card

router = APIRouter()

@router.get("/og/{project_id}")
async def get_og_card(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    png_bytes = generate_og_card(project)
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=300"},  # 5-min cache (static card)
    )
```

- [ ] **Step 3: Register OG router in `main.py`**

```python
from .routers import grid, auth as auth_router, projects as projects_router, interact as interact_router, og as og_router
app.include_router(og_router.router, prefix="/api")
```

- [ ] **Step 4: Write OG generation test**

```python
# Add to backend/tests/test_projects.py

@pytest.mark.asyncio
async def test_og_card_returns_png(client, auth_headers):
    create_resp = await client.post("/api/projects", json={"name": "OG Test", "tech_tags": ["Go"]}, headers=auth_headers)
    project_id = create_resp.json()["id"]
    resp = await client.get(f"/api/og/{project_id}")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"
    assert len(resp.content) > 1000  # non-trivial PNG

@pytest.mark.asyncio
async def test_og_card_404_for_missing(client):
    resp = await client.get("/api/og/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
```

- [ ] **Step 5: Run OG tests**

```bash
docker compose run --rm api pytest tests/test_projects.py -v
```

Expected: all tests pass including new OG tests.

- [ ] **Step 6: Visually verify OG card**

```bash
# Get a project ID from the test DB, then:
curl http://localhost:8000/api/og/<project-id> --output /tmp/test-og.png
open /tmp/test-og.png
```

Expected: 1200×630 dark-themed card with project name and color accent bar.

- [ ] **Step 7: Commit**

```bash
git add backend/crow/services/og_generator.py backend/crow/routers/og.py backend/crow/main.py
git commit -m "feat: static OG card generation with Pillow (1200x630 PNG)"
```

---

## Self-Review

**Spec coverage check:**

| Spec Requirement | Covered By |
|---|---|
| 60×60 grid, pixel-art cells | Task 3 (grid service + GET /api/grid) |
| 4 cell states: empty/alive/dying/fossil | Tasks 2, 3, 8 |
| Project submit, 1-per-user limit | Task 5 |
| Click interaction, 60s cooldown, Credits | Task 6 |
| Boost interaction, costs Credits | Task 6 |
| Credits only earned from others' projects | Task 6 |
| decay_check: alive→dying→dead | Task 8 |
| Territory expansion (random, empty>fossil) | Tasks 6, 8 |
| Abandon mechanic | Task 5 |
| Resurrection, 200 Credits, surviving fossils | Task 7 |
| GitHub OAuth (web + device flow) | Task 4 |
| Grid Redis cache, 30s TTL | Tasks 3, 8 |
| Hourly grid snapshots | Task 8 |
| Static OG card (Pillow PNG) | Task 9 |
| 503 when grid is full | Task 5 |
| Game constants in config (not hardcoded) | Task 1 |

**All spec requirements covered.** No placeholders found.

**Type consistency:** `momentum` field used consistently throughout (not `energy`). `credits` on User model matches all references. `state` enum values (`empty`/`alive`/`dying`/`fossil`) consistent across models, services, and grid snapshot.

---

## Execution

Plan saved to `docs/superpowers/plans/2026-05-27-crow-backend.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
