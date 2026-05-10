"""
GET  /api/v1/market/ohlcv/{symbol}   — OHLCV bars for a symbol
GET  /api/v1/market/returns/{symbol}  — computed returns and features
POST /api/v1/market/ingest            — trigger OHLCV ingestion for universe
GET  /api/v1/market/universe          — list available symbols
GET  /api/v1/market/status            — ingestion pipeline status
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

# Add ingestor to path so normalizers are importable
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "ingestor"))

from normalizers.yfinance_ohlcv import (
    fetch_ohlcv_async,
    fetch_batch,
    compute_returns,
    UNIVERSE,
    EQUITIES,
    ETFS,
    CRYPTO,
    FOREX,
    _HAS_YF,
)

log = logging.getLogger("mss.market_data")

router = APIRouter(prefix="/api/v1/market", tags=["market-data"])

# ── In-memory cache for quick re-queries ──────────────────────────────────────
_ohlcv_cache: dict[str, list] = {}


@router.get("/ohlcv/{symbol}")
async def get_ohlcv(
    symbol: str,
    period: str = Query("1y", description="1d,5d,1mo,3mo,6mo,1y,2y,5y,max"),
    interval: str = Query("1d", description="1m,5m,15m,1h,1d,1wk,1mo"),
) -> dict:
    """Fetch OHLCV bars for a single symbol."""
    if not _HAS_YF:
        raise HTTPException(503, "yfinance not installed — data pipeline unavailable")

    cache_key = f"{symbol}:{period}:{interval}"
    if cache_key in _ohlcv_cache:
        bars_dicts = _ohlcv_cache[cache_key]
        return {"symbol": symbol, "bars": bars_dicts, "count": len(bars_dicts), "cached": True}

    bars = await fetch_ohlcv_async(symbol.upper(), period=period, interval=interval)
    if not bars:
        raise HTTPException(404, f"No data found for {symbol}")

    bars_dicts = [b.as_dict() for b in bars]
    _ohlcv_cache[cache_key] = bars_dicts

    return {"symbol": symbol, "bars": bars_dicts, "count": len(bars_dicts), "cached": False}


@router.get("/returns/{symbol}")
async def get_returns(
    symbol: str,
    period: str = Query("1y", description="Lookback period"),
) -> dict:
    """Compute log returns and features for a symbol."""
    if not _HAS_YF:
        raise HTTPException(503, "yfinance not installed")

    bars = await fetch_ohlcv_async(symbol.upper(), period=period, interval="1d")
    if len(bars) < 2:
        raise HTTPException(404, f"Insufficient data for {symbol}")

    features = compute_returns(bars)
    return {
        "symbol": symbol,
        "features": features,
        "count": len(features),
        "firstDate": features[0]["timestamp"] if features else None,
        "lastDate": features[-1]["timestamp"] if features else None,
    }


@router.post("/ingest")
async def trigger_ingestion(
    symbols: Optional[list[str]] = None,
    period: str = Query("2y", description="Lookback period for ingestion"),
) -> dict:
    """
    Trigger OHLCV ingestion for the full universe or specific symbols.
    Fetches from Yahoo Finance and caches in memory.
    For persistent storage, connect to PostgreSQL ohlcv table.
    """
    if not _HAS_YF:
        raise HTTPException(503, "yfinance not installed")

    target_symbols = symbols if symbols else UNIVERSE
    results = await fetch_batch(target_symbols, period=period, max_concurrent=3)

    # Cache results
    success = 0
    total_bars = 0
    for sym, bars in results.items():
        if bars:
            cache_key = f"{sym}:{period}:1d"
            _ohlcv_cache[cache_key] = [b.as_dict() for b in bars]
            success += 1
            total_bars += len(bars)

    return {
        "requested": len(target_symbols),
        "success": success,
        "failed": len(target_symbols) - success,
        "totalBars": total_bars,
        "symbols": list(results.keys()),
    }


@router.get("/universe")
async def get_universe() -> dict:
    """List all symbols in the ingestion universe."""
    return {
        "equities": EQUITIES,
        "etfs": ETFS,
        "crypto": CRYPTO,
        "forex": FOREX,
        "total": len(UNIVERSE),
    }


@router.get("/status")
async def pipeline_status() -> dict:
    """Check data pipeline status."""
    return {
        "yfinanceInstalled": _HAS_YF,
        "cachedSymbols": len(_ohlcv_cache),
        "universeSize": len(UNIVERSE),
        "cachedKeys": list(_ohlcv_cache.keys())[:20],
    }
