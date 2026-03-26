"""
Pydantic schemas for API request/response validation.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Market Data ──────────────────────────────────────────────────────


class UnderlyingPrice(BaseModel):
    symbol: str
    price: float
    timestamp: datetime


class OptionInstrument(BaseModel):
    instrument_name: str
    strike: float
    expiry: str
    option_type: str  # "call" or "put"
    mark_price: float | None = None
    bid: float | None = None
    ask: float | None = None
    delta: float | None = None
    gamma: float | None = None
    theta: float | None = None
    vega: float | None = None
    iv: float | None = None
    underlying_price: float | None = None


class SuggestedHedge(BaseModel):
    option_instrument: str
    option_delta: float
    option_price: float
    underlying_price: float
    atm_strike: float
    hedge_instrument: str
    hedge_side: str  # "buy" or "sell"
    hedge_size: float
    iv: float | None = None


# ── Positions ────────────────────────────────────────────────────────


class CreatePositionRequest(BaseModel):
    symbol: str = "ETH"
    option_instrument_name: str
    option_type: str  # "call" or "put"
    strike: float
    expiry: str
    option_size: float = 1.0
    perp_side: str  # "buy" or "sell"
    perp_size: float
    notes: str | None = None


class PositionResponse(BaseModel):
    id: int
    mode: str
    symbol: str
    option_instrument_name: str
    option_type: str
    strike: float
    expiry: str
    option_side: str
    option_size: float
    perp_instrument_name: str
    perp_side: str
    perp_size: float
    entry_underlying_price: float
    entry_option_price: float
    entry_perp_price: float
    entry_option_delta: float
    entry_option_iv: float | None = None
    current_option_price: float | None = None
    current_perp_price: float | None = None
    current_underlying_price: float | None = None
    current_delta: float | None = None
    current_iv: float | None = None
    current_theta: float | None = None
    option_pnl: float = 0.0
    perp_pnl: float = 0.0
    total_pnl: float = 0.0
    notes: str | None = None
    status: str
    created_at: datetime
    closed_at: datetime | None = None

    model_config = {"from_attributes": True}


class PnlSnapshotResponse(BaseModel):
    id: int
    position_id: int
    timestamp: datetime
    underlying_price: float
    option_mark: float
    perp_mark: float
    option_delta: float | None = None
    option_iv: float | None = None
    option_theta: float | None = None
    option_pnl: float
    perp_pnl: float
    total_pnl: float

    model_config = {"from_attributes": True}


# ── Portfolio ────────────────────────────────────────────────────────


class PortfolioSummary(BaseModel):
    total_positions: int = 0
    open_positions: int = 0
    total_option_pnl: float = 0.0
    total_perp_pnl: float = 0.0
    total_pnl: float = 0.0
    net_delta: float = 0.0
    environment: str = "testnet"


# ── Events ───────────────────────────────────────────────────────────


class EventLogResponse(BaseModel):
    id: int
    event_type: str
    message: str
    details: str | None = None
    position_id: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Health ───────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str = "ok"
    environment: str
    deribit_connected: bool
    version: str = "1.0.0"
