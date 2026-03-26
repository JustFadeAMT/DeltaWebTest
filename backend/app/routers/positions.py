"""Position management API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import PnlSnapshot, Position, PositionStatus
from app.schemas import (
    CreatePositionRequest,
    PnlSnapshotResponse,
    PositionResponse,
)
from app.services import paper_trading_service, risk_service

router = APIRouter(prefix="/api/positions", tags=["positions"])


@router.get("", response_model=list[PositionResponse])
async def list_positions(
    mode: str | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all positions, optionally filtered by mode and status."""
    query = select(Position).order_by(Position.created_at.desc())

    if mode:
        query = query.where(Position.mode == mode)
    if status:
        query = query.where(Position.status == status)

    result = await db.execute(query)
    positions = result.scalars().all()
    return positions


@router.post("/paper", response_model=PositionResponse)
async def create_paper_position(
    req: CreatePositionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new paper (simulated) delta-neutral position.

    Uses real market data from Deribit for entry prices and greeks.
    """
    # Run risk checks
    risk_result = await risk_service.check_position_risk(db, req, mode="paper")
    if not risk_result.passed:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Risk check failed",
                "errors": risk_result.errors,
                "warnings": risk_result.warnings,
            },
        )

    try:
        position = await paper_trading_service.create_paper_position(db, req)
        return position
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create position: {e}")


@router.post("/live", response_model=PositionResponse)
async def create_live_position(
    req: CreatePositionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a live position (Phase 2 — currently returns error)."""
    raise HTTPException(
        status_code=501,
        detail="Live trading not yet implemented. Coming in Phase 2.",
    )


@router.get("/{position_id}", response_model=PositionResponse)
async def get_position(
    position_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific position by ID."""
    result = await db.execute(
        select(Position).where(Position.id == position_id)
    )
    position = result.scalar_one_or_none()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    return position


@router.post("/{position_id}/close", response_model=PositionResponse)
async def close_position(
    position_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Close a position."""
    try:
        position = await paper_trading_service.close_paper_position(db, position_id)
        return position
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{position_id}")
async def delete_position(
    position_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a position (only paper, only if closed)."""
    result = await db.execute(
        select(Position).where(Position.id == position_id)
    )
    position = result.scalar_one_or_none()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    if position.status == PositionStatus.OPEN:
        raise HTTPException(status_code=400, detail="Cannot delete an open position — close it first")

    await db.delete(position)
    return {"message": f"Position {position_id} deleted"}


@router.get("/{position_id}/history", response_model=list[PnlSnapshotResponse])
async def get_position_history(
    position_id: int,
    limit: int = Query(500, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
):
    """Get PnL snapshot history for a position."""
    result = await db.execute(
        select(PnlSnapshot)
        .where(PnlSnapshot.position_id == position_id)
        .order_by(PnlSnapshot.timestamp.asc())
        .limit(limit)
    )
    snapshots = result.scalars().all()
    return snapshots
