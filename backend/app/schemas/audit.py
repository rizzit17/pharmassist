"""Audit log Pydantic schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: str
    complaint_id: str
    actor: str
    actor_name: Optional[str] = None
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    action_type: str
    created_at: datetime

    model_config = {"from_attributes": True}
