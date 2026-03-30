"""
PnL snapshot background task.

Periodically polls Deribit for current mark prices and greeks,
calculates PnL for all open positions, and stores snapshots.
"""

from __future__ import annotations

import asyncio
import logging
import traceback
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models import PnlSnapshot, Position, PositionStatus, Side
from app.services.deribit_client import get_deribit_client, reset_deribit_client

logger = logging.getLogger(__name__)

# Track consecutive failures to decide when to reset the client
_consecutive_failures = 0
_MAX_FAILURES_BEFORE_RESET = 3


async def take_pnl_snapshots() -> None:
    """Take PnL snapshots for all open positions.

    For each open position:
    1. Fetch current option ticker (mark price, greeks)
    2. Fetch current perp ticker
    3. Calculate PnL breakdown
    4. Update position current fields
    5. Store snapshot record
    """
    global _consecutive_failures

    async with async_session_factory() as db:
        try:
            result = await db.execute(
                select(Position).where(Position.status == PositionStatus.OPEN)
            )
            positions = result.scalars().all()

            if not positions:
                logger.debug("Snapshot heartbeat: no open positions")
                return

            # Reset client if too many consecutive failures
            if _consecutive_failures >= _MAX_FAILURES_BEFORE_RESET:
                logger.warning(
                    "Resetting Deribit client after %d consecutive failures",
                    _consecutive_failures,
                )
                await reset_deribit_client()
                _consecutive_failures = 0

            client = get_deribit_client()
            snapshot_count = 0
            fail_count = 0

            for pos in positions:
                try:
                    await _snapshot_position(db, client, pos)
                    snapshot_count += 1
                except Exception as e:
                    fail_count += 1
                    logger.error(
                        "Snapshot failed for position #%d (%s): %s\n%s",
                        pos.id, pos.option_instrument_name, e,
                        traceback.format_exc(),
                    )

            await db.commit()

            if fail_count > 0:
                _consecutive_failures += 1
                logger.warning(
                    "Snapshot round: %d/%d succeeded, %d failed (consecutive failures: %d)",
                    snapshot_count, len(positions), fail_count, _consecutive_failures,
                )
            else:
                _consecutive_failures = 0

            if snapshot_count > 0:
                logger.info(
                    "Took %d PnL snapshots for %d positions",
                    snapshot_count, len(positions),
                )

        except Exception as e:
            _consecutive_failures += 1
            logger.error(
                "PnL snapshot task error (consecutive: %d): %s\n%s",
                _consecutive_failures, e, traceback.format_exc(),
            )
            try:
                await db.rollback()
            except Exception:
                pass


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
    # Fetch current option data (with retry)
    option_ticker = await _fetch_ticker_with_retry(client, pos.option_instrument_name)
    if option_ticker is None:
        return

    greeks = option_ticker.get("greeks", {})
    option_mark_coin = option_ticker.get("mark_price", 0.0)
    underlying_price = option_ticker.get("underlying_price", 0.0)
    option_mark_usd = option_mark_coin * underlying_price

    # Fetch current perp data (with retry)
    perp_ticker = await _fetch_ticker_with_retry(client, pos.perp_instrument_name)
    if perp_ticker is None:
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


async def _fetch_ticker_with_retry(
    client, instrument_name: str, max_retries: int = 3
) -> dict | None:
    """Fetch ticker data with retry on failure."""
    for attempt in range(max_retries):
        try:
            return await client.get_ticker(instrument_name)
        except Exception as e:
            if attempt < max_retries - 1:
                wait = 2 ** attempt  # 1s, 2s, 4s
                logger.warning(
                    "Ticker fetch failed for %s (attempt %d/%d), retrying in %ds: %s",
                    instrument_name, attempt + 1, max_retries, wait, e,
                )
                await asyncio.sleep(wait)
            else:
                logger.error(
                    "Ticker fetch failed for %s after %d attempts: %s",
                    instrument_name, max_retries, e,
                )
                return None
    return None

