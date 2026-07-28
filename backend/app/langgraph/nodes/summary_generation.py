"""
Summary Generation Node — synthesizes a formal QMS complaint description (if not already set)
and can generate an executive summary on demand.

Input state fields used: complaint, risk_assessment, status
Output state fields set: complaint (updates complaint_description if missing/empty)
"""
import logging

from langchain_core.messages import SystemMessage, HumanMessage

from app.langgraph.state import ComplaintGraphState
from app.utils.llm_client import invoke_llm_with_retry

logger = logging.getLogger(__name__)

SUMMARY_PROMPT = """You are an expert pharmaceutical QMS regulatory writer. Your task is to write a formal, professional complaint description suitable for inclusion in a regulated Quality Management System record.

Transform the casual/informal complaint information into formal QMS language that:
1. States the nature of the complaint clearly and objectively
2. References batch/lot numbers, product details, and quantities precisely
3. Uses pharmaceutical quality terminology (GMP-aligned language)
4. Avoids speculation about root cause (that's for the investigation)
5. Is 2-4 sentences, clear and professional

Example:
"A formal complaint has been received from [Customer] regarding [Product Name] [Strength], Batch No. [Batch], wherein [X units] were reported to exhibit [specific defect]. The complainant indicates the issue was identified on [date]. This complaint has been classified under the category of [Category] and has been assigned for immediate QA review and investigation pursuant to applicable GMP requirements."

Write ONLY the formal complaint description text (no JSON, no prefixes)."""


async def summary_generation_node(state: ComplaintGraphState) -> dict:
    """
    Generate a formal QMS complaint description if complaint_description is missing or very brief.
    Updates the complaint dict in state with the synthesized description.
    """
    # Short-circuit on upstream error/clarification
    if state.get("status") in ("error", "needs_clarification"):
        return {}

    try:
        complaint = dict(state.get("complaint") or {})
        existing_desc = complaint.get("complaint_description", "")

        # Only regenerate if description is missing or very short (< 50 chars)
        if existing_desc and len(existing_desc.strip()) >= 50:
            logger.info("Summary generation skipped — description already adequate")
            return {}

        context = f"""
Customer: {complaint.get('customer_name', 'Unknown')}
Product: {complaint.get('product_name', 'Unknown')} {complaint.get('product_strength', '')}
Batch/Lot: {complaint.get('batch_lot_number', 'Unknown')}
Affected Quantity: {complaint.get('affected_quantity', 'Unknown')}
Manufacturing Date: {complaint.get('manufacturing_date', 'Unknown')}
Expiry Date: {complaint.get('expiry_date', 'Unknown')}
Complaint Category: {complaint.get('complaint_category', 'Unknown')}
Source: {complaint.get('source', 'Unknown')}
Existing description: {existing_desc or 'None'}
"""

        response = await invoke_llm_with_retry(
            node_name="summary_generation",
            messages=[
                SystemMessage(content=SUMMARY_PROMPT),
                HumanMessage(content=f"Write a formal QMS complaint description for:\n{context}"),
            ],
            temperature=0.2,
        )

        formal_description = response.content.strip()

        # Update complaint with synthesized description
        if formal_description:
            complaint["complaint_description"] = formal_description
            updated_fields = list(state.get("updated_fields") or [])
            if "complaint_description" not in updated_fields:
                updated_fields.append("complaint_description")

            return {
                "complaint": complaint,
                "updated_fields": updated_fields,
            }

        return {}

    except Exception as e:
        logger.error("Summary generation failed: %s", e)
        return {}  # Non-fatal — proceed without description update
