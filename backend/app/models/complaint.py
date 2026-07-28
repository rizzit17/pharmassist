"""Complaint ORM model — core entity of the QMS module."""
import uuid
from datetime import datetime, timezone, date
from typing import Optional
from sqlalchemy import String, DateTime, Date, Integer, Text, ForeignKey, Enum as SAEnum, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Complaint(Base):
    __tablename__ = "complaints"
    __table_args__ = (
        Index("ix_complaints_batch_lot_number", "batch_lot_number"),
        Index("ix_complaints_product_name", "product_name"),
        Index("ix_complaints_status", "status"),
        Index("ix_complaints_created_at", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    # Section 1: Origin & Customer Details
    source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Section 2: Product & Batch Identification
    product_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    product_strength: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    batch_lot_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    affected_quantity: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    manufacturing_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Section 3: Facility & Material Impact
    originating_site_block: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    impacted_npm: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Section 4: Defect Analysis
    complaint_category: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    complaint_description: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)

    # Workflow status
    status: Mapped[str] = mapped_column(
        SAEnum(
            "draft",
            "pending_triage",
            "ready_to_commit",
            "committed",
            "under_investigation",
            "capa_assigned",
            "closed",
            name="complaint_status_enum",
        ),
        default="draft",
        nullable=False,
    )

    # FK
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    creator: Mapped[Optional["User"]] = relationship("User", back_populates="complaints")  # noqa: F821
    ai_analyses: Mapped[list["AIAnalysis"]] = relationship("AIAnalysis", back_populates="complaint", cascade="all, delete-orphan")  # noqa: F821
    chat_messages: Mapped[list["ChatHistory"]] = relationship("ChatHistory", back_populates="complaint", cascade="all, delete-orphan")  # noqa: F821
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="complaint", cascade="all, delete-orphan")  # noqa: F821
    duplicate_flags: Mapped[list["DuplicateFlag"]] = relationship("DuplicateFlag", foreign_keys="DuplicateFlag.complaint_id", back_populates="complaint", cascade="all, delete-orphan")  # noqa: F821
