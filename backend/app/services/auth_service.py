"""AuthService — user authentication and JWT token management."""
from datetime import timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import verify_password, create_access_token, hash_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenOut, UserOut, AuthResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)

    async def login(self, email: str, password: str) -> Optional[AuthResponse]:
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            return None

        token = create_access_token(subject=user.email)
        return AuthResponse(
            token=TokenOut(
                access_token=token,
                token_type="bearer",
                expires_in=settings.jwt_expire_minutes * 60,
            ),
            user=UserOut.model_validate(user),
        )

    async def demo_login(self) -> AuthResponse:
        """Return auth response for the seeded demo user without password verification."""
        user = await self.user_repo.get_by_email("demo@aivoa.com")
        if not user:
            user = await self.user_repo.create(
                email="demo@aivoa.com",
                name="Demo QA Officer",
                hashed_password=hash_password("demo1234"),
                role="qa_officer",
            )

        token = create_access_token(subject=user.email)
        return AuthResponse(
            token=TokenOut(
                access_token=token,
                token_type="bearer",
                expires_in=settings.jwt_expire_minutes * 60,
            ),
            user=UserOut.model_validate(user),
        )
