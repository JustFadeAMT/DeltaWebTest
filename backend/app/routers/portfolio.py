"""Portfolio and event API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import get_settings
from app.models import EventLog, Position, PositionStatus
from app.schemas import EventLogResponse, PortfolioSummary

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("/summary", response_model=PortfolioSummary)
async def get_portfolio_summary(
    db: AsyncSession = Depends(get_db),
):
    """Get aggregate portfolio summary across all open positions."""
    settings = get_settings()

    # Count positions
    total_result = await db.execute(select(func.count(Position.id)))
    total_count = total_result.scalar() or 0

    open_result = await db.execute(
        select(func.count(Position.id)).where(Position.status == PositionStatus.OPEN)
    )
    open_count = open_result.scalar() or 0

    # Aggregate PnL for open positions
    open_positions = await db.execute(
        select(Position).where(Position.status == PositionStatus.OPEN)
    )
    positions = open_positions.scalars().all()

    total_option_pnl = sum(p.option_pnl or 0 for p in positions)
    total_perp_pnl = sum(p.perp_pnl or 0 for p in positions)
    total_pnl = sum(p.total_pnl or 0 for p in positions)

    # Calculate net delta
    net_delta = 0.0
    for p in positions:
        option_delta_contrib = (p.current_delta or 0) * p.option_size
        perp_delta_contrib = p.perp_size
        if p.perp_side == "sell":
            perp_delta_contrib = -perp_delta_contrib
        net_delta += option_delta_contrib + perp_delta_contrib

    return PortfolioSummary(
        total_positions=total_count,
        open_positions=open_count,
        total_option_pnl=round(total_option_pnl, 4),
        total_perp_pnl=round(total_perp_pnl, 4),
        total_pnl=round(total_pnl, 4),
        net_delta=round(net_delta, 6),
        environment=settings.environment,
    )


@router.get("/events", response_model=list[EventLogResponse])
async def get_events(
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Get recent events / audit log."""
    result = await db.execute(
        select(EventLog)
        .order_by(EventLog.created_at.desc())
        .limit(limit)
    )
    events = result.scalars().all()
    return events
