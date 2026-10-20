"""Durable draft state for multi-turn copilot sessions."""
from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class CopilotSession(Base):
    __tablename__ = "copilot_sessions"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    state: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
