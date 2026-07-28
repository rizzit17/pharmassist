"""ChatHistory ORM model — per-session multi-turn conversation log."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    complaint_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user | assistant
    message: Mapped[str] = mapped_column(Text, nullable=False)
    attached_file_name: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    complaint: Mapped[Optional["Complaint"]] = relationship("Complaint", back_populates="chat_messages")  # noqa: F821
