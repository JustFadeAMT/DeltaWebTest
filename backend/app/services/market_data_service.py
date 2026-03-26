"""
Market data service.

Provides high-level market data functions:
- Current underlying price
- Options chain with greeks
- Available expiries
- Instrument details with exchange delta
- Suggested hedge calculation
"""

from __future__ import annotations

import logging
import math
from datetime import datetime
from typing import Any

from app.services.deribit_client import get_deribit_client

logger = logging.getLogger(__name__)

# In-memory cache for options data (simple TTL cache)
_cache: dict[str, tuple[float, Any]] = {}
CACHE_TTL = 10.0  # seconds


def _get_cached(key: str) -> Any | None:
    """Get cached value if not expired."""
    if key in _cache:
        ts, val = _cache[key]
        import time
        if time.time() - ts < CACHE_TTL:
            return val
    return None


def _set_cached(key: str, val: Any) -> None:
    import time
    _cache[key] = (time.time(), val)


async def get_underlying_price(symbol: str = "ETH") -> dict[str, Any]:
    """Get current underlying index price.

    Returns: {"symbol": str, "price": float, "timestamp": str}
    """
    cached = _get_cached(f"underlying_{symbol}")
    if cached:
        return cached

    client = get_deribit_client()
    data = await client.get_index_price(symbol)
    result = {
        "symbol": symbol,
        "price": data.get("index_price", 0.0),
        "timestamp": datetime.utcnow().isoformat(),
    }
    _set_cached(f"underlying_{symbol}", result)
    return result


async def get_expiries(symbol: str = "ETH") -> list[str]:
    """Get available option expiry dates for a symbol.

    Returns sorted list of unique expiry strings (e.g. "28MAR25").
    """
    cached = _get_cached(f"expiries_{symbol}")
    if cached:
        return cached

    client = get_deribit_client()
    instruments = await client.get_instruments(symbol, kind="option")

    expiries = set()
    for inst in instruments:
        # Deribit instrument name format: ETH-28MAR25-1800-C
        parts = inst["instrument_name"].split("-")
        if len(parts) >= 3:
            expiries.add(parts[1])

    def _parse_expiry(exp_str: str) -> datetime:
        """Parse Deribit expiry string like '28MAR25' into datetime for sorting."""
        try:
            return datetime.strptime(exp_str, "%d%b%y")
        except ValueError:
            return datetime.max  # Push unparseable dates to the end

    result = sorted(list(expiries), key=_parse_expiry)
    _set_cached(f"expiries_{symbol}", result)
    return result


async def get_options_chain(
    symbol: str = "ETH",
    expiry: str | None = None,
) -> list[dict[str, Any]]:
    """Get options chain with greeks from exchange.

    Args:
        symbol: Base currency
        expiry: Filter by expiry (e.g. "28MAR25")

    Returns list of instruments with mark price, greeks, bid/ask.
    """
    client = get_deribit_client()
    instruments = await client.get_instruments(symbol, kind="option")

    # Filter by expiry if specified
    if expiry:
        instruments = [
            i for i in instruments
            if expiry in i["instrument_name"]
        ]

    results = []
    for inst in instruments:
        name = inst["instrument_name"]
        parts = name.split("-")
        if len(parts) < 4:
            continue

        option_type = "call" if parts[-1] == "C" else "put"
        strike = float(parts[-2])

        results.append({
            "instrument_name": name,
            "strike": strike,
            "expiry": parts[1],
            "option_type": option_type,
            "settlement_period": inst.get("settlement_period"),
            "min_trade_amount": inst.get("min_trade_amount"),
            "tick_size": inst.get("tick_size"),
        })

    return sorted(results, key=lambda x: (x["expiry"], x["strike"], x["option_type"]))


