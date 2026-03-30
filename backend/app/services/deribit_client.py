"""
Deribit REST API client using httpx.

Wraps the Deribit v2 API with async methods for:
- Public market data (instruments, ticker, order book)
- Authenticated trading (orders, positions, account)

Uses exchange-provided delta/greeks when available.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


class DeribitClient:
    """Async REST client for Deribit API v2.

    Args:
        base_url: Override the base URL. Defaults to config-based URL.
        api_key: Override API key. Defaults to config value.
        api_secret: Override API secret. Defaults to config value.
    """

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        api_secret: str | None = None,
    ) -> None:
        settings = get_settings()
        self._base_url = base_url or settings.deribit_base_url
        self._api_key = api_key or settings.deribit_api_key
        self._api_secret = api_secret or settings.deribit_api_secret
        self._access_token: str | None = None
        self._token_expiry: float = 0
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=30.0,
            headers={"Content-Type": "application/json"},
        )

    async def close(self) -> None:
        await self._client.aclose()

    # ── Authentication ───────────────────────────────────────────────

    async def _ensure_auth(self) -> None:
        """Authenticate if needed."""
        if not self._api_key or not self._api_secret:
            return
        if self._access_token and time.time() < self._token_expiry:
            return
        await self._authenticate()

    async def _authenticate(self) -> None:
        """Get access token via client_credentials."""
        resp = await self._public_request(
            "/public/auth",
            {
                "grant_type": "client_credentials",
                "client_id": self._api_key,
                "client_secret": self._api_secret,
            },
        )
        self._access_token = resp["access_token"]
        self._token_expiry = time.time() + resp.get("expires_in", 900) - 60
        logger.info("Deribit authenticated (token expires in %ds)", resp.get("expires_in", 0))

    # ── Low-level request helpers ────────────────────────────────────

    async def _public_request(self, path: str, params: dict[str, Any] | None = None) -> Any:
        """Make a public (unauthenticated) GET request."""
        try:
            resp = await self._client.get(path, params=params or {})
            resp.raise_for_status()
            data = resp.json()
            if "error" in data:
                raise RuntimeError(f"Deribit API error: {data['error']}")
            return data.get("result", data)
        except httpx.HTTPError as e:
            logger.error("Deribit public request failed: %s %s — %s", path, params, e)
            raise

    async def _private_request(self, path: str, params: dict[str, Any] | None = None) -> Any:
        """Make an authenticated GET request."""
        await self._ensure_auth()
        headers = {}
        if self._access_token:
            headers["Authorization"] = f"Bearer {self._access_token}"

        try:
            resp = await self._client.get(path, params=params or {}, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            if "error" in data:
                raise RuntimeError(f"Deribit API error: {data['error']}")
            return data.get("result", data)
        except httpx.HTTPError as e:
            logger.error("Deribit private request failed: %s — %s", path, e)
            raise

    # ── Public Market Data ───────────────────────────────────────────

    async def get_index_price(self, currency: str = "ETH") -> dict[str, Any]:
        """Get current index price for a currency.

        Returns: {"index_price": float, "estimated_delivery_price": float}
        """
        index_name = f"{currency.lower()}_usd"
        return await self._public_request(
            "/public/get_index_price", {"index_name": index_name}
        )

    async def get_instruments(
        self, currency: str = "ETH", kind: str | None = None, expired: bool = False
    ) -> list[dict[str, Any]]:
        """Get available instruments.

        Args:
            currency: Base currency (ETH, BTC)
            kind: Filter by 'option', 'future', 'spot'
            expired: Include expired instruments
        """
        params: dict[str, Any] = {"currency": currency, "expired": str(expired).lower()}
        if kind:
            params["kind"] = kind
        return await self._public_request("/public/get_instruments", params)

    async def get_ticker(self, instrument_name: str) -> dict[str, Any]:
        """Get ticker data including mark price, greeks, bid/ask.

        The ticker response for options includes:
        - greeks.delta, greeks.gamma, greeks.theta, greeks.vega
        - mark_price, mark_iv
        - best_bid_price, best_ask_price
        - underlying_price
        """
        return await self._public_request(
            "/public/ticker", {"instrument_name": instrument_name}
        )

    async def get_book_summary_by_currency(
        self, currency: str = "ETH", kind: str = "option"
    ) -> list[dict[str, Any]]:
        """Get book summaries for all instruments of a currency/kind."""
        return await self._public_request(
            "/public/get_book_summary_by_currency",
            {"currency": currency, "kind": kind},
        )

    # ── Trading ──────────────────────────────────────────────────────

    async def buy(
        self,
        instrument_name: str,
        amount: float,
        order_type: str = "market",
        price: float | None = None,
        label: str = "",
    ) -> dict[str, Any]:
        """Place a buy order (requires auth)."""
        params: dict[str, Any] = {
            "instrument_name": instrument_name,
            "amount": amount,
            "type": order_type,
        }
        if price is not None:
            params["price"] = price
        if label:
            params["label"] = label
        return await self._private_request("/private/buy", params)

    async def sell(
        self,
        instrument_name: str,
        amount: float,
        order_type: str = "market",
        price: float | None = None,
        label: str = "",
    ) -> dict[str, Any]:
        """Place a sell order (requires auth)."""
        params: dict[str, Any] = {
            "instrument_name": instrument_name,
            "amount": amount,
            "type": order_type,
        }
        if price is not None:
            params["price"] = price
        if label:
            params["label"] = label
        return await self._private_request("/private/sell", params)

    async def get_positions(
        self, currency: str = "ETH", kind: str | None = None
    ) -> list[dict[str, Any]]:
        """Get open positions (requires auth)."""
        params: dict[str, Any] = {"currency": currency}
        if kind:
            params["kind"] = kind
        return await self._private_request("/private/get_positions", params)

    async def get_account_summary(
        self, currency: str = "ETH", extended: bool = True
    ) -> dict[str, Any]:
        """Get account summary (requires auth)."""
        return await self._private_request(
            "/private/get_account_summary",
            {"currency": currency, "extended": str(extended).lower()},
        )


# ── Singleton ────────────────────────────────────────────────────────

_client: DeribitClient | None = None


def get_deribit_client() -> DeribitClient:
    """Get or create the singleton Deribit client."""
    global _client
    if _client is None:
        _client = DeribitClient()
    return _client


async def shutdown_deribit_client() -> None:
    """Gracefully close the client."""
    global _client
    if _client:
        await _client.close()
        _client = None


async def reset_deribit_client() -> None:
    """Close and recreate the Deribit client (for recovery from persistent errors)."""
    global _client
    logger.info("Resetting Deribit client...")
    if _client:
        try:
            await _client.close()
        except Exception:
            pass
        _client = None
    # Will be lazily recreated on next get_deribit_client() call

