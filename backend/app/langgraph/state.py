"""
ComplaintGraphState — the shared typed state threaded through all LangGraph nodes.
Every node receives this dict and returns a partial update (TypedDict pattern).
"""
from __future__ import annotations
from typing import Optional, List, Dict, Any, TypedDict


class ComplaintData(TypedDict, total=False):
    """All complaint fields — nullable where not yet extracted."""
    source: Optional[str]
    customer_name: Optional[str]
    product_name: Optional[str]
    product_strength: Optional[str]
    batch_lot_number: Optional[str]
    affected_quantity: Optional[str]
    manufacturing_date: Optional[str]  # ISO date string
    expiry_date: Optional[str]          # ISO date string
    originating_site_block: Optional[str]
    impacted_npm: Optional[str]
    complaint_category: Optional[str]
    complaint_description: Optional[str]


class RiskAssessmentData(TypedDict, total=False):
    severity: Optional[str]
    suggested_next_action: Optional[str]
    initial_risk_assessment: Optional[str]
    regulatory_reportable: Optional[bool]


class RecommendationsData(TypedDict, total=False):
    root_cause: List[str]
    capa: List[str]


class CompletenessData(TypedDict, total=False):
    is_complete: bool
    missing_fields: List[str]


class DuplicateWarningData(TypedDict, total=False):
    found: bool
    candidates: List[dict]


class ComplaintGraphState(TypedDict, total=False):
    """
    Full state object threaded through all LangGraph nodes.
    Checkpointed per session_id.
    """
    # Session context
    session_id: str
    complaint_id: Optional[str]  # Set when complaint is committed to DB

    # Input
    user_message: str
    chat_history: List[Dict[str, str]]

    # Intent routing
    intent: str  # NEW_COMPLAINT | EDIT_COMPLAINT | DOCUMENT_UPLOAD | GENERAL_QUERY | AMBIGUOUS
    input_type: str  # text | pdf | email | image

    # File upload (document extraction path)
    uploaded_file_path: Optional[str]
    uploaded_file_name: Optional[str]
    extracted_text: Optional[str]
    ocr_method: Optional[str]  # tesseract | stub | None

    # Complaint data
    complaint: ComplaintData
    existing_complaint: Optional[ComplaintData]  # Previous state, for EDIT path diffing

    # AI outputs
    updated_fields: List[str]
    confidence_scores: Dict[str, float]
    risk_assessment: Optional[RiskAssessmentData]
    recommendations: Optional[RecommendationsData]
    completeness: Optional[CompletenessData]
    duplicate_warning: Optional[DuplicateWarningData]

    # Duplicate detection internals
    requires_risk_rerun: bool
    duplicate_candidates_raw: Optional[List[dict]]  # Pre-LLM SQL results

    # Final response
    assistant_message: str
    status: str  # processing | success | needs_clarification | error
    error: Optional[str]
