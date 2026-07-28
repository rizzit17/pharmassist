"""DuplicateFlag ORM model — records detected duplicate complaint relationships."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DuplicateFlag(Base):
    __tablename__ = "duplicate_flags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id: Mapped[str] = mapped_column(String(36), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    duplicate_of_complaint_id: Mapped[str] = mapped_column(String(36), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    complaint: Mapped["Complaint"] = relationship("Complaint", foreign_keys=[complaint_id], back_populates="duplicate_flags")  # noqa: F821
    duplicate_of: Mapped["Complaint"] = relationship("Complaint", foreign_keys=[duplicate_of_complaint_id])  # noqa: F821
