"""
Duplicate Detection Node — two-stage duplicate check (SQL pre-filter + LLM similarity).
Per IMPLEMENTATION_NOTES.md decision 3:
  Stage 1: SQL pre-filter (product + batch prefix + 90-day window, top 5)
  Stage 2: LLM similarity judgment only if ≥1 SQL candidate found
  Surface warning only if similarity_score >= 0.75

Skipped entirely on EDIT_COMPLAINT intent (no-op passthrough).

Input state fields used: intent, complaint, db_session (injected via node factory)
Output state fields set: duplicate_warning, duplicate_candidates_raw
"""
import json
import logging
from typing import List, Optional, Any

from langchain_core.messages import SystemMessage, HumanMessage

from app.langgraph.state import ComplaintGraphState
from app.utils.llm_client import invoke_llm_with_retry

logger = logging.getLogger(__name__)

DUPLICATE_SIMILARITY_PROMPT = """You are a pharmaceutical QMS specialist evaluating whether two customer complaints describe the same quality event.

Compare the NEW complaint against each EXISTING complaint and return a similarity score (0.0 to 1.0) and brief reasoning.

Consider:
- Same product and batch = strong signal
- Similar defect description = additional signal
- Same time period = additional signal
- Score 0.75+ = likely duplicate, 0.5-0.74 = possible duplicate, <0.5 = different event

Return ONLY valid JSON:
{
  "assessments": [
    {
      "complaint_id": "string",
      "complaint_number": "string",
      "similarity_score": 0.0-1.0,
      "reasoning": "brief explanation"
    }
  ]
}"""


async def duplicate_detection_node(
    state: ComplaintGraphState,
    db_session=None,
) -> dict:
    """
    Two-stage duplicate detection.
    Returns duplicate_warning with found=True only if similarity_score >= 0.75.
    """
    # Skip for edits
    if state.get("intent") == "EDIT_COMPLAINT":
        return {
            "duplicate_warning": {"found": False, "candidates": []},
            "duplicate_candidates_raw": None,
        }

    # Short-circuit on upstream error
    if state.get("status") in ("error", "needs_clarification"):
        return {"duplicate_warning": {"found": False, "candidates": []}}

    try:
        complaint = state.get("complaint") or {}
        product_name = complaint.get("product_name", "")
        batch_lot = complaint.get("batch_lot_number", "")
        description = complaint.get("complaint_description", "")

        if not product_name or not batch_lot:
            # Not enough info to search for duplicates
            return {"duplicate_warning": {"found": False, "candidates": []}}

        # Stage 1: SQL pre-filter (run only if db_session available)
        sql_candidates = []
        if db_session is not None:
            from app.repositories.complaint_repository import ComplaintRepository
            repo = ComplaintRepository(db_session)
            matches = await repo.get_duplicates_candidates(product_name, batch_lot)
            sql_candidates = [
                {
                    "complaint_id": c.id,
                    "complaint_number": c.complaint_number,
                    "description": c.complaint_description or "",
                    "product_name": c.product_name,
                    "batch_lot_number": c.batch_lot_number,
                }
                for c in matches
            ]

        logger.info("Duplicate pre-filter found %d SQL candidates", len(sql_candidates))

        if not sql_candidates:
            return {
                "duplicate_warning": {"found": False, "candidates": []},
                "duplicate_candidates_raw": [],
            }

        # Stage 2: LLM similarity judgment
        human_content = f"""NEW complaint:
Product: {product_name}
Batch: {batch_lot}
Description: {description}

EXISTING complaints to compare against:
{json.dumps(sql_candidates, indent=2)}"""

        response = await invoke_llm_with_retry(
            node_name="duplicate_detection",
            messages=[
                SystemMessage(content=DUPLICATE_SIMILARITY_PROMPT),
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

        result = json.loads(raw)
        assessments = result.get("assessments", [])

        # Filter to >= 0.75 threshold
        high_similarity = [
            a for a in assessments if a.get("similarity_score", 0) >= 0.75
        ]
        high_similarity.sort(key=lambda x: x.get("similarity_score", 0), reverse=True)

        logger.info(
            "Duplicate detection: %d above threshold (0.75) out of %d candidates",
            len(high_similarity), len(assessments)
        )

        return {
            "duplicate_warning": {
                "found": len(high_similarity) > 0,
                "candidates": high_similarity,
            },
            "duplicate_candidates_raw": sql_candidates,
        }

    except Exception as e:
        logger.error("Duplicate detection failed: %s", e)
        return {
            "duplicate_warning": {"found": False, "candidates": []},
            "duplicate_candidates_raw": None,
        }
