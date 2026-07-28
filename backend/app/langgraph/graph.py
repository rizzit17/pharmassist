"""
LangGraph StateGraph definition for the AIVOA AI Copilot.
Implements genuine multi-node stateful graph with conditional edges and per-session checkpointing.

Graph topology:
START
  → intent_detection
  → input_type_detection
  → [conditional by intent]
       NEW_COMPLAINT / DOCUMENT_UPLOAD → complaint_extraction
       EDIT_COMPLAINT                  → complaint_update
       GENERAL_QUERY / AMBIGUOUS       → response_formatter (early exit)
  → completeness_validation
  → [conditional: error/needs_clarification → response_formatter]
  → duplicate_detection
  → [conditional: skip risk on non-material edit]
  → risk_analysis (or skip)
  → recommendation
  → summary_generation
  → response_formatter
  → END
"""
import logging
from typing import Literal

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from app.langgraph.state import ComplaintGraphState
from app.langgraph.nodes.intent_detection import intent_detection_node
from app.langgraph.nodes.input_type_detection import input_type_detection_node
from app.langgraph.nodes.complaint_extraction import complaint_extraction_node
from app.langgraph.nodes.complaint_update import complaint_update_node
from app.langgraph.nodes.completeness_validation import completeness_validation_node
from app.langgraph.nodes.duplicate_detection import duplicate_detection_node
from app.langgraph.nodes.risk_analysis import risk_analysis_node
from app.langgraph.nodes.recommendation import recommendation_node
from app.langgraph.nodes.summary_generation import summary_generation_node
from app.langgraph.nodes.response_formatter import response_formatter_node

logger = logging.getLogger(__name__)


# ── Routing functions ─────────────────────────────────────────────

def route_after_input_type(state: ComplaintGraphState) -> str:
    """Route based on intent after input type detection."""
    intent = state.get("intent", "AMBIGUOUS")
    if intent in ("NEW_COMPLAINT", "DOCUMENT_UPLOAD"):
        return "complaint_extraction"
    elif intent == "EDIT_COMPLAINT":
        return "complaint_update"
    else:
        # GENERAL_QUERY or AMBIGUOUS — skip to response_formatter
        return "response_formatter"


def route_after_extraction_or_update(state: ComplaintGraphState) -> str:
    """After extraction/update, short-circuit on error or needs_clarification."""
    status = state.get("status", "success")
    if status in ("error", "needs_clarification"):
        return "response_formatter"
    return "completeness_validation"


def route_after_completeness(state: ComplaintGraphState) -> str:
    """After completeness check, short-circuit on error or clarification."""
    status = state.get("status", "success")
    if status in ("error", "needs_clarification"):
        return "response_formatter"
    return "duplicate_detection"


def route_after_duplicate(state: ComplaintGraphState) -> str:
    """After duplicate detection: decide whether to run risk analysis."""
    status = state.get("status", "success")
    if status in ("error", "needs_clarification"):
        return "response_formatter"

    intent = state.get("intent", "")
    requires_rerun = state.get("requires_risk_rerun", False)

    # Per IMPLEMENTATION_NOTES decision 2: skip risk on non-material EDIT_COMPLAINT
    if intent == "EDIT_COMPLAINT" and not requires_rerun:
        logger.info("Routing: skipping risk_analysis (non-material edit)")
        return "recommendation"  # Skip risk but still run recommendation/summary

    return "risk_analysis"


def route_after_risk(state: ComplaintGraphState) -> str:
    """After risk analysis, proceed to recommendations."""
    status = state.get("status", "success")
    if status == "error":
        return "response_formatter"
    return "recommendation"


# ── Graph builder ─────────────────────────────────────────────────

def build_graph(db_session=None) -> StateGraph:
    """
    Build and compile the LangGraph StateGraph.
    db_session is injected for the duplicate_detection node (DB access).
    Returns a compiled graph with MemorySaver checkpointer.
    """

    # Wrap duplicate_detection to inject db_session
    async def _duplicate_detection_with_db(state: ComplaintGraphState) -> dict:
        return await duplicate_detection_node(state, db_session=db_session)

    graph = StateGraph(ComplaintGraphState)

    # Register nodes
    graph.add_node("intent_detection", intent_detection_node)
    graph.add_node("input_type_detection", input_type_detection_node)
    graph.add_node("complaint_extraction", complaint_extraction_node)
    graph.add_node("complaint_update", complaint_update_node)
    graph.add_node("completeness_validation", completeness_validation_node)
    graph.add_node("duplicate_detection", _duplicate_detection_with_db)
    graph.add_node("risk_analysis", risk_analysis_node)
    graph.add_node("recommendation", recommendation_node)
    graph.add_node("summary_generation", summary_generation_node)
    graph.add_node("response_formatter", response_formatter_node)

    # Entry edge
    graph.add_edge(START, "intent_detection")
    graph.add_edge("intent_detection", "input_type_detection")

    # Conditional routing after input type detection
    graph.add_conditional_edges(
        "input_type_detection",
        route_after_input_type,
        {
            "complaint_extraction": "complaint_extraction",
            "complaint_update": "complaint_update",
            "response_formatter": "response_formatter",
        },
    )

    # Short-circuit after extraction/update on error
    graph.add_conditional_edges(
        "complaint_extraction",
        route_after_extraction_or_update,
        {
            "completeness_validation": "completeness_validation",
            "response_formatter": "response_formatter",
        },
    )
    graph.add_conditional_edges(
        "complaint_update",
        route_after_extraction_or_update,
        {
            "completeness_validation": "completeness_validation",
            "response_formatter": "response_formatter",
        },
    )

    # Short-circuit after completeness on error
    graph.add_conditional_edges(
        "completeness_validation",
        route_after_completeness,
        {
            "duplicate_detection": "duplicate_detection",
            "response_formatter": "response_formatter",
        },
    )

    # Conditional risk analysis routing
    graph.add_conditional_edges(
        "duplicate_detection",
        route_after_duplicate,
        {
            "risk_analysis": "risk_analysis",
            "recommendation": "recommendation",
            "response_formatter": "response_formatter",
        },
    )

    # After risk analysis
    graph.add_conditional_edges(
        "risk_analysis",
        route_after_risk,
        {
            "recommendation": "recommendation",
            "response_formatter": "response_formatter",
        },
    )

    # Linear tail: recommendation → summary → formatter → END
    graph.add_edge("recommendation", "summary_generation")
    graph.add_edge("summary_generation", "response_formatter")
    graph.add_edge("response_formatter", END)

    # Compile with MemorySaver checkpointer (in-memory for dev)
    checkpointer = MemorySaver()
    compiled = graph.compile(checkpointer=checkpointer)

    logger.info("LangGraph compiled successfully")
    return compiled


# Module-level singleton (re-built per request with db_session injection)
# The actual graph instance is created per request in CopilotService
