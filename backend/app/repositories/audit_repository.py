"""AuditRepository — append-only audit log storage and retrieval."""
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        complaint_id: str,
        actor: str,
        action_type: str,
        actor_name: str = None,
        field_name: str = None,
        old_value: str = None,
        new_value: str = None,
    ) -> AuditLog:
        entry = AuditLog(
            complaint_id=complaint_id,
            actor=actor,
            actor_name=actor_name,
            action_type=action_type,
            field_name=field_name,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(new_value) if new_value is not None else None,
        )
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)
        return entry

    async def get_for_complaint(self, complaint_id: str) -> List[AuditLog]:
        result = await self.db.execute(
            select(AuditLog)
            .where(AuditLog.complaint_id == complaint_id)
            .order_by(AuditLog.created_at.asc())
        )
        return result.scalars().all()
