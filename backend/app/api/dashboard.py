"""Dashboard API router."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import KPIStats, ChartData

router = APIRouter()


@router.get("/stats", response_model=KPIStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """KPI stats for dashboard cards."""
    service = DashboardService(db)
    return await service.get_stats()


@router.get("/charts", response_model=ChartData)
async def get_charts(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Chart datasets for dashboard visualizations."""
    service = DashboardService(db)
    return await service.get_chart_data()
