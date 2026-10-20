"""Keep API tests independent of local data, credentials and external services."""
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.main import app
from app.db.base import Base
from app.core.dependencies import get_db


@pytest_asyncio.fixture(autouse=True)
async def isolated_database():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async def override_db():
        async with sessions() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
    app.dependency_overrides[get_db] = override_db
    yield sessions
    app.dependency_overrides.clear()
    await engine.dispose()
