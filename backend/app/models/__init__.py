"""Models package — import all models so they're registered with Base.metadata."""
from app.models.user import User
from app.models.complaint import Complaint
from app.models.ai_analysis import AIAnalysis
from app.models.chat_history import ChatHistory
from app.models.audit_log import AuditLog
from app.models.duplicate_flag import DuplicateFlag

__all__ = ["User", "Complaint", "AIAnalysis", "ChatHistory", "AuditLog", "DuplicateFlag"]
