"""Pydantic schemas for Complaint CRUD operations."""
from __future__ import annotations
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ComplaintBase(BaseModel):
    source: Optional[str] = None
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    product_strength: Optional[str] = None
    batch_lot_number: Optional[str] = None
    affected_quantity: Optional[str] = None
    manufacturing_date: Optional[date] = None
    expiry_date: Optional[date] = None
    originating_site_block: Optional[str] = None
    impacted_npm: Optional[str] = None
    complaint_category: Optional[str] = None
    complaint_description: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    """Schema for creating a new complaint (manual or AI-populated)."""
    status: Optional[str] = "draft"


class ComplaintUpdate(ComplaintBase):
    """Schema for partially updating a complaint."""
    status: Optional[str] = None


class AIAnalysisOut(BaseModel):
    id: str
    severity: Optional[str] = None
    suggested_next_action: Optional[str] = None
    initial_risk_assessment: Optional[str] = None
    regulatory_reportable: Optional[bool] = None
    root_cause_suggestions: Optional[List] = None
    capa_suggestions: Optional[List] = None
    confidence_scores: Optional[dict] = None
    model_used: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ComplaintOut(ComplaintBase):
    """Full complaint response schema."""
    id: str
    complaint_number: str
    status: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    ai_analyses: Optional[List[AIAnalysisOut]] = []

    model_config = {"from_attributes": True}


class ComplaintListOut(BaseModel):
    """Paginated complaint list response."""
    items: List[ComplaintOut]
    total: int
    page: int
    page_size: int
    total_pages: int
