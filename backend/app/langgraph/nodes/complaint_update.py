"""
Complaint Update Node — diff-based partial update for EDIT_COMPLAINT path.
Only touches fields explicitly referenced in the user's correction.
Emits requires_risk_rerun based on whether material fields were changed.

Input state fields used: user_message, chat_history, complaint (existing), existing_complaint
Output state fields set: complaint, updated_fields, confidence_scores, requires_risk_rerun
"""
import json
import logging
from typing import Any, Dict, List

from langchain_core.messages import SystemMessage, HumanMessage

from app.langgraph.state import ComplaintGraphState
from app.utils.llm_client import invoke_llm_with_retry

logger = logging.getLogger(__name__)

# Fields whose changes warrant a risk re-analysis run
MATERIAL_FIELDS = {
    "batch_lot_number",
    "affected_quantity",
    "manufacturing_date",
    "expiry_date",
    "complaint_category",
    "complaint_description",
    "impacted_npm",
}

UPDATE_SYSTEM_PROMPT = """You are an expert pharmaceutical QMS AI assisting with complaint management.
The user is correcting or updating a specific field in an existing complaint draft.

Your task:
1. Identify EXACTLY which field(s) the user wants to update based on their message and the current complaint state.
2. Return ONLY the fields that should change — do NOT modify unrelated fields.
3. If genuinely ambiguous (e.g., "actually it's 48" with multiple numeric fields and no clear context), set ambiguous=true and explain which fields are candidates.
4. Handle natural language corrections like:
   - "the batch number is actually BN-2026-987" → update batch_lot_number
   - "change quantity to 200 units" → update affected_quantity
   - "no, the customer is Apex Pharma not Alpha Pharma" → update customer_name
   - "actually it's 48" (ambiguous if both affected_quantity and product_strength are numeric) → ambiguous=true

Fields available:
source, customer_name, product_name, product_strength, batch_lot_number, affected_quantity,
manufacturing_date (YYYY-MM-DD), expiry_date (YYYY-MM-DD), originating_site_block, impacted_npm,
complaint_category, complaint_description

Return ONLY valid JSON:
{
  "updates": {"field_name": "new_value", ...},  // only changed fields
  "confidence_scores": {"field_name": 0.0-1.0, ...},
  "ambiguous": false,
  "ambiguous_candidates": [],  // field names that could be the intended target, if ambiguous=true
  "reasoning": "brief explanation"
}"""


async def complaint_update_node(state: ComplaintGraphState) -> dict:
    """
    Apply a diff-based partial update to the current complaint.
    Returns updated complaint state + list of changed field names.
    Sets requires_risk_rerun if any material field was changed.
    """
    try:
        current_complaint = dict(state.get("complaint") or {})
        user_message = state.get("user_message", "")
        history = state.get("chat_history", [])

        # Build context for the LLM
        history_str = ""
        if history:
            last_n = history[-8:]
            history_str = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in last_n)

        human_content = f"""Current complaint state:
{json.dumps(current_complaint, indent=2, default=str)}

Recent conversation context:
{history_str}

User's correction/update:
{user_message}"""

        response = await invoke_llm_with_retry(
            node_name="complaint_update",
            messages=[
                SystemMessage(content=UPDATE_SYSTEM_PROMPT),
                HumanMessage(content=human_content),
            ],
            temperature=0.0,
        )

        raw = response.content.strip()
        if "```" in raw:
            parts = raw.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    raw = part[4:].strip()
                    break
                elif part.startswith("{"):
                    raw = part
                    break

        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            # Retry
            retry_response = await invoke_llm_with_retry(
                node_name="complaint_update",
                messages=[
                    SystemMessage(content=UPDATE_SYSTEM_PROMPT),
                    HumanMessage(content=human_content),
                    HumanMessage(content="Your response was not valid JSON. Return ONLY the JSON object, no other text."),
                ],
                temperature=0.0,
            )
            result = json.loads(retry_response.content.strip())

        # Handle ambiguous case
        if result.get("ambiguous"):
            candidates = result.get("ambiguous_candidates", [])
            candidates_str = " or ".join(f"`{c}`" for c in candidates) if candidates else "one of the fields"
            return {
                "complaint": current_complaint,
                "updated_fields": [],
                "requires_risk_rerun": False,
                "status": "needs_clarification",
                "assistant_message": (
                    f"I want to make sure I update the right field. Did you mean to change "
                    f"{candidates_str}? Could you clarify which one?"
                ),
            }

        updates = result.get("updates", {})
        confidence_scores = result.get("confidence_scores", {})

        if not updates:
            return {
                "complaint": current_complaint,
                "updated_fields": [],
                "requires_risk_rerun": False,
                "confidence_scores": {},
            }

        # Apply updates
        updated_complaint = {**current_complaint, **updates}
        updated_fields = list(updates.keys())

        # Check if risk re-analysis is needed
        requires_risk_rerun = bool(set(updated_fields) & MATERIAL_FIELDS)

        logger.info(
            "Updated fields: %s | Risk rerun: %s",
            updated_fields, requires_risk_rerun
        )

        return {
            "complaint": updated_complaint,
            "updated_fields": updated_fields,
            "confidence_scores": confidence_scores,
            "requires_risk_rerun": requires_risk_rerun,
        }

    except Exception as e:
        logger.error("Complaint update failed: %s", e)
        return {
            "complaint": state.get("complaint", {}),
            "updated_fields": [],
            "requires_risk_rerun": False,
            "status": "error",
            "assistant_message": "I'm having trouble reaching the AI service - please try again in a moment.",
            "error": str(e),
        }
