"""
SQLAlchemy ORM models for the Delta-Neutral Trading application.

Tables:
- positions: Delta-neutral position packages (option + hedge)
- pnl_snapshots: Time-series PnL data per position
- orders: Order records (paper & live)
- event_logs: Audit trail for all system events
- risk_limits: Configurable risk parameters
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


# ── Enums ────────────────────────────────────────────────────────────


class TradingMode(str, enum.Enum):
    PAPER = "paper"
    LIVE = "live"


class OptionType(str, enum.Enum):
    CALL = "call"
    PUT = "put"


class Side(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"


class PositionStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    ERROR = "error"


class EventType(str, enum.Enum):
    POSITION_CREATED = "position_created"
    POSITION_CLOSED = "position_closed"
    ORDER_PLACED = "order_placed"
    ORDER_FILLED = "order_filled"
    ORDER_FAILED = "order_failed"
    RISK_WARNING = "risk_warning"
    SYSTEM = "system"


# ── Models ───────────────────────────────────────────────────────────


class Position(Base):
    """A delta-neutral position package: option leg + perp/future hedge."""

    __tablename__ = "positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mode: Mapped[str] = mapped_column(Enum(TradingMode), nullable=False)
    symbol: Mapped[str] = mapped_column(String(10), nullable=False, default="ETH")

    # Option leg
    option_instrument_name: Mapped[str] = mapped_column(String(100), nullable=False)
    option_type: Mapped[str] = mapped_column(Enum(OptionType), nullable=False)
    strike: Mapped[float] = mapped_column(Float, nullable=False)
    expiry: Mapped[str] = mapped_column(String(20), nullable=False)
    option_side: Mapped[str] = mapped_column(Enum(Side), nullable=False, default=Side.BUY)
    option_size: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    # Hedge leg
    perp_instrument_name: Mapped[str] = mapped_column(String(100), nullable=False)
    perp_side: Mapped[str] = mapped_column(Enum(Side), nullable=False)
    perp_size: Mapped[float] = mapped_column(Float, nullable=False)

    # Entry snapshot
    entry_underlying_price: Mapped[float] = mapped_column(Float, nullable=False)
    entry_option_price: Mapped[float] = mapped_column(Float, nullable=False)
    entry_perp_price: Mapped[float] = mapped_column(Float, nullable=False)
    entry_option_delta: Mapped[float] = mapped_column(Float, nullable=False)
    entry_option_iv: Mapped[float] = mapped_column(Float, nullable=True)

    # Current snapshot (updated by background task)
    current_option_price: Mapped[float] = mapped_column(Float, nullable=True)
    current_perp_price: Mapped[float] = mapped_column(Float, nullable=True)
    current_underlying_price: Mapped[float] = mapped_column(Float, nullable=True)
    current_delta: Mapped[float] = mapped_column(Float, nullable=True)
    current_iv: Mapped[float] = mapped_column(Float, nullable=True)
    current_theta: Mapped[float] = mapped_column(Float, nullable=True)

    # PnL
    option_pnl: Mapped[float] = mapped_column(Float, default=0.0)
    perp_pnl: Mapped[float] = mapped_column(Float, default=0.0)
    total_pnl: Mapped[float] = mapped_column(Float, default=0.0)

    # Meta
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum(PositionStatus), nullable=False, default=PositionStatus.OPEN
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    closed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime, nullable=True, onupdate=func.now()
    )


class PnlSnapshot(Base):
    """Time-series PnL data point for a position."""

    __tablename__ = "pnl_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    position_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    underlying_price: Mapped[float] = mapped_column(Float, nullable=False)
    option_mark: Mapped[float] = mapped_column(Float, nullable=False)
    perp_mark: Mapped[float] = mapped_column(Float, nullable=False)

    option_delta: Mapped[float] = mapped_column(Float, nullable=True)
    option_iv: Mapped[float] = mapped_column(Float, nullable=True)
    option_theta: Mapped[float] = mapped_column(Float, nullable=True)

    option_pnl: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    perp_pnl: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_pnl: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)


class Order(Base):
    """Record of an order (paper simulated or live)."""

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    position_id: Mapped[int] = mapped_column(Integer, nullable=True, index=True)
    mode: Mapped[str] = mapped_column(Enum(TradingMode), nullable=False)

    instrument_name: Mapped[str] = mapped_column(String(100), nullable=False)
    side: Mapped[str] = mapped_column(Enum(Side), nullable=False)
    order_type: Mapped[str] = mapped_column(String(20), default="market")
    size: Mapped[float] = mapped_column(Float, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=True)
    fill_price: Mapped[float] = mapped_column(Float, nullable=True)

    exchange_order_id: Mapped[str] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    error_message: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )


class EventLog(Base):
    """Audit trail for all system events."""

    __tablename__ = "event_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(Enum(EventType), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    position_id: Mapped[int] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )


class RiskLimit(Base):
    """Configurable risk parameters."""

    __tablename__ = "risk_limits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=True, onupdate=func.now()
    )
