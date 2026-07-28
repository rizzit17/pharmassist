"""Unit tests for LangGraph QMS Nodes using mock state."""
import pytest
from app.langgraph.nodes import (
    intent_detection,
    input_type_detection,
    completeness_validation,
    response_formatter,
)


@pytest.mark.asyncio
async def test_intent_detection_node():
    state = {
        "user_input": "Log a new complaint for Metformin yellowing batch MET-100",
        "file_path": None,
        "chat_history": [],
    }
    result = await intent_detection.intent_detection_node(state)
    assert "intent" in result
    assert result["intent"] in ["NEW_COMPLAINT", "AMBIGUOUS", "EDIT_COMPLAINT", "GENERAL_QUERY"]


@pytest.mark.asyncio
async def test_input_type_detection_node():
    state = {
        "file_path": None,
        "user_input": "Hello world",
    }
    result = await input_type_detection.input_type_detection_node(state)
    assert result.get("input_type") == "text"


@pytest.mark.asyncio
async def test_completeness_validation_node():
    state = {
        "complaint": {
            "complaint_number": "CC-2026-999",
            "customer_name": "Test Customer",
            "product_name": "Metformin 500mg",
            "product_strength": "500mg",
            "batch_lot_number": "BATCH-123",
            "complaint_category": "Discoloration",
            "complaint_description": "Discolored yellow tablets found upon receipt.",
            "manufacturing_date": "2026-01-01",
            "expiry_date": "2027-01-01",
            "affected_quantity": "100 units",
            "originating_site_block": "Block A",
        }
    }
    result = await completeness_validation.completeness_validation_node(state)
    assert "completeness" in result
    assert result["completeness"]["is_complete"] is True


@pytest.mark.asyncio
async def test_response_formatter_node():
    state = {
        "complaint": {"product_name": "Test Product"},
        "updated_fields": ["product_name"],
        "confidence_scores": {"product_name": 0.95},
        "risk_assessment": {"severity": "Major", "suggested_next_action": "Quarantine"},
        "recommendations": {"root_cause_suggestions": ["Calibration"], "capa_suggestions": ["Quarantine"]},
        "completeness": {"is_complete": True, "missing_fields": []},
        "duplicate_warning": None,
        "assistant_message": "Complaint updated successfully.",
        "session_id": "test-session-123",
    }
    result = await response_formatter.response_formatter_node(state)
    assert "assistant_message" in result
    assert "status" in result
    assert result["status"] == "success"
