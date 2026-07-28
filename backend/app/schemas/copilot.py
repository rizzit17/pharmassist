"""Pydantic schemas for the AI Copilot API — chat, upload, and response envelope."""
from __future__ import annotations
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ── Request schemas ────────────────────────────────────────────────

class CopilotChatRequest(BaseModel):
    """Payload for POST /copilot/chat"""
    session_id: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=10000)
    complaint_id: Optional[str] = None  # If editing an existing committed complaint
    current_complaint: Optional[Dict[str, Any]] = None  # Current draft state from frontend


class RiskAssessmentRequest(BaseModel):
    """Payload for POST /copilot/risk-assessment"""
    session_id: str
    complaint: Dict[str, Any]


class SummaryRequest(BaseModel):
    """Payload for POST /copilot/summary"""
    complaint_id: Optional[str] = None
    complaint: Optional[Dict[str, Any]] = None


# ── Response sub-schemas ───────────────────────────────────────────

class RiskAssessmentEnvelope(BaseModel):
    severity: Optional[str] = None  # Minor | Major | Critical
    suggested_next_action: Optional[str] = None
    initial_risk_assessment: Optional[str] = None
    regulatory_reportable: Optional[bool] = None


class RecommendationsEnvelope(BaseModel):
    root_cause: Optional[List[str]] = []
    capa: Optional[List[str]] = []


class CompletenessEnvelope(BaseModel):
    is_complete: bool = False
    missing_fields: Optional[List[str]] = []


class DuplicateCandidateOut(BaseModel):
    complaint_id: str
    complaint_number: str
    similarity_score: float
    reasoning: Optional[str] = None


class DuplicateWarningEnvelope(BaseModel):
    found: bool = False
    candidates: Optional[List[DuplicateCandidateOut]] = []


# ── Full response envelope ─────────────────────────────────────────

class CopilotResponseEnvelope(BaseModel):
    """
    Authoritative structured JSON contract returned by all /copilot/* endpoints.
    The frontend maps this directly onto Redux state.
    """
    session_id: str
    intent: Optional[str] = None  # NEW_COMPLAINT | EDIT_COMPLAINT | DOCUMENT_UPLOAD | GENERAL_QUERY | AMBIGUOUS
    complaint: Optional[Dict[str, Any]] = None  # Full current complaint object (nulls where unknown)
    updated_fields: Optional[List[str]] = []  # Fields changed in this turn (for green highlight)
    confidence_scores: Optional[Dict[str, float]] = {}
    risk_assessment: Optional[RiskAssessmentEnvelope] = None
    recommendations: Optional[RecommendationsEnvelope] = None
    completeness: Optional[CompletenessEnvelope] = None
    duplicate_warning: Optional[DuplicateWarningEnvelope] = None
    assistant_message: str = ""
    status: str = "success"  # processing | success | needs_clarification | error
    ocr_method: Optional[str] = None  # tesseract | stub | None
