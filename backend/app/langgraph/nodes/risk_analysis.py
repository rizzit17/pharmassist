"""
Risk Analysis Node — severity classification + regulatory reportability flag + risk narrative.
Re-entered only when: intent != EDIT_COMPLAINT OR requires_risk_rerun=True (per IMPLEMENTATION_NOTES decision 2).

Input state fields used: complaint, intent, requires_risk_rerun, status
Output state fields set: risk_assessment
"""
import json
import logging

from langchain_core.messages import SystemMessage, HumanMessage

from app.langgraph.state import ComplaintGraphState
from app.utils.llm_client import invoke_llm_with_retry

logger = logging.getLogger(__name__)

RISK_ANALYSIS_PROMPT = """You are an expert pharmaceutical Quality Assurance specialist with deep knowledge of GMP regulations (ICH Q10, WHO GMP, 21 CFR Part 211, EU GMP Annex).

Analyze the following customer complaint and provide a risk assessment.

Severity Classification Guide:
- CRITICAL: Immediate patient safety risk, potential for serious harm, life-threatening defect, or confirmed contamination. Requires immediate quarantine/recall consideration.
- MAJOR: Significant quality defect that could affect product efficacy or safety but is not immediately life-threatening. Requires urgent investigation.
- MINOR: Minor quality deviation with no direct safety/efficacy impact. Requires investigation and CAPA but not urgent escalation.

Regulatory Reportability Guide:
- True if: Critical severity, confirmed contamination, potential for serious adverse events, or defect affecting a large batch/population.
- False if: Minor cosmetic defects, isolated incidents with no safety implications.

Return ONLY valid JSON:
{
  "severity": "Critical" or "Major" or "Minor",
  "suggested_next_action": "Specific, actionable next step (e.g., 'Initiate batch quarantine and QA investigation, issue replacement shipment, evaluate MHRA Field Safety Notice requirement')",
  "initial_risk_assessment": "2-4 sentence paragraph: root-cause hypothesis, regulatory/patient-safety implications, immediate risk mitigation steps. Written in formal pharmaceutical quality language.",
  "regulatory_reportable": true or false,
  "rationale": "Brief reasoning for severity and reportability classification"
}

IMPORTANT: Always label AI-generated assessments as requiring human QA sign-off. Never present as a definitive compliance determination."""

RISK_ANALYSIS_PROMPT_SUFFIX = """

DISCLAIMER: This is an AI-generated preliminary assessment only. All risk classifications and regulatory reportability determinations must be reviewed and confirmed by qualified QA personnel before action is taken."""


async def risk_analysis_node(state: ComplaintGraphState) -> dict:
    """
    Perform risk analysis on the current complaint.
    Only re-runs on EDIT_COMPLAINT if requires_risk_rerun=True.
    Preserves existing risk_assessment if skipping.
    """
    # Per IMPLEMENTATION_NOTES decision 2: skip re-analysis for non-material edits
    intent = state.get("intent")
    requires_rerun = state.get("requires_risk_rerun", False)

    if intent == "EDIT_COMPLAINT" and not requires_rerun:
        logger.info("Skipping risk re-analysis (non-material edit)")
        return {}  # Preserve existing risk_assessment in state

    # Short-circuit on upstream error
    if state.get("status") in ("error", "needs_clarification"):
        return {}

    try:
        complaint = state.get("complaint") or {}

        complaint_summary = f"""
Product: {complaint.get('product_name', 'Unknown')} ({complaint.get('product_strength', '')})
Batch/Lot: {complaint.get('batch_lot_number', 'Unknown')}
Affected Quantity: {complaint.get('affected_quantity', 'Unknown')}
Manufacturing Date: {complaint.get('manufacturing_date', 'Unknown')}
Expiry Date: {complaint.get('expiry_date', 'Unknown')}
Complaint Category: {complaint.get('complaint_category', 'Unknown')}
Description: {complaint.get('complaint_description', 'Unknown')}
Originating Site: {complaint.get('originating_site_block', 'Unknown')}
Impacted NPM: {complaint.get('impacted_npm', 'None reported')}
Customer: {complaint.get('customer_name', 'Unknown')}
Source: {complaint.get('source', 'Unknown')}
"""

        response = await invoke_llm_with_retry(
            node_name="risk_analysis",
            messages=[
                SystemMessage(content=RISK_ANALYSIS_PROMPT + RISK_ANALYSIS_PROMPT_SUFFIX),
                HumanMessage(content=f"Analyze this pharmaceutical customer complaint:\n{complaint_summary}"),
            ],
            temperature=0.1,
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
            retry_response = await invoke_llm_with_retry(
                node_name="risk_analysis",
                messages=[
                    SystemMessage(content=RISK_ANALYSIS_PROMPT),
                    HumanMessage(content=f"Analyze this pharmaceutical customer complaint:\n{complaint_summary}"),
                    HumanMessage(content="Return ONLY valid JSON, no markdown or explanation text."),
                ],
                temperature=0.0,
            )
            result = json.loads(retry_response.content.strip())

        # Validate severity
        valid_severities = {"Critical", "Major", "Minor"}
        severity = result.get("severity", "Major")
        if severity not in valid_severities:
            severity = "Major"

        risk_assessment = {
            "severity": severity,
            "suggested_next_action": result.get("suggested_next_action", ""),
            "initial_risk_assessment": result.get("initial_risk_assessment", "") + "\n\n⚠️ AI-generated assessment — requires QA personnel review.",
            "regulatory_reportable": bool(result.get("regulatory_reportable", False)),
        }

        logger.info("Risk analysis complete: severity=%s, reportable=%s", severity, risk_assessment["regulatory_reportable"])

        return {"risk_assessment": risk_assessment}

    except Exception as e:
        logger.error("Risk analysis failed: %s", e)
        return {
            "risk_assessment": {
                "severity": "Major",
                "suggested_next_action": "Route to QA Investigation",
                "initial_risk_assessment": "Risk assessment unavailable — AI service error. Please assess manually.",
                "regulatory_reportable": False,
            },
            "status": "error" if not state.get("complaint") else state.get("status", "success"),
            "assistant_message": "I completed the extraction but couldn't finish the risk assessment. Please try again.",
        }
