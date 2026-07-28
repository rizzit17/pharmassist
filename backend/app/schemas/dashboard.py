"""Dashboard Pydantic schemas."""
from typing import List, Optional
from pydantic import BaseModel


class KPIStats(BaseModel):
    total_complaints: int
    open_complaints: int
    critical_complaints: int
    avg_resolution_days: Optional[float] = None
    complaints_this_month: int
    complaints_last_month: int


class SeverityChartPoint(BaseModel):
    severity: str
    count: int
    percentage: float


class MonthlyChartPoint(BaseModel):
    month: str  # "2026-01"
    count: int
    critical: int
    major: int
    minor: int


class CategoryChartPoint(BaseModel):
    category: str
    count: int


class ChartData(BaseModel):
    severity_distribution: List[SeverityChartPoint]
    monthly_trend: List[MonthlyChartPoint]
    by_category: List[CategoryChartPoint]
