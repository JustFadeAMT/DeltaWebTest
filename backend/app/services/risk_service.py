"""
Risk management service.

Validates trades against risk limits before execution.
"""

from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Position, PositionStatus, TradingMode
from app.schemas import CreatePositionRequest

logger = logging.getLogger(__name__)


class RiskCheckResult:
    """Result of a risk check."""

    def __init__(self, passed: bool, warnings: list[str] = None, errors: list[str] = None):
        self.passed = passed
        self.warnings = warnings or []
        self.errors = errors or []


async def check_position_risk(
    db: AsyncSession,
    req: CreatePositionRequest,
    mode: str = "paper",
    option_delta: float | None = None,
    option_price: float | None = None,
    underlying_price: float | None = None,
) -> RiskCheckResult:
    """Run risk checks before creating a position.

    Checks:
    1. Max number of open positions for the mode
    2. Max order notional
    3. Max hedge size
    4. Delta/greeks availability
    5. Hedge size reasonableness

    Args:
        db: Database session
        req: Position creation request
        mode: "paper" or "live"
        option_delta: Exchange delta (None if unavailable)
        option_price: Current option price
        underlying_price: Current underlying price

    Returns:
        RiskCheckResult with pass/fail and any warnings/errors
    """
    settings = get_settings()
    warnings: list[str] = []
    errors: list[str] = []

    # 1. Check max positions
    trading_mode = TradingMode.PAPER if mode == "paper" else TradingMode.LIVE
    max_positions = settings.max_paper_positions if mode == "paper" else settings.max_live_positions

    result = await db.execute(
        select(func.count(Position.id)).where(
            Position.mode == trading_mode,
            Position.status == PositionStatus.OPEN,
        )
    )
    open_count = result.scalar() or 0

    if open_count >= max_positions:
        errors.append(f"Max {mode} positions reached ({max_positions})")

    # 2. Check order notional
    if underlying_price and req.perp_size:
        notional = req.perp_size * underlying_price
        if notional > settings.max_order_notional_usd:
            errors.append(
                f"Order notional ${notional:.0f} exceeds max ${settings.max_order_notional_usd:.0f}"
            )

    # 3. Check hedge size
    if req.perp_size > settings.max_hedge_size:
        errors.append(f"Hedge size {req.perp_size} exceeds max {settings.max_hedge_size}")

    # 4. Check delta availability
    if option_delta is None or option_delta == 0:
        warnings.append("Exchange delta unavailable or zero — hedge may be inaccurate")

    # 5. Hedge size reasonableness
    if option_delta is not None and req.option_size > 0:
        expected_hedge = abs(option_delta) * req.option_size
        if req.perp_size > 0:
            ratio = req.perp_size / expected_hedge if expected_hedge > 0 else float("inf")
            if ratio > 2.0 or ratio < 0.5:
                warnings.append(
                    f"Hedge size {req.perp_size:.4f} differs significantly from "
                    f"expected {expected_hedge:.4f} (ratio: {ratio:.2f})"
                )

    # 6. Live mode extra checks
    if mode == "live":
        if settings.is_mainnet:
            warnings.append("⚠️ MAINNET trading — real funds at risk")
        if not settings.deribit_api_key:
            errors.append("Deribit API key not configured")

    passed = len(errors) == 0
    if not passed:
        logger.warning("Risk check FAILED: %s", errors)
    elif warnings:
        logger.info("Risk check passed with warnings: %s", warnings)

    return RiskCheckResult(passed=passed, warnings=warnings, errors=errors)
