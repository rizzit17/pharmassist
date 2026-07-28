"""UserRepository — user lookup and creation."""
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create(self, email: str, name: str, hashed_password: str, role: str = "qa_officer") -> User:
        user = User(email=email, name=name, hashed_password=hashed_password, role=role)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user
