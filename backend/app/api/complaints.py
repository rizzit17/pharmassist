"""Complaints CRUD API router."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.services.complaint_service import ComplaintService
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate, ComplaintOut, ComplaintListOut
from app.schemas.audit import AuditLogOut

router = APIRouter()


@router.get("", response_model=ComplaintListOut)
async def list_complaints(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List complaints with pagination, filtering, and sorting."""
    service = ComplaintService(db)
    return await service.list_complaints(
        page=page, page_size=page_size, status=status,
        search=search, sort_by=sort_by, sort_order=sort_order,
    )


@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    data: ComplaintCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new complaint (from AI Copilot commit or manual entry)."""
    service = ComplaintService(db)
    ai_data = data.risk_assessment or data.ai_analysis
    if not ai_data:
        cat = (data.complaint_category or "").lower()
        desc = (data.complaint_description or "").lower()
        if "contamination" in cat or "contamination" in desc or "sterility" in cat or "toxin" in desc:
            sev = "Critical"
        elif "short fill" in cat or "mislabeling" in cat or "label" in desc or "packing" in desc or "defect" in cat or "fill" in desc:
            sev = "Major"
        else:
            sev = "Minor"
        ai_data = {
            "severity": sev,
            "suggested_next_action": f"Initiate QA triage for {data.complaint_category or 'customer complaint'}",
            "initial_risk_assessment": f"Automatically assessed as {sev} severity based on defect classification.",
            "regulatory_reportable": (sev == "Critical"),
        }
    return await service.create_complaint(data, created_by=getattr(current_user, "id", None), ai_analysis_data=ai_data)


@router.get("/{complaint_id}", response_model=ComplaintOut)
async def get_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single complaint by ID."""
    service = ComplaintService(db)
    result = await service.get_complaint(complaint_id)
    if not result:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    return result


@router.patch("/{complaint_id}", response_model=ComplaintOut)
async def update_complaint(
    complaint_id: str,
    data: ComplaintUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Partially update a complaint."""
    service = ComplaintService(db)
    result = await service.update_complaint(
        complaint_id, data,
        actor="human",
        actor_name=getattr(current_user, "name", None),
    )
    if not result:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    return result


@router.delete("/{complaint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a complaint."""
    service = ComplaintService(db)
    deleted = await service.delete_complaint(complaint_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Complaint not found.")


@router.get("/{complaint_id}/audit-trail", response_model=list[AuditLogOut])
async def get_audit_trail(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get the full audit trail for a complaint."""
    service = ComplaintService(db)
    return await service.get_audit_trail(complaint_id)
