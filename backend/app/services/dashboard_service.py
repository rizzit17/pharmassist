"""DashboardService — aggregated KPI stats and chart data for the dashboard."""
from datetime import datetime, timezone, timedelta
from typing import List

from sqlalchemy import select, func, case, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.complaint import Complaint
from app.models.ai_analysis import AIAnalysis
from app.schemas.dashboard import KPIStats, ChartData, SeverityChartPoint, MonthlyChartPoint, CategoryChartPoint


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_stats(self) -> KPIStats:
        """Compute KPI metrics for the dashboard cards."""
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (month_start - timedelta(days=1)).replace(day=1)

        # Total complaints
        total_result = await self.db.execute(select(func.count()).select_from(Complaint))
        total = total_result.scalar() or 0

        # Open complaints (not closed)
        open_result = await self.db.execute(
            select(func.count()).select_from(Complaint).where(
                Complaint.status.notin_(["closed", "draft"])
            )
        )
        open_count = open_result.scalar() or 0

        # Critical complaints (from ai_analysis)
        critical_result = await self.db.execute(
            select(func.count()).select_from(AIAnalysis).where(
                AIAnalysis.severity == "Critical"
            )
        )
        critical_count = critical_result.scalar() or 0

        # This month
        this_month_result = await self.db.execute(
            select(func.count()).select_from(Complaint).where(
                Complaint.created_at >= month_start
            )
        )
        this_month = this_month_result.scalar() or 0

        # Last month
        last_month_result = await self.db.execute(
            select(func.count()).select_from(Complaint).where(
                Complaint.created_at >= last_month_start,
                Complaint.created_at < month_start,
            )
        )
        last_month = last_month_result.scalar() or 0

        return KPIStats(
            total_complaints=total,
            open_complaints=open_count,
            critical_complaints=critical_count,
            avg_resolution_days=None,  # Would need closed_at field; deferred
            complaints_this_month=this_month,
            complaints_last_month=last_month,
        )

    async def get_chart_data(self) -> ChartData:
        """Compute chart datasets for the dashboard visualizations."""
        # Severity distribution
        severity_result = await self.db.execute(
            select(AIAnalysis.severity, func.count().label("count"))
            .group_by(AIAnalysis.severity)
        )
        severity_rows = severity_result.all()
        severity_total = sum(r.count for r in severity_rows) or 1

        severity_data = [
            SeverityChartPoint(
                severity=r.severity or "Unknown",
                count=r.count,
                percentage=round(r.count / severity_total * 100, 1),
            )
            for r in severity_rows if r.severity
        ]

        # Monthly trend (last 6 months)
        six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
        bind_engine = self.db.bind
        dialect_name = bind_engine.dialect.name if bind_engine else "sqlite"
        if dialect_name == "sqlite":
            month_expr = func.strftime("%Y-%m", Complaint.created_at)
        else:
            month_expr = func.to_char(Complaint.created_at, "YYYY-MM")

        monthly_result = await self.db.execute(
            select(
                month_expr.label("month"),
                func.count().label("count"),
            )
            .where(Complaint.created_at >= six_months_ago)
            .group_by(month_expr)
            .order_by(month_expr.asc())
        )
        monthly_rows = monthly_result.all()

        monthly_data = [
            MonthlyChartPoint(
                month=r.month,
                count=r.count,
                critical=0,  # Simplified — join with ai_analysis for real breakdown
                major=0,
                minor=0,
            )
            for r in monthly_rows
        ]

        # Complaints by category
        category_result = await self.db.execute(
            select(Complaint.complaint_category, func.count().label("count"))
            .where(Complaint.complaint_category.isnot(None))
            .group_by(Complaint.complaint_category)
            .order_by(func.count().desc())
            .limit(8)
        )
        category_rows = category_result.all()
        category_data = [
            CategoryChartPoint(
                category=r.complaint_category or "Uncategorized",
                count=r.count,
            )
            for r in category_rows
        ]

        return ChartData(
            severity_distribution=severity_data,
            monthly_trend=monthly_data,
            by_category=category_data,
        )
