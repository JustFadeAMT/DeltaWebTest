"""Health and status API endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.config import get_settings
from app.schemas import HealthResponse
from app.services.deribit_client import get_deribit_client

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    settings = get_settings()
    # Quick connectivity test
    deribit_ok = False
    try:
        client = get_deribit_client()
        await client.get_index_price("ETH")
        deribit_ok = True
    except Exception:
        pass

    return HealthResponse(
        status="ok",
        environment=settings.environment,
        deribit_connected=deribit_ok,
    )


@router.get("/status")
async def status():
    settings = get_settings()
    return {
        "status": "running",
        "environment": settings.environment,
        "debug": settings.debug,
    }


@router.get("/environment")
async def environment():
    settings = get_settings()
    return {
        "environment": settings.environment,
        "is_mainnet": settings.is_mainnet,
    }
