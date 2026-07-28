"""
Response Formatter Node — assembles the final structured JSON envelope and human-readable chat message.
ALWAYS runs, even on upstream error (per IMPLEMENTATION_NOTES decision 6).

Input state fields used: all state fields
Output state fields set: assistant_message, status (finalized)
"""
import logging
from typing import Any

from app.langgraph.state import ComplaintGraphState

logger = logging.getLogger(__name__)


def _build_assistant_message(state: ComplaintGraphState) -> str:
    """Build a human-readable assistant chat message summarizing the AI's actions."""
    intent = state.get("intent", "")
    complaint = state.get("complaint") or {}
    updated_fields = state.get("updated_fields") or []
    completeness = state.get("completeness") or {}
    duplicate_warning = state.get("duplicate_warning") or {}
    risk = state.get("risk_assessment") or {}
    status = state.get("status", "success")

    # Error states
    if status == "error":
        return state.get("assistant_message") or "I'm having trouble reaching the AI service — please try again in a moment."

    # Needs clarification — return the clarifying question directly
    if status == "needs_clarification":
        return state.get("assistant_message") or "Could you clarify your request?"

    # GENERAL_QUERY or Greetings
    text_lower = (state.get("user_message") or "").strip().lower()
    greetings = {"hi", "hello", "hey", "good morning", "good afternoon", "hi there", "hello there", "help", "who are you"}

    if intent == "GENERAL_QUERY" or text_lower in greetings or any(text_lower.startswith(g) for g in ["hi ", "hello ", "hey "]):
        if text_lower in greetings or any(g in text_lower for g in ["hi copilot", "hello copilot", "hi", "hello", "hey"]):
            return "Hello! I am your AIVOA QA Copilot. I can help you extract customer complaints from plain text or PDF/email files, generate AI risk assessments, and manage your QMS records. How can I assist you today?"
        
        if state.get("assistant_message") and state["assistant_message"] != "I've processed your query.":
            return state["assistant_message"]
        
        return "I am ready to assist with your QMS complaint logging. You can paste a complaint description, attach a file, or ask me a quality assurance question."

    # Build the primary response
    parts = []

    if intent == "NEW_COMPLAINT":
        extracted_count = len([v for v in complaint.values() if v is not None])
        parts.append(f"✅ I've extracted {extracted_count} fields from your complaint description.")
    elif intent == "DOCUMENT_UPLOAD":
        file_name = state.get("uploaded_file_name", "your document")
        extracted_count = len([v for v in complaint.values() if v is not None])
        parts.append(f"📄 I've processed {file_name} and extracted {extracted_count} fields.")
    elif intent == "EDIT_COMPLAINT":
        if updated_fields:
            field_list = ", ".join(f"'{f}'" for f in updated_fields[:5])
            parts.append(f"✏️ Updated: {field_list}.")
        else:
            parts.append("I reviewed your correction but didn't find clear field updates to apply.")

    # Risk assessment summary
    if risk.get("severity"):
        severity_emoji = {"Critical": "🔴", "Major": "🟠", "Minor": "🟡"}.get(risk["severity"], "⚪")
        parts.append(f"{severity_emoji} Risk classified as {risk['severity']}.")
        if risk.get("regulatory_reportable"):
            parts.append("⚠️ This complaint may require regulatory notification — please review with QA.")

    # Missing fields notice
    missing = completeness.get("missing_fields", [])
    if missing:
        missing_str = ", ".join(missing[:4])
        parts.append(f"ℹ️ Still missing: {missing_str}.")

    # Duplicate warning
    if duplicate_warning.get("found"):
        candidates = duplicate_warning.get("candidates", [])
        if candidates:
            top = candidates[0]
            parts.append(
                f"🔔 Possible duplicate detected: {top.get('complaint_number', '')} "
                f"(similarity: {top.get('similarity_score', 0):.0%}). Please review before committing."
            )

    # Ready to commit hint
    if completeness.get("is_complete") and risk.get("severity"):
        parts.append("The form is complete. You can Commit to QMS Ledger when ready.")

    return " ".join(parts) if parts else "I've processed your request. Please review the form."


async def response_formatter_node(state: ComplaintGraphState) -> dict:
    """
    Final node — always runs. Assembles the human-readable assistant_message.
    The full structured state IS the response (returned by the graph runner).
    """
    try:
        # If status not set, default to success
        current_status = state.get("status") or "success"
        if current_status == "processing":
            current_status = "success"

        assistant_message = _build_assistant_message({**state, "status": current_status})

        logger.info(
            "Response formatter: intent=%s, status=%s, updated=%s",
            state.get("intent"), current_status, state.get("updated_fields")
        )

        return {
            "status": current_status,
            "assistant_message": assistant_message,
        }

    except Exception as e:
        logger.error("Response formatter failed: %s", e)
        return {
            "status": "error",
            "assistant_message": "I'm having trouble processing your request — please try again.",
        }
