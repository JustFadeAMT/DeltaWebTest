"""
PnL snapshot background task.

Periodically polls Deribit for current mark prices and greeks,
calculates PnL for all open positions, and stores snapshots.
"""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models import PnlSnapshot, Position, PositionStatus, Side
from app.services.deribit_client import get_deribit_client

logger = logging.getLogger(__name__)


async def take_pnl_snapshots() -> None:
    """Take PnL snapshots for all open positions.

    For each open position:
    1. Fetch current option ticker (mark price, greeks)
    2. Fetch current perp ticker
    3. Calculate PnL breakdown
    4. Update position current fields
    5. Store snapshot record
    """
    async with async_session_factory() as db:
        try:
            result = await db.execute(
                select(Position).where(Position.status == PositionStatus.OPEN)
            )
            positions = result.scalars().all()

            if not positions:
                return

            client = get_deribit_client()
            snapshot_count = 0

            for pos in positions:
                try:
                    await _snapshot_position(db, client, pos)
                    snapshot_count += 1
                except Exception as e:
                    logger.error(
                        "Snapshot failed for position #%d (%s): %s",
                        pos.id, pos.option_instrument_name, e,
                    )

            await db.commit()
            if snapshot_count > 0:
                logger.info("Took %d PnL snapshots", snapshot_count)

        except Exception as e:
            logger.error("PnL snapshot task error: %s", e)
            await db.rollback()


async def _snapshot_position(
    db: AsyncSession, client, pos: Position
) -> None:
    """Take a single position snapshot and update PnL.

    PnL calculation:
    - Option PnL = (current_price - entry_price) * option_size * direction
      (direction: +1 for long, -1 for short)
    - Perp PnL = (current_price - entry_price) * perp_size * direction
      (direction: +1 for long (buy), -1 for short (sell))
    - For options quoted in coin terms on Deribit, we multiply by underlying
    """
    # Fetch current option data
    try:
        option_ticker = await client.get_ticker(pos.option_instrument_name)
    except Exception as e:
        logger.warning("Cannot get ticker for %s: %s", pos.option_instrument_name, e)
        return

    greeks = option_ticker.get("greeks", {})
    option_mark_coin = option_ticker.get("mark_price", 0.0)
    underlying_price = option_ticker.get("underlying_price", 0.0)
    option_mark_usd = option_mark_coin * underlying_price

    # Fetch current perp data
    try:
        perp_ticker = await client.get_ticker(pos.perp_instrument_name)
    except Exception as e:
        logger.warning("Cannot get ticker for %s: %s", pos.perp_instrument_name, e)
        return

    perp_mark = perp_ticker.get("mark_price", 0.0)

    # Calculate PnL
    # Option leg: always long (buy) in our delta-neutral setup
    option_pnl = (option_mark_usd - pos.entry_option_price) * pos.option_size

    # Perp leg: depends on side
    if pos.perp_side == Side.BUY or pos.perp_side == "buy":
        perp_pnl = (perp_mark - pos.entry_perp_price) * pos.perp_size
    else:
        perp_pnl = (pos.entry_perp_price - perp_mark) * pos.perp_size

    total_pnl = option_pnl + perp_pnl

    # Update position current values
    pos.current_option_price = option_mark_usd
    pos.current_perp_price = perp_mark
    pos.current_underlying_price = underlying_price
    pos.current_delta = greeks.get("delta")
    pos.current_iv = option_ticker.get("mark_iv")
    pos.current_theta = greeks.get("theta")
    pos.option_pnl = round(option_pnl, 4)
    pos.perp_pnl = round(perp_pnl, 4)
    pos.total_pnl = round(total_pnl, 4)
    pos.last_updated = datetime.utcnow()

    # Store snapshot
    snapshot = PnlSnapshot(
        position_id=pos.id,
        underlying_price=underlying_price,
        option_mark=option_mark_usd,
        perp_mark=perp_mark,
        option_delta=greeks.get("delta"),
        option_iv=option_ticker.get("mark_iv"),
        option_theta=greeks.get("theta"),
        option_pnl=round(option_pnl, 4),
        perp_pnl=round(perp_pnl, 4),
        total_pnl=round(total_pnl, 4),
    )
    db.add(snapshot)
