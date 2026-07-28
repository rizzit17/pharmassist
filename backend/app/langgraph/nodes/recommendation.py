"""
Recommendation Node — generates root cause categories and CAPA steps.

Input state fields used: complaint, risk_assessment, status
Output state fields set: recommendations
"""
import json
import logging

from langchain_core.messages import SystemMessage, HumanMessage

from app.langgraph.state import ComplaintGraphState
from app.utils.llm_client import invoke_llm_with_retry

logger = logging.getLogger(__name__)

RECOMMENDATION_PROMPT = """You are an expert pharmaceutical QMS specialist. Based on the complaint details and risk assessment, provide:

1. Root Cause Categories (3-5 likely root cause hypotheses, brief and specific)
2. CAPA Recommendations (4-6 concrete corrective and preventive action steps)

Root Cause Categories should be specific to pharmaceutical manufacturing, e.g.:
- "Packaging seal integrity failure due to equipment calibration drift"
- "Cold-chain temperature excursion during transport (2-8°C breach)"
- "Raw material quality deviation from approved supplier"
- "Cross-contamination from adjacent production line"
- "Batch documentation error during QC release"

CAPA Steps should be actionable and specific, e.g.:
- "Quarantine remaining units from batch [batch_number] pending investigation"
- "Conduct root cause analysis using Ishikawa diagram within 5 business days"
- "Review batch manufacturing records and environmental monitoring data"
- "Implement enhanced seal integrity testing for all future batches"
- "Issue replacement shipment after QA confirmation of compliant stock"

Return ONLY valid JSON:
{
  "root_cause": ["hypothesis 1", "hypothesis 2", "hypothesis 3"],
  "capa": ["action 1", "action 2", "action 3", "action 4"]
}"""


async def recommendation_node(state: ComplaintGraphState) -> dict:
    """Generate root cause and CAPA recommendations."""
    # Short-circuit on upstream error/clarification
    if state.get("status") in ("error", "needs_clarification"):
        return {}

    try:
        complaint = state.get("complaint") or {}
        risk = state.get("risk_assessment") or {}

        context = f"""
Product: {complaint.get('product_name', 'Unknown')} - {complaint.get('product_strength', '')}
Batch: {complaint.get('batch_lot_number', 'Unknown')}
Complaint Category: {complaint.get('complaint_category', 'Unknown')}
Description: {complaint.get('complaint_description', 'Unknown')}
Severity: {risk.get('severity', 'Unknown')}
Risk Assessment: {risk.get('initial_risk_assessment', '')}
"""

        response = await invoke_llm_with_retry(
            node_name="recommendation",
            messages=[
                SystemMessage(content=RECOMMENDATION_PROMPT),
                HumanMessage(content=f"Provide recommendations for this complaint:\n{context}"),
            ],
            temperature=0.2,
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
            result = {"root_cause": [], "capa": []}

        return {
            "recommendations": {
                "root_cause": result.get("root_cause", []),
                "capa": result.get("capa", []),
            }
        }

    except Exception as e:
        logger.error("Recommendation node failed: %s", e)
        return {
            "recommendations": {
                "root_cause": ["Unable to generate root cause analysis - please assess manually"],
                "capa": ["Route to QA Investigation"],
            }
        }
