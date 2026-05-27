import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from crow.database import Base, get_db

TEST_DB_URL = "postgresql+asyncpg://crow:crow@localhost:5432/crow_test"

@pytest_asyncio.fixture(scope="session")
def event_loop_policy():
    """Use default event loop policy for all tests in session."""
    import asyncio
    return asyncio.DefaultEventLoopPolicy()

@pytest_asyncio.fixture
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
    from crow.main import app
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async def override_db():
        async with session_factory() as session:
            yield session
    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
