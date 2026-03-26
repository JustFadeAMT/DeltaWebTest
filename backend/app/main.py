"""
Delta-Neutral Trading — FastAPI Application Entry Point.

Configures CORS, mounts routers, initializes DB, and starts background tasks.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.routers import health, market, portfolio, positions
from app.services.deribit_client import shutdown_deribit_client
from app.tasks.pnl_snapshot_task import take_pnl_snapshots

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Background scheduler
scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    settings = get_settings()

    # Startup
    logger.info("Starting Delta-Neutral Trading API (%s)", settings.environment)
    await init_db()
    logger.info("Database initialized")

    # Start PnL snapshot scheduler
    scheduler.add_job(
        take_pnl_snapshots,
        "interval",
        seconds=settings.snapshot_interval_seconds,
        id="pnl_snapshots",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "PnL snapshot scheduler started (interval: %ds)",
        settings.snapshot_interval_seconds,
    )

    yield

    # Shutdown
    scheduler.shutdown(wait=False)
    await shutdown_deribit_client()
    logger.info("Shutdown complete")


# ── App Factory ──────────────────────────────────────────────────────

settings = get_settings()

app = FastAPI(
    title="Delta-Neutral Trading API",
    description="API for delta-neutral options trading on Deribit",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(health.router)
app.include_router(market.router)
app.include_router(positions.router)
app.include_router(portfolio.router)


@app.get("/")
async def root():
    return {
        "app": "Delta-Neutral Trading",
        "version": "1.0.0",
        "environment": settings.environment,
        "docs": "/docs",
    }
