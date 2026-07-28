"""
Completeness & Validation Node — checks for missing mandatory fields and validates field formats.

Input state fields used: complaint, status (short-circuits if already error/needs_clarification)
Output state fields set: completeness
"""
import logging
from datetime import date
from typing import Optional

from app.langgraph.state import ComplaintGraphState

logger = logging.getLogger(__name__)

MANDATORY_FIELDS = [
    "customer_name",
    "product_name",
    "batch_lot_number",
    "complaint_category",
    "complaint_description",
]

IMPORTANT_FIELDS = [
    "source",
    "affected_quantity",
    "manufacturing_date",
    "expiry_date",
    "originating_site_block",
]


def _validate_date(date_str: Optional[str], field_name: str) -> Optional[str]:
    """Validate ISO date string. Returns error message or None."""
    if not date_str:
        return None
    try:
        date.fromisoformat(date_str)
        return None
    except ValueError:
        return f"{field_name} is not a valid date (expected YYYY-MM-DD)"


def _validate_complaint(complaint: dict) -> dict:
    """Return completeness assessment for a complaint dict."""
    missing_mandatory = []
    missing_important = []
    validation_errors = []

    for field in MANDATORY_FIELDS:
        val = complaint.get(field)
        if not val or (isinstance(val, str) and not val.strip()):
            missing_mandatory.append(field)

    for field in IMPORTANT_FIELDS:
        val = complaint.get(field)
        if not val or (isinstance(val, str) and not val.strip()):
            missing_important.append(field)

    # Date validation
    mfg_err = _validate_date(complaint.get("manufacturing_date"), "manufacturing_date")
    exp_err = _validate_date(complaint.get("expiry_date"), "expiry_date")
    if mfg_err:
        validation_errors.append(mfg_err)
    if exp_err:
        validation_errors.append(exp_err)

    # Cross-field: expiry must be after manufacturing
    mfg = complaint.get("manufacturing_date")
    exp = complaint.get("expiry_date")
    if mfg and exp:
        try:
            if date.fromisoformat(exp) <= date.fromisoformat(mfg):
                validation_errors.append("expiry_date must be after manufacturing_date")
        except ValueError:
            pass

    is_complete = (len(missing_mandatory) == 0 and len(validation_errors) == 0)
    missing_fields = missing_mandatory + missing_important

    return {
        "is_complete": is_complete,
        "missing_mandatory": missing_mandatory,
        "missing_important": missing_important,
        "missing_fields": missing_fields,
        "validation_errors": validation_errors,
    }


async def completeness_validation_node(state: ComplaintGraphState) -> dict:
    """
    Validate the current complaint state for completeness and field correctness.
    Short-circuits if status is already error or needs_clarification.
    """
    # Short-circuit on upstream error
    if state.get("status") in ("error", "needs_clarification"):
        return {}

    try:
        complaint = state.get("complaint") or {}
        result = _validate_complaint(complaint)

        logger.info(
            "Completeness check: complete=%s, missing_mandatory=%s",
            result["is_complete"], result["missing_mandatory"]
        )

        return {
            "completeness": {
                "is_complete": result["is_complete"],
                "missing_fields": result["missing_fields"],
                "validation_errors": result.get("validation_errors", []),
            }
        }
    except Exception as e:
        logger.error("Completeness validation failed: %s", e)
        return {"completeness": {"is_complete": False, "missing_fields": [], "validation_errors": []}}
