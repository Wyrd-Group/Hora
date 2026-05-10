"""
Forecasting Router — probabilistic time series forecasts via Chronos-2.

Endpoints:
    POST /api/v1/forecast/{symbol}         — forecast a single symbol
    POST /api/v1/forecast/batch            — forecast multiple symbols
    POST /api/v1/forecast/raw              — forecast from raw data (no DB lookup)
    GET  /api/v1/forecast/models           — list available models
    GET  /api/v1/forecast/status           — pipeline health check

Architecture:
    1. Client sends symbol + horizon + optional model choice
    2. Router pulls OHLCV close prices from market_data pipeline (yfinance cache or DB)
    3. Passes to engines/forecasting.py for Chronos-2 inference (or statistical fallback)
    4. Returns probabilistic forecast with prediction intervals
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from engines import forecasting as forecast_engine

log = logging.getLogger("mss.api.routers.forecasting")

router = APIRouter(prefix="/api/v1/forecast", tags=["forecasting"])


# ── Request / Response models ────────────────────────────────────────────────

class ForecastRequest(BaseModel):
    """Request body for raw data forecasting."""
    values: list[float] = Field(..., min_length=10, description="Historical values (oldest first)")
    symbol: str = Field(default="CUSTOM", description="Label for the series")
    horizon: int = Field(default=30, ge=1, le=365, description="Steps ahead to forecast")
    interval: str = Field(default="1d", description="Bar interval (metadata only)")
    model: str = Field(default="bolt-small", description="Chronos model variant")


class BatchForecastRequest(BaseModel):
    """Request body for multi-symbol forecasting."""
    symbols: list[str] = Field(..., min_length=1, max_length=50, description="Tickers to forecast")
    horizon: int = Field(default=30, ge=1, le=365)
    interval: str = Field(default="1d")
    period: str = Field(default="2y", description="Lookback period for OHLCV context")
    model: str = Field(default="bolt-small")


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/{symbol}")
async def forecast_symbol(
    symbol: str,
    horizon: int = Query(default=30, ge=1, le=365),
    period: str = Query(default="2y", description="Lookback period"),
    interval: str = Query(default="1d", description="Bar interval"),
    model: str = Query(default="bolt-small", description="Model variant"),
):
    """
    Forecast a single symbol using OHLCV data from the market data pipeline.

    Pulls historical close prices via yfinance, runs Chronos-2 inference,
    returns probabilistic forecast with 80% and 95% prediction intervals.
    """
    # Lazy import to avoid circular dependency
    from normalizers_bridge import get_ohlcv_prices

    prices = await get_ohlcv_prices(symbol, period=period, interval=interval)
    if not prices or len(prices) < 10:
        raise HTTPException(
            status_code=404,
            detail=f"Insufficient price data for {symbol} (got {len(prices) if prices else 0}, need >= 10)",
        )

    result = await forecast_engine.forecast(
        close_prices=prices,
        symbol=symbol,
        horizon=horizon,
        interval=interval,
        model_key=model,
    )

    return result.as_dict()


@router.post("/batch")
async def forecast_batch(req: BatchForecastRequest):
    """
    Forecast multiple symbols in one request.
    Returns dict of symbol → forecast result.
    """
    from normalizers_bridge import get_ohlcv_prices

    symbols_data: dict[str, list[float]] = {}
    errors: dict[str, str] = {}

    for symbol in req.symbols:
        prices = await get_ohlcv_prices(symbol, period=req.period, interval=req.interval)
        if prices and len(prices) >= 10:
            symbols_data[symbol] = prices
        else:
            errors[symbol] = f"Insufficient data ({len(prices) if prices else 0} points)"

    if not symbols_data:
        raise HTTPException(status_code=404, detail="No symbols had sufficient data")

    results = await forecast_engine.forecast_multi(
        symbols_data=symbols_data,
        horizon=req.horizon,
        interval=req.interval,
        model_key=req.model,
    )

    return {
        "forecasts": {sym: r.as_dict() for sym, r in results.items()},
        "errors": errors if errors else None,
    }


@router.post("/raw")
async def forecast_raw(req: ForecastRequest):
    """
    Forecast from raw values (no DB/yfinance lookup).
    Useful for testing, custom series, or non-financial time series.
    """
    result = await forecast_engine.forecast(
        close_prices=req.values,
        symbol=req.symbol,
        horizon=req.horizon,
        interval=req.interval,
        model_key=req.model,
    )

    return result.as_dict()


@router.get("/models")
async def list_models():
    """List available forecasting models and their status."""
    status = forecast_engine.get_model_status()
    return {
        "models": [
            {
                "key": key,
                "huggingFaceId": forecast_engine.CHRONOS_MODELS[key],
                "loaded": key in status["loadedModels"],
                "available": status["hasChronos"],
            }
            for key in forecast_engine.CHRONOS_MODELS
        ],
        "fallback": status["fallbackMethod"],
        "gpu": status["gpuAvailable"],
    }


@router.get("/status")
async def forecast_status():
    """Pipeline health check — what's installed and ready."""
    return forecast_engine.get_model_status()
