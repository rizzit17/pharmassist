"""
FastAPI dependency injection providers.
Provides: async DB session, current authenticated user.
"""
from typing import AsyncGenerator, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import AsyncSessionLocal

security = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async SQLAlchemy session, auto-closing on exit."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """
    Resolve the current user from the JWT bearer token.
    If AUTH_REQUIRED=False, returns the seeded demo user without a token.
    Raises 401 if AUTH_REQUIRED=True and token is missing/invalid.
    """
    from app.repositories.user_repository import UserRepository

    if not settings.auth_required:
        # Dev/test bypass — return demo user
        repo = UserRepository(db)
        demo_user = await repo.get_by_email("demo@pharmassist.com")
        if demo_user:
            return demo_user
        # Fallback stub if seed hasn't run yet
        return type("DemoUser", (), {"id": "demo", "email": "demo@pharmassist.com", "name": "Demo User", "role": "qa_officer"})()

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a Bearer token or use the demo login.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    subject = decode_access_token(credentials.credentials)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    repo = UserRepository(db)
    user = await repo.get_by_email(subject)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )
    return user
