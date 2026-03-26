"""
Application configuration using Pydantic Settings.

Loads from environment variables / .env file.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Global application settings."""

    # ── App ──────────────────────────────────────────────────────────
    app_name: str = "Delta-Neutral Trading"
    debug: bool = True
    environment: str = "testnet"  # "testnet" or "mainnet"

    # ── Database ─────────────────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./delta_neutral.db"

    # ── Deribit ──────────────────────────────────────────────────────
    deribit_testnet_url: str = "https://test.deribit.com/api/v2"
    deribit_mainnet_url: str = "https://www.deribit.com/api/v2"
    deribit_testnet_ws_url: str = "wss://test.deribit.com/ws/api/v2"
    deribit_mainnet_ws_url: str = "wss://www.deribit.com/ws/api/v2"
    deribit_api_key: str = ""
    deribit_api_secret: str = ""

    # ── PnL Snapshot ─────────────────────────────────────────────────
    snapshot_interval_seconds: int = 30

    # ── Risk Limits ──────────────────────────────────────────────────
    max_paper_positions: int = 20
    max_live_positions: int = 5
    max_order_notional_usd: float = 50000.0
    max_daily_loss_usd: float = 10000.0
    max_hedge_size: float = 100.0

    # ── CORS ─────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    @property
    def deribit_base_url(self) -> str:
        if self.environment == "mainnet":
            return self.deribit_mainnet_url
        return self.deribit_testnet_url

    @property
    def deribit_ws_url(self) -> str:
        if self.environment == "mainnet":
            return self.deribit_mainnet_ws_url
        return self.deribit_testnet_ws_url

    @property
    def is_mainnet(self) -> bool:
        return self.environment == "mainnet"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
