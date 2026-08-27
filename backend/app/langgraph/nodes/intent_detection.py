"""
Intent Detection Node — classifies the user's intent into one of five categories.
Uses gemma2-9b-it (lightweight, fast) for classification.

Input state fields used: user_message, chat_history, existing_complaint
Output state fields set: intent
"""
import json
import logging
from typing import Any

from langchain_core.messages import SystemMessage, HumanMessage

from app.langgraph.state import ComplaintGraphState
from app.utils.llm_client import invoke_llm_with_retry

logger = logging.getLogger(__name__)

INTENT_SYSTEM_PROMPT = """You are an AI assistant for a pharmaceutical Quality Management System (QMS).
Your task is to classify the user's intent into exactly one of these categories:

- NEW_COMPLAINT: The user is describing a new customer complaint or product quality issue (no active draft).
- EDIT_COMPLAINT: The user is correcting, updating, or providing additional information for an EXISTING complaint draft that is already in context. Look for corrections like "actually it's X", "change the batch to Y", "no, the quantity is Z".
- DOCUMENT_UPLOAD: The user has uploaded a file (PDF, email, image) containing complaint information. This is handled separately — do NOT use this unless the system tells you a file was uploaded.
- GENERAL_QUERY: The user is asking a question about existing data, statistics, or the system (e.g., "how many complaints this month?", "what's the status of CC-2026-00154?").
- AMBIGUOUS: The user's message references a value or correction but it's genuinely unclear WHICH field they mean to update (e.g., "actually it's 48" with multiple numeric fields in the current complaint). Prefer AMBIGUOUS over guessing.

CRITICAL RULES:
1. If there is an existing complaint draft in context AND the user seems to be correcting/updating it, choose EDIT_COMPLAINT.
2. If a file was mentioned as uploaded in the conversation, choose DOCUMENT_UPLOAD.
3. Prefer AMBIGUOUS over guessing when a correction references a value without naming which field, AND multiple candidate fields exist.
4. Return ONLY valid JSON: {"intent": "ONE_OF_THE_FIVE_CATEGORIES", "reasoning": "brief explanation"}
"""


async def intent_detection_node(state: ComplaintGraphState) -> dict:
    """
    Classify user intent. Returns partial state update with 'intent'.
    Never raises — on failure, sets intent to AMBIGUOUS and logs error.
    """
    try:
        if state.get("uploaded_file_path") or state.get("intent") == "DOCUMENT_UPLOAD":
            logger.info("Intent detected as DOCUMENT_UPLOAD from uploaded file: %s", state.get("uploaded_file_name"))
            return {"intent": "DOCUMENT_UPLOAD"}

        user_msg = (state.get("user_message") or "").strip().lower()
        if user_msg in {"hi", "hello", "hey", "good morning", "good afternoon", "hi there", "hello there", "help", "who are you"}:
            return {"intent": "GENERAL_QUERY"}

        existing = state.get("existing_complaint") or state.get("complaint")
        existing_summary = ""
        if existing:
            existing_summary = f"\n\nCurrent complaint in context:\n{json.dumps(existing, indent=2, default=str)}"

        history_str = ""
        history = state.get("chat_history", [])
        if history:
            last_n = history[-6:]  # Last 3 turns
            history_str = "\n".join(
                f"{m['role'].upper()}: {m['content']}" for m in last_n
            )
            history_str = f"\n\nRecent conversation:\n{history_str}"

        human_content = f"User message: {state['user_message']}{history_str}{existing_summary}"

        response = await invoke_llm_with_retry(
            node_name="intent_detection",
            messages=[
                SystemMessage(content=INTENT_SYSTEM_PROMPT),
                HumanMessage(content=human_content),
            ],
            temperature=0.0,
        )

        raw = response.content.strip()
        # Extract JSON from potential markdown fencing
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)
        intent = result.get("intent", "AMBIGUOUS")

        valid_intents = {"NEW_COMPLAINT", "EDIT_COMPLAINT", "DOCUMENT_UPLOAD", "GENERAL_QUERY", "AMBIGUOUS"}
        if intent not in valid_intents:
            intent = "AMBIGUOUS"

        logger.info("Intent detected: %s | message: %s...", intent, state["user_message"][:60])
        return {"intent": intent}

    except Exception as e:
        logger.warning("LLM intent detection failed (%s). Falling back to heuristic rules.", e)
        text_lower = state.get("user_message", "").lower()
        if any(kw in text_lower for kw in ["log", "complaint", "batch", "reported", "discolored", "defect", "product"]):
            return {"intent": "NEW_COMPLAINT"}
        elif any(kw in text_lower for kw in ["change", "update", "actually", "correct"]):
            return {"intent": "EDIT_COMPLAINT"}
        return {"intent": "NEW_COMPLAINT"}