async def get_instrument_detail(instrument_name: str) -> dict[str, Any]:
    """Get detailed instrument data including greeks from exchange.

    Uses the ticker API which returns exchange-computed delta, gamma, theta, vega, IV.
    """
    client = get_deribit_client()
    ticker = await client.get_ticker(instrument_name)

    greeks = ticker.get("greeks", {})
    return {
        "instrument_name": instrument_name,
        "mark_price": ticker.get("mark_price", 0.0),
        "mark_iv": ticker.get("mark_iv", 0.0),
        "best_bid_price": ticker.get("best_bid_price"),
        "best_ask_price": ticker.get("best_ask_price"),
        "underlying_price": ticker.get("underlying_price", 0.0),
        "delta": greeks.get("delta", 0.0),
        "gamma": greeks.get("gamma", 0.0),
        "theta": greeks.get("theta", 0.0),
        "vega": greeks.get("vega", 0.0),
        "iv": ticker.get("mark_iv", 0.0),
        "open_interest": ticker.get("open_interest", 0.0),
        "volume": ticker.get("stats", {}).get("volume", 0.0),
        "timestamp": datetime.utcnow().isoformat(),
    }


def find_atm_strike(price: float, available_strikes: list[float]) -> float:
    """Find the at-the-money strike closest to current price."""
    if not available_strikes:
        # Round to nearest 100
        return round(price / 100) * 100

    return min(available_strikes, key=lambda s: abs(s - price))


async def get_suggested_hedge(
    symbol: str = "ETH",
    option_instrument: str | None = None,
    option_type: str = "call",
    option_size: float = 1.0,
    strike: float | None = None,
    expiry: str | None = None,
) -> dict[str, Any]:
    """Calculate suggested delta-neutral hedge for an option position.

    Uses exchange-provided delta (not Black-Scholes calculation).

    Logic:
    - Long Call → hedge = Short Perp (sell perp, size = abs(delta) * option_size)
    - Long Put  → hedge = Long Perp  (buy perp, size = abs(delta) * option_size)

    Returns suggested hedge details.
    """
    client = get_deribit_client()

    # Get underlying price
    underlying = await get_underlying_price(symbol)
    current_price = underlying["price"]

    # If no instrument specified, construct one from components
    if not option_instrument:
        if not expiry:
            expiries = await get_expiries(symbol)
            expiry = expiries[0] if expiries else "28MAR25"
        if not strike:
            strike = find_atm_strike(current_price, [])
        opt_type_letter = "C" if option_type.lower() == "call" else "P"
        option_instrument = f"{symbol}-{expiry}-{int(strike)}-{opt_type_letter}"

    # Get option ticker with exchange greeks
    try:
        ticker = await client.get_ticker(option_instrument)
    except Exception as e:
        logger.warning("Could not get ticker for %s: %s", option_instrument, e)
        # Return basic suggestion without exchange data
        return {
            "option_instrument": option_instrument,
            "option_delta": 0.5,
            "option_price": 0.0,
            "underlying_price": current_price,
            "atm_strike": strike or find_atm_strike(current_price, []),
            "hedge_instrument": f"{symbol}-PERPETUAL",
            "hedge_side": "sell" if option_type.lower() == "call" else "buy",
            "hedge_size": 0.5 * option_size,
            "iv": None,
            "error": str(e),
        }

    greeks = ticker.get("greeks", {})
    option_delta = greeks.get("delta", 0.5)
    option_price_btc = ticker.get("mark_price", 0.0)
    # Convert from BTC/ETH denomination to USD if needed
    underlying_price = ticker.get("underlying_price", current_price)
    option_price_usd = option_price_btc * underlying_price
    iv = ticker.get("mark_iv", 0.0)

    # Determine hedge side and size
    # Long Call → delta positive → sell perp to hedge
    # Long Put  → delta negative → buy perp to hedge
    abs_delta = abs(option_delta)
    hedge_size = abs_delta * option_size

    if option_type.lower() == "call":
        hedge_side = "sell"
    else:
        hedge_side = "buy"

    # Get ATM strike from available instruments
    atm_strike = strike or find_atm_strike(current_price, [])

    return {
        "option_instrument": option_instrument,
        "option_delta": option_delta,
        "option_price": option_price_usd,
        "option_price_coin": option_price_btc,
        "underlying_price": underlying_price,
        "atm_strike": atm_strike,
        "hedge_instrument": f"{symbol}-PERPETUAL",
        "hedge_side": hedge_side,
        "hedge_size": round(hedge_size, 4),
        "iv": iv,
    }
