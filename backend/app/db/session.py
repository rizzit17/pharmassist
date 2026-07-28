"""Async SQLAlchemy engine and session factory."""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import settings
from app.db.base import Base

is_sqlite = settings.database_url.startswith("sqlite")

engine_kwargs = {
    "echo": settings.debug,
}
if not is_sqlite:
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
    })

engine = create_async_engine(settings.database_url, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def create_db_tables() -> None:
    """Create all tables if they don't exist (used for non-Alembic dev startup)."""
    async with engine.begin() as conn:
        # Import all models so Base.metadata is populated
        from app.models import user, complaint, ai_analysis, chat_history, audit_log, duplicate_flag  # noqa
        await conn.run_sync(Base.metadata.create_all)
