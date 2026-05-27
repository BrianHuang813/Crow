import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from crow.database import Base, get_db

TEST_DB_URL = "postgresql+asyncpg://crow:crow@localhost:5432/crow_test"

@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(TEST_DB_URL)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    # Seed empty grid cells (lifespan event doesn't run in tests)
    from crow.services.grid_service import seed_empty_grid
    session_factory = async_sessionmaker(eng, expire_on_commit=False)
    async with session_factory() as session:
        await seed_empty_grid(session)
    yield eng
    await eng.dispose()

@pytest_asyncio.fixture
async def db(engine):
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

@pytest_asyncio.fixture
async def client(engine):
    from crow.main import app
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
