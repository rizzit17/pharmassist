"""
CopilotService — orchestrates the LangGraph runner for chat and upload workflows.
This is the only layer that touches the LangGraph engine directly.
"""
import uuid
import logging
from typing import Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.langgraph.graph import build_graph
from app.langgraph.state import ComplaintGraphState
from app.repositories.chat_repository import ChatRepository
from app.repositories.audit_repository import AuditRepository
from app.schemas.copilot import CopilotResponseEnvelope

logger = logging.getLogger(__name__)


def _state_to_envelope(state: ComplaintGraphState, session_id: str) -> CopilotResponseEnvelope:
    """Convert final graph state to the API response envelope."""
    return CopilotResponseEnvelope(
        session_id=session_id,
        intent=state.get("intent"),
        complaint=state.get("complaint"),
        updated_fields=state.get("updated_fields") or [],
        confidence_scores=state.get("confidence_scores") or {},
        risk_assessment=state.get("risk_assessment"),
        recommendations=state.get("recommendations"),
        completeness=state.get("completeness"),
        duplicate_warning=state.get("duplicate_warning"),
        assistant_message=state.get("assistant_message", ""),
        status=state.get("status", "success"),
        ocr_method=state.get("ocr_method"),
    )


class CopilotService:
    """
    Orchestrates AI Copilot sessions.
    Each session has a unique session_id used as the LangGraph thread_id for checkpointing.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.chat_repo = ChatRepository(db)
        self.audit_repo = AuditRepository(db)

    async def process_chat(
        self,
        message: str,
        session_id: Optional[str] = None,
        complaint_id: Optional[str] = None,
        current_complaint: Optional[Dict[str, Any]] = None,
    ) -> CopilotResponseEnvelope:
        """
        Process a chat message through the LangGraph pipeline.
        Manages session continuity via LangGraph checkpointing.
        """
        session_id = session_id or str(uuid.uuid4())

        # Load chat history for this session
        history_messages = await self.chat_repo.get_session_history(session_id)
        chat_history = [
            {"role": msg.role, "content": msg.message}
            for msg in history_messages
        ]

        # Save user message to DB
        await self.chat_repo.save_message(
            session_id=session_id,
            role="user",
            message=message,
            complaint_id=complaint_id,
        )

        # Build graph with DB session for duplicate detection
        graph = build_graph(db_session=self.db)

        # Initial state for this turn
        initial_state: ComplaintGraphState = {
            "session_id": session_id,
            "complaint_id": complaint_id,
            "user_message": message,
            "chat_history": chat_history,
            "complaint": current_complaint or {},
            "existing_complaint": current_complaint or {},
            "updated_fields": [],
            "confidence_scores": {},
            "requires_risk_rerun": False,
            "status": "processing",
        }

        try:
            # Run graph with session checkpointing
            config = {"configurable": {"thread_id": session_id}}
            final_state = await graph.ainvoke(initial_state, config=config)
        except Exception as e:
            logger.error("Graph execution failed for session %s: %s", session_id, e)
            final_state = {
                **initial_state,
                "status": "error",
                "assistant_message": "I'm having trouble reaching the AI service - please try again in a moment.",
            }

        # Save assistant response to DB
        await self.chat_repo.save_message(
            session_id=session_id,
            role="assistant",
            message=final_state.get("assistant_message", ""),
            complaint_id=complaint_id,
        )

        return _state_to_envelope(final_state, session_id)

    async def process_upload(
        self,
        file_path: str,
        file_name: str,
        session_id: Optional[str] = None,
        complaint_id: Optional[str] = None,
        current_complaint: Optional[Dict[str, Any]] = None,
    ) -> CopilotResponseEnvelope:
        """
        Process a file upload through the document extraction pipeline.
        Forces intent=DOCUMENT_UPLOAD and routes through extraction.
        """
        session_id = session_id or str(uuid.uuid4())

        # Save file upload as user message
        await self.chat_repo.save_message(
            session_id=session_id,
            role="user",
            message=f"[File uploaded: {file_name}]",
            complaint_id=complaint_id,
            attached_file_name=file_name,
        )

        history_messages = await self.chat_repo.get_session_history(session_id)
        chat_history = [
            {"role": msg.role, "content": msg.message}
            for msg in history_messages[:-1]  # Exclude the upload message itself
        ]

        graph = build_graph(db_session=self.db)

        initial_state: ComplaintGraphState = {
            "session_id": session_id,
            "complaint_id": complaint_id,
            "user_message": f"[Document uploaded: {file_name}]",
            "chat_history": chat_history,
            "uploaded_file_path": file_path,
            "uploaded_file_name": file_name,
            "complaint": current_complaint or {},
            "existing_complaint": current_complaint or {},
            "intent": "DOCUMENT_UPLOAD",  # Pre-set to skip intent detection ambiguity
            "updated_fields": [],
            "confidence_scores": {},
            "requires_risk_rerun": False,
            "status": "processing",
        }

        try:
            config = {"configurable": {"thread_id": session_id}}
            final_state = await graph.ainvoke(initial_state, config=config)
        except Exception as e:
            logger.error("Upload graph execution failed for session %s: %s", session_id, e)
            final_state = {
                **initial_state,
                "status": "error",
                "assistant_message": "I'm having trouble processing your file - please try again or paste the complaint text instead.",
            }

        await self.chat_repo.save_message(
            session_id=session_id,
            role="assistant",
            message=final_state.get("assistant_message", ""),
            complaint_id=complaint_id,
        )

        return _state_to_envelope(final_state, session_id)

    async def get_session_history(self, session_id: str) -> list:
        """Return formatted chat history for a session."""
        messages = await self.chat_repo.get_session_history(session_id)
        return [
            {
                "id": msg.id,
                "role": msg.role,
                "message": msg.message,
                "attached_file_name": msg.attached_file_name,
                "created_at": msg.created_at.isoformat(),
            }
            for msg in messages
        ]
