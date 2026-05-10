"""
Bridge module — fetch OHLCV close prices for the forecasting router.

The canonical data pipeline lives in the ingestor service (normalizers/yfinance_ohlcv.py).
This bridge provides a lightweight API-side adapter that:
  1. First checks the PostgreSQL ohlcv table (if DB is up and populated)
  2. Falls back to a direct yfinance fetch (in-process, cached)

This avoids duplicating the full normalizer while keeping the API service
self-contained enough to work even if the ingestor hasn't run yet.
"""
from __future__ import annotations

import asyncio
import logging
from functools import lru_cache
from typing import Optional

log = logging.getLogger("mss.api.normalizers_bridge")

# In-memory cache for direct fetches
_price_cache: dict[str, tuple[float, list[float]]] = {}  # key → (timestamp, prices)
_CACHE_TTL = 3600.0  # 1 hour

try:
    import yfinance as yf
    _HAS_YF = True
except ImportError:
    _HAS_YF = False


async def get_ohlcv_prices(
    symbol: str,
    period: str = "2y",
    interval: str = "1d",
) -> list[float]:
    """
    Get close prices for a symbol. Tries DB first, falls back to yfinance.
    Returns list of floats (oldest first), empty list on failure.
    """
    import time

    # Check cache
    cache_key = f"{symbol}:{period}:{interval}"
    if cache_key in _price_cache:
        cached_ts, cached_prices = _price_cache[cache_key]
        if time.monotonic() - cached_ts < _CACHE_TTL:
            return cached_prices

    # Try DB first
    prices = await _fetch_from_db(symbol, period)
    if prices and len(prices) >= 10:
        _price_cache[cache_key] = (time.monotonic(), prices)
        return prices

    # Fall back to direct yfinance fetch
    prices = await _fetch_from_yfinance(symbol, period, interval)
    if prices:
        _price_cache[cache_key] = (time.monotonic(), prices)

    return prices


async def _fetch_from_db(symbol: str, period: str) -> list[float]:
    """Try to pull close prices from PostgreSQL ohlcv table."""
    try:
        from core import db

        pool = db.pool()
        if pool is None:
            return []

        # Map period string to SQL interval
        period_map = {
            "1mo": "1 month", "3mo": "3 months", "6mo": "6 months",
            "1y": "1 year", "2y": "2 years", "5y": "5 years", "10y": "10 years",
        }
        sql_interval = period_map.get(period, "2 years")

        rows = await pool.fetch(
            """
            SELECT close FROM ohlcv
            WHERE symbol = $1 AND ts >= now() - $2::interval
            ORDER BY ts ASC
            """,
            symbol, sql_interval,
        )

        return [float(r["close"]) for r in rows if r["close"] is not None]

    except Exception as exc:
        log.debug("DB fetch failed for %s: %s", symbol, exc)
        return []


async def _fetch_from_yfinance(
    symbol: str,
    period: str = "2y",
    interval: str = "1d",
) -> list[float]:
    """Direct yfinance fetch as fallback."""
    if not _HAS_YF:
        log.warning("yfinance not installed — cannot fetch prices for %s", symbol)
        return []

    try:
        loop = asyncio.get_event_loop()
        prices = await loop.run_in_executor(None, _sync_fetch, symbol, period, interval)
        return prices
    except Exception as exc:
        log.error("yfinance fetch failed for %s: %s", symbol, exc)
        return []


def _sync_fetch(symbol: str, period: str, interval: str) -> list[float]:
    """Synchronous yfinance fetch (runs in thread executor)."""
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period, interval=interval, auto_adjust=False)

    if df.empty:
        return []

    closes = df["Close"].dropna().tolist()
    return [float(c) for c in closes]
