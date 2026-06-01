import asyncio
from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine
from crow.config import settings
from crow.database import Base
from crow import models  # noqa: F401 — registers all models with Base.metadata

config = context.config

def run_migrations_offline() -> None:
    url = settings.database_url
    context.configure(url=url, target_metadata=Base.metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    url = settings.database_url
    engine = create_async_engine(url)
    async with engine.connect() as conn:
        await conn.run_sync(
            lambda sync_conn: context.configure(
                connection=sync_conn,
                target_metadata=Base.metadata,
            )
        )
        async with conn.begin():
            await conn.run_sync(lambda _: context.run_migrations())
    await engine.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
