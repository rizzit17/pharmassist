"""
ComplaintRepository — only layer that issues SQLAlchemy queries for complaints.
No business logic here; services orchestrate repositories.
"""
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_, and_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.complaint import Complaint
from app.models.ai_analysis import AIAnalysis


class ComplaintRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_complaint_number(self) -> str:
        """Generate sequential complaint number like CC-2026-00154 guaranteed unique."""
        year = datetime.now(timezone.utc).year
        prefix = f"CC-{year}-"

        result = await self.db.execute(
            select(Complaint.complaint_number).where(Complaint.complaint_number.like(f"{prefix}%"))
        )
        existing_numbers = set(result.scalars().all())

        max_seq = 0
        for num in existing_numbers:
            try:
                seq = int(num.replace(prefix, ""))
                if seq > max_seq:
                    max_seq = seq
            except ValueError:
                pass

        next_seq = max_seq + 1
        while f"{prefix}{next_seq:05d}" in existing_numbers:
            next_seq += 1

        return f"{prefix}{next_seq:05d}"

    async def create(self, data: dict, created_by: Optional[str] = None) -> Complaint:
        complaint_number = await self.generate_complaint_number()
        complaint = Complaint(
            complaint_number=complaint_number,
            created_by=created_by,
            **{k: v for k, v in data.items() if hasattr(Complaint, k) and k not in ("id", "complaint_number", "created_by", "created_at", "updated_at")},
        )
        self.db.add(complaint)
        await self.db.commit()
        return await self.get_by_id(complaint.id)

    async def get_by_id(self, complaint_id: str) -> Optional[Complaint]:
        result = await self.db.execute(
            select(Complaint)
            .options(selectinload(Complaint.ai_analyses))
            .where(Complaint.id == complaint_id)
        )
        return result.scalar_one_or_none()

    async def get_by_number(self, complaint_number: str) -> Optional[Complaint]:
        result = await self.db.execute(
            select(Complaint).where(Complaint.complaint_number == complaint_number)
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> Tuple[List[Complaint], int]:
        query = select(Complaint).options(selectinload(Complaint.ai_analyses))

        if status:
            query = query.where(Complaint.status == status)
        if search:
            query = query.where(
                or_(
                    Complaint.customer_name.ilike(f"%{search}%"),
                    Complaint.product_name.ilike(f"%{search}%"),
                    Complaint.batch_lot_number.ilike(f"%{search}%"),
                    Complaint.complaint_number.ilike(f"%{search}%"),
                )
            )

        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar() or 0

        # Sorting
        sort_col = getattr(Complaint, sort_by, Complaint.created_at)
        if sort_order == "desc":
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def update(self, complaint_id: str, data: dict) -> Optional[Complaint]:
        complaint = await self.get_by_id(complaint_id)
        if not complaint:
            return None
        for key, value in data.items():
            if hasattr(complaint, key) and key not in ("id", "complaint_number", "created_by", "created_at"):
                setattr(complaint, key, value)
        complaint.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        return await self.get_by_id(complaint_id)

    async def delete(self, complaint_id: str) -> bool:
        complaint = await self.get_by_id(complaint_id)
        if not complaint:
            return False
        await self.db.delete(complaint)
        await self.db.commit()
        return True

    async def get_duplicates_candidates(
        self, product_name: str, batch_prefix: str, days_window: int = 90
    ) -> List[Complaint]:
        """Two-stage duplicate pre-filter: SQL structured search (step 1 of 2)."""
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_window)
        result = await self.db.execute(
            select(Complaint)
            .where(
                and_(
                    func.lower(Complaint.product_name) == product_name.lower(),
                    Complaint.batch_lot_number.ilike(f"{batch_prefix[:6]}%"),
                    Complaint.created_at >= cutoff,
                    Complaint.status != "draft",
                )
            )
            .limit(5)
        )
        return result.scalars().all()

    async def save_ai_analysis(self, complaint_id: str, analysis_data: dict) -> AIAnalysis:
        analysis = AIAnalysis(complaint_id=complaint_id, **analysis_data)
        self.db.add(analysis)
        await self.db.commit()
        await self.db.refresh(analysis)
        return analysis
