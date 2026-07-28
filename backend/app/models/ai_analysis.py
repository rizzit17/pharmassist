"""AIAnalysis ORM model — versioned AI assessments per complaint."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AIAnalysis(Base):
    __tablename__ = "ai_analysis"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id: Mapped[str] = mapped_column(String(36), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)

    severity: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Minor/Major/Critical
    suggested_next_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    initial_risk_assessment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    regulatory_reportable: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    root_cause_suggestions: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    capa_suggestions: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    confidence_scores: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="ai_analyses")  # noqa: F821
