"""Market data API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.services import market_data_service

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/underlying")
async def get_underlying(symbol: str = Query("ETH")):
    """Get current underlying price from Deribit."""
    return await market_data_service.get_underlying_price(symbol)


@router.get("/expiries")
async def get_expiries(symbol: str = Query("ETH")):
    """Get available option expiry dates."""
    expiries = await market_data_service.get_expiries(symbol)
    return {"symbol": symbol, "expiries": expiries}


@router.get("/options-chain")
async def get_options_chain(
    symbol: str = Query("ETH"),
    expiry: str | None = Query(None),
):
    """Get options chain for a symbol/expiry."""
    chain = await market_data_service.get_options_chain(symbol, expiry)
    return {"symbol": symbol, "expiry": expiry, "instruments": chain}


@router.get("/instrument/{name}")
async def get_instrument(name: str):
    """Get detailed instrument data including exchange greeks."""
    return await market_data_service.get_instrument_detail(name)


@router.get("/suggested-hedge")
async def get_suggested_hedge(
    symbol: str = Query("ETH"),
    option_instrument: str | None = Query(None),
    option_type: str = Query("call"),
    option_size: float = Query(1.0),
    strike: float | None = Query(None),
    expiry: str | None = Query(None),
):
    """Get suggested delta-neutral hedge for an option.

    Returns hedge instrument, side, and size calculated from exchange delta.
    """
    return await market_data_service.get_suggested_hedge(
        symbol=symbol,
        option_instrument=option_instrument,
        option_type=option_type,
        option_size=option_size,
        strike=strike,
        expiry=expiry,
    )
