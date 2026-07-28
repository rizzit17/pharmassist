"""
ComplaintService — business logic orchestration for complaint CRUD and audit logging.
Calls repositories only; never touches SQLAlchemy queries directly.
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.complaint_repository import ComplaintRepository
from app.repositories.audit_repository import AuditRepository
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate, ComplaintOut, ComplaintListOut
from app.models.complaint import Complaint

logger = logging.getLogger(__name__)


class ComplaintService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.complaint_repo = ComplaintRepository(db)
        self.audit_repo = AuditRepository(db)

    async def create_complaint(
        self,
        data: ComplaintCreate,
        created_by: Optional[str] = None,
        ai_analysis_data: Optional[dict] = None,
    ) -> ComplaintOut:
        """Create a new complaint and log the creation event."""
        complaint_dict = data.model_dump(exclude_unset=False)
        complaint = await self.complaint_repo.create(complaint_dict, created_by=created_by)

        # Log creation
        await self.audit_repo.log(
            complaint_id=complaint.id,
            actor="human",
            actor_name=created_by or "system",
            action_type="create",
        )

        # Persist AI analysis if provided
        if ai_analysis_data:
            await self.complaint_repo.save_ai_analysis(complaint.id, ai_analysis_data)
            await self.audit_repo.log(
                complaint_id=complaint.id,
                actor="ai",
                action_type="ai_extraction",
                field_name="ai_analysis",
                new_value=ai_analysis_data.get("severity", ""),
            )

        return ComplaintOut.model_validate(complaint)

    async def get_complaint(self, complaint_id: str) -> Optional[ComplaintOut]:
        complaint = await self.complaint_repo.get_by_id(complaint_id)
        if not complaint:
            return None
        return ComplaintOut.model_validate(complaint)

    async def list_complaints(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> ComplaintListOut:
        import math
        items, total = await self.complaint_repo.list(
            page=page, page_size=page_size, status=status,
            search=search, sort_by=sort_by, sort_order=sort_order
        )
        return ComplaintListOut(
            items=[ComplaintOut.model_validate(c) for c in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total > 0 else 0,
        )

    async def update_complaint(
        self,
        complaint_id: str,
        data: ComplaintUpdate,
        actor: str = "human",
        actor_name: Optional[str] = None,
        updated_by_ai: bool = False,
    ) -> Optional[ComplaintOut]:
        """Update a complaint and log each changed field to the audit trail."""
        existing = await self.complaint_repo.get_by_id(complaint_id)
        if not existing:
            return None

        update_dict = data.model_dump(exclude_unset=True, exclude_none=True)

        # Log each field change
        for field, new_val in update_dict.items():
            old_val = getattr(existing, field, None)
            if str(old_val) != str(new_val):
                await self.audit_repo.log(
                    complaint_id=complaint_id,
                    actor=actor,
                    actor_name=actor_name,
                    action_type="ai_update" if updated_by_ai else "update",
                    field_name=field,
                    old_value=str(old_val) if old_val is not None else None,
                    new_value=str(new_val),
                )

        updated = await self.complaint_repo.update(complaint_id, update_dict)
        return ComplaintOut.model_validate(updated)

    async def delete_complaint(self, complaint_id: str) -> bool:
        return await self.complaint_repo.delete(complaint_id)

    async def get_audit_trail(self, complaint_id: str) -> list:
        from app.schemas.audit import AuditLogOut
        logs = await self.audit_repo.get_for_complaint(complaint_id)
        return [AuditLogOut.model_validate(log) for log in logs]

    async def commit_complaint(
        self,
        complaint_id: str,
        actor_name: Optional[str] = None,
        ai_analysis_data: Optional[dict] = None,
    ) -> Optional[ComplaintOut]:
        """Transition a draft complaint to 'committed' status."""
        updated = await self.update_complaint(
            complaint_id=complaint_id,
            data=ComplaintUpdate(status="committed"),
            actor="human",
            actor_name=actor_name,
        )

        if updated and ai_analysis_data:
            await self.complaint_repo.save_ai_analysis(complaint_id, ai_analysis_data)

        await self.audit_repo.log(
            complaint_id=complaint_id,
            actor="human",
            actor_name=actor_name,
            action_type="commit",
        )

        return updated
