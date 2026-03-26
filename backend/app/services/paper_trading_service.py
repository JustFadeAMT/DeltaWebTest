"""
Paper Trading service.

Simulates order execution using real market data from Deribit.
Creates positions with simulated fills at mark/mid prices.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    EventLog,
    EventType,
    Order,
    Position,
    PositionStatus,
    Side,
    TradingMode,
)
from app.schemas import CreatePositionRequest
from app.services.deribit_client import get_deribit_client

logger = logging.getLogger(__name__)


async def create_paper_position(
    db: AsyncSession,
    req: CreatePositionRequest,
) -> Position:
    """Create a simulated delta-neutral position using real market data.

    Steps:
    1. Fetch current option ticker (mark price, greeks) from Deribit
    2. Fetch current perp ticker for hedge
    3. Create position record with entry prices
    4. Log the event

    Args:
        db: Async database session
        req: Position creation request

    Returns:
        The created Position model instance
    """
    client = get_deribit_client()

    # 1. Get option market data from exchange
    try:
        option_ticker = await client.get_ticker(req.option_instrument_name)
    except Exception as e:
        logger.error("Failed to get option ticker for %s: %s", req.option_instrument_name, e)
        raise ValueError(f"Could not fetch option data: {e}")

    greeks = option_ticker.get("greeks", {})
    option_mark = option_ticker.get("mark_price", 0.0)
    underlying_price = option_ticker.get("underlying_price", 0.0)
    option_delta = greeks.get("delta", 0.0)
    option_iv = option_ticker.get("mark_iv", 0.0)

    # Convert option price to USD (Deribit quotes options in coin terms)
    option_price_usd = option_mark * underlying_price

    # 2. Get perp market data
    perp_instrument = f"{req.symbol}-PERPETUAL"
    try:
        perp_ticker = await client.get_ticker(perp_instrument)
    except Exception as e:
        logger.error("Failed to get perp ticker for %s: %s", perp_instrument, e)
        raise ValueError(f"Could not fetch perp data: {e}")

    perp_mark = perp_ticker.get("mark_price", 0.0)

    # 3. Create position record
    position = Position(
        mode=TradingMode.PAPER,
        symbol=req.symbol,
        option_instrument_name=req.option_instrument_name,
        option_type=req.option_type,
        strike=req.strike,
        expiry=req.expiry,
        option_side=Side.BUY,  # Always long option in delta-neutral
        option_size=req.option_size,
        perp_instrument_name=perp_instrument,
        perp_side=req.perp_side,
        perp_size=req.perp_size,
        entry_underlying_price=underlying_price,
        entry_option_price=option_price_usd,
        entry_perp_price=perp_mark,
        entry_option_delta=option_delta,
        entry_option_iv=option_iv,
        current_option_price=option_price_usd,
        current_perp_price=perp_mark,
        current_underlying_price=underlying_price,
        current_delta=option_delta,
        current_iv=option_iv,
        current_theta=greeks.get("theta", 0.0),
        option_pnl=0.0,
        perp_pnl=0.0,
        total_pnl=0.0,
        notes=req.notes,
        status=PositionStatus.OPEN,
    )
    db.add(position)
    await db.flush()

    # 4. Create simulated order records
    option_order = Order(
        position_id=position.id,
        mode=TradingMode.PAPER,
        instrument_name=req.option_instrument_name,
        side=Side.BUY,
        order_type="market",
        size=req.option_size,
        price=option_price_usd,
        fill_price=option_price_usd,
        status="filled",
    )
    perp_order = Order(
        position_id=position.id,
        mode=TradingMode.PAPER,
        instrument_name=perp_instrument,
        side=req.perp_side,
        order_type="market",
        size=req.perp_size,
        price=perp_mark,
        fill_price=perp_mark,
        status="filled",
    )
    db.add(option_order)
    db.add(perp_order)

    # 5. Log event
    event = EventLog(
        event_type=EventType.POSITION_CREATED,
        message=f"Paper position created: {req.option_instrument_name}",
        details=json.dumps({
            "option_instrument": req.option_instrument_name,
            "option_price": option_price_usd,
            "perp_instrument": perp_instrument,
            "perp_price": perp_mark,
            "delta": option_delta,
            "iv": option_iv,
        }),
        position_id=position.id,
    )
    db.add(event)
    await db.flush()

    logger.info(
        "Paper position #%d created: %s @ $%.2f | %s %s %.4f @ $%.2f",
        position.id,
        req.option_instrument_name,
        option_price_usd,
        perp_instrument,
        req.perp_side,
        req.perp_size,
        perp_mark,
    )
    return position


async def close_paper_position(db: AsyncSession, position_id: int) -> Position:
    """Close a paper position by marking it as closed.

    Args:
        db: Async database session
        position_id: ID of the position to close

    Returns:
        The updated Position model
    """
    result = await db.execute(
        select(Position).where(Position.id == position_id)
    )
    position = result.scalar_one_or_none()
    if not position:
        raise ValueError(f"Position {position_id} not found")
    if position.status != PositionStatus.OPEN:
        raise ValueError(f"Position {position_id} is not open")

    position.status = PositionStatus.CLOSED
    position.closed_at = datetime.utcnow()

    event = EventLog(
        event_type=EventType.POSITION_CLOSED,
        message=f"Paper position closed: {position.option_instrument_name}",
        details=json.dumps({
            "final_option_pnl": position.option_pnl,
            "final_perp_pnl": position.perp_pnl,
            "final_total_pnl": position.total_pnl,
        }),
        position_id=position.id,
    )
    db.add(event)

    logger.info("Paper position #%d closed. Total PnL: $%.2f", position_id, position.total_pnl)
    return position
