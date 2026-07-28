"""ChatRepository — stores and retrieves conversation history."""
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_history import ChatHistory


class ChatRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save_message(
        self,
        session_id: str,
        role: str,
        message: str,
        complaint_id: Optional[str] = None,
        attached_file_name: Optional[str] = None,
    ) -> ChatHistory:
        msg = ChatHistory(
            session_id=session_id,
            role=role,
            message=message,
            complaint_id=complaint_id,
            attached_file_name=attached_file_name,
        )
        self.db.add(msg)
        await self.db.commit()
        await self.db.refresh(msg)
        return msg

    async def get_session_history(self, session_id: str) -> List[ChatHistory]:
        result = await self.db.execute(
            select(ChatHistory)
            .where(ChatHistory.session_id == session_id)
            .order_by(ChatHistory.created_at.asc())
        )
        return result.scalars().all()

    async def get_complaint_history(self, complaint_id: str) -> List[ChatHistory]:
        result = await self.db.execute(
            select(ChatHistory)
            .where(ChatHistory.complaint_id == complaint_id)
            .order_by(ChatHistory.created_at.asc())
        )
        return result.scalars().all()

    async def get_all_sessions(self, limit: int = 50) -> List[dict]:
        """Return distinct session IDs with last message time for History page."""
        result = await self.db.execute(
            select(
                ChatHistory.session_id,
                ChatHistory.complaint_id,
                select(ChatHistory.message)
                .where(ChatHistory.session_id == ChatHistory.session_id)
                .order_by(ChatHistory.created_at.desc())
                .limit(1)
                .scalar_subquery()
                .label("last_message"),
            )
            .group_by(ChatHistory.session_id, ChatHistory.complaint_id)
            .order_by(ChatHistory.session_id.desc())
            .limit(limit)
        )
        return [{"session_id": r.session_id, "complaint_id": r.complaint_id} for r in result.all()]
