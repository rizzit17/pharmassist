"""Copilot / AI API router — chat, upload, risk-assessment, summary, history."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.services.copilot_service import CopilotService
from app.utils.file_handler import save_upload, cleanup_upload
from app.schemas.copilot import (
    CopilotChatRequest,
    CopilotResponseEnvelope,
    RiskAssessmentRequest,
    SummaryRequest,
)

router = APIRouter()


@router.post("/chat", response_model=CopilotResponseEnvelope)
async def chat(
    data: CopilotChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Process a natural language chat message through the LangGraph pipeline.
    Handles: new complaint description, correction/edit, or general query.
    """
    service = CopilotService(db)
    return await service.process_chat(
        message=data.message,
        session_id=data.session_id,
        complaint_id=data.complaint_id,
        current_complaint=data.current_complaint,
    )


@router.post("/upload", response_model=CopilotResponseEnvelope)
async def upload_document(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    complaint_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Upload a complaint document (PDF, email, image) for AI extraction.
    File is stored temporarily, processed, then cleaned up.
    """
    upload_info = await save_upload(file)

    try:
        service = CopilotService(db)
        result = await service.process_upload(
            file_path=upload_info["stored_path"],
            file_name=upload_info["original_name"],
            session_id=session_id,
            complaint_id=complaint_id,
        )
        return result
    finally:
        cleanup_upload(upload_info["stored_path"])


@router.get("/sessions/{session_id}/history")
async def get_session_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get the full chat history for a copilot session."""
    service = CopilotService(db)
    return await service.get_session_history(session_id)


@router.post("/risk-assessment", response_model=CopilotResponseEnvelope)
async def run_risk_assessment(
    data: RiskAssessmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Explicitly re-run risk analysis for a complaint (e.g., from the complaint details page).
    """
    from app.langgraph.nodes.risk_analysis import risk_analysis_node
    from app.langgraph.nodes.recommendation import recommendation_node
    import uuid

    state = {
        "session_id": data.session_id,
        "complaint": data.complaint,
        "intent": "NEW_COMPLAINT",
        "requires_risk_rerun": True,
        "status": "processing",
    }

    risk_update = await risk_analysis_node(state)
    state.update(risk_update)
    rec_update = await recommendation_node(state)
    state.update(rec_update)

    return CopilotResponseEnvelope(
        session_id=data.session_id,
        complaint=data.complaint,
        risk_assessment=state.get("risk_assessment"),
        recommendations=state.get("recommendations"),
        assistant_message="Risk assessment refreshed.",
        status="success",
    )


EXECUTIVE_SUMMARY_PROMPT = """You are a Quality Assurance Director at a pharmaceutical manufacturing company.
Write a concise, executive-grade summary (3-4 sentences) for senior QA leadership regarding this customer complaint.

Include:
1. Overview of the defect, complainant, product, and batch number.
2. Risk assessment classification & potential regulatory impact (e.g. MHRA/USFDA notification requirement).
3. Immediate containment actions taken (e.g. batch quarantine) and recommended CAPA investigation steps.

Return ONLY the summary text, no markdown headers or JSON."""


@router.post("/summary")
async def generate_summary(
    data: SummaryRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Generate an executive summary for a complaint."""
    import logging
    logger = logging.getLogger(__name__)

    complaint_data = data.complaint or {}
    if data.complaint_id and not complaint_data:
        from app.services.complaint_service import ComplaintService
        service = ComplaintService(db)
        c = await service.get_complaint(data.complaint_id)
        if c:
            complaint_data = c.model_dump() if hasattr(c, "model_dump") else c.__dict__

    customer = complaint_data.get("customer_name") or "Complainant"
    product = complaint_data.get("product_name") or "Product"
    strength = complaint_data.get("product_strength") or ""
    batch = complaint_data.get("batch_lot_number") or "N/A"
    desc = complaint_data.get("complaint_description") or ""
    category = complaint_data.get("complaint_category") or "Defect"
    site = complaint_data.get("originating_site_block") or "Manufacturing Facility"
    complaint_num = complaint_data.get("complaint_number") or "CC Record"

    try:
        from app.utils.llm_client import invoke_llm_with_retry
        from langchain_core.messages import SystemMessage, HumanMessage

        prompt_content = f"""Record: {complaint_num}
Customer: {customer}
Product: {product} {strength}
Batch/Lot: {batch}
Category: {category}
Facility Block: {site}
Defect Summary: {desc}"""

        response = await invoke_llm_with_retry(
            node_name="summary_generation",
            messages=[
                SystemMessage(content=EXECUTIVE_SUMMARY_PROMPT),
                HumanMessage(content=f"Generate Executive Summary for:\n{prompt_content}"),
            ],
            temperature=0.2,
        )
        summary = response.content.strip()
    except Exception as e:
        logger.warning("LLM Executive Summary generation failed: %s. Using rule-based synthesis.", e)
        summary = (
            f"Executive Quality Summary for {complaint_num}: "
            f"A quality defect regarding {category} was reported by {customer} for {product} {strength} (Batch #{batch}). "
            f"The issue was logged under {site} and has been assigned for immediate QA review, batch quarantine evaluation, "
            f"and root cause investigation pursuant to cGMP quality standards."
        )

    return {"summary": summary, "status": "success"}
