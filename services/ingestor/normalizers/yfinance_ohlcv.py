"""
Yahoo Finance OHLCV Normalizer — financial market data ingestion.

Pulls OHLCV (Open/High/Low/Close/Volume) data for equities, ETFs,
crypto, forex, and commodities via the yfinance library.

This is the data pipeline that unblocks all training-dependent upgrades:
  - FinRL (DRL training on real market environments)
  - PyG (GNN training on real correlation networks)
  - Qlib RD-Agent (autonomous alpha discovery on real factor returns)
  - Chronos-2 / TimesFM (validation on real price series)

Usage:
  from normalizers.yfinance_ohlcv import fetch_ohlcv, fetch_batch, UNIVERSE

  # Single symbol
  bars = await fetch_ohlcv("AAPL", period="1y", interval="1d")

  # Full universe
  all_bars = await fetch_batch(UNIVERSE, period="2y", interval="1d")
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

log = logging.getLogger("mss.ingestor.yfinance")

# ── Graceful import ───────────────────────────────────────────────────────────
try:
    import yfinance as yf
    _HAS_YF = True
except ImportError:
    _HAS_YF = False
    log.warning("yfinance not installed — financial data ingestion disabled")

# ── Universe definition ───────────────────────────────────────────────────────
# Matches the asset universe in quadratic-ip/assets/data.js (57 stocks + extras)
# Organized by asset class for factor analysis and correlation networks.

EQUITIES = [
    # US Mega-cap (matches Quantico Sandbox universe)
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B",
    "JPM", "V", "JNJ", "WMT", "PG", "MA", "UNH", "HD", "DIS", "BAC",
    "XOM", "CVX", "PFE", "ABBV", "KO", "PEP", "TMO", "COST", "MRK",
    "AVGO", "LLY", "ORCL", "CRM", "AMD", "NFLX", "ADBE", "INTC",
    # EU / Asia (for cross-market correlation)
    "ASML", "SAP", "NVO", "TM", "BABA", "TSM",
]

ETFS = [
    "SPY", "QQQ", "IWM", "EFA", "EEM",  # equity indices
    "TLT", "IEF", "HYG", "LQD",          # fixed income
    "GLD", "SLV", "USO", "UNG",           # commodities
    "VNQ",                                 # real estate
    "XLF", "XLE", "XLK", "XLV", "XLI",   # sectors
]

CRYPTO = [
    "BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "ADA-USD",
    "XRP-USD", "DOT-USD", "AVAX-USD", "MATIC-USD", "LINK-USD",
]

FOREX = [
    "EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCHF=X",
    "AUDUSD=X", "USDCAD=X", "NZDUSD=X",
]

UNIVERSE = EQUITIES + ETFS + CRYPTO + FOREX


@dataclass
class OHLCVBar:
    symbol:    str
    timestamp: datetime
    open:      float
    high:      float
    low:       float
    close:     float
    volume:    float
    adj_close: float = 0.0

    def as_dict(self) -> dict:
        return {
            "symbol":    self.symbol,
            "timestamp": self.timestamp.isoformat(),
            "open":      round(self.open, 4),
            "high":      round(self.high, 4),
            "low":       round(self.low, 4),
            "close":     round(self.close, 4),
            "volume":    int(self.volume),
            "adjClose":  round(self.adj_close, 4),
        }

    def as_db_tuple(self) -> tuple:
        """For bulk INSERT into PostgreSQL."""
        return (
            self.symbol, self.timestamp, self.open, self.high,
            self.low, self.close, self.volume, self.adj_close,
        )


def fetch_ohlcv(
    symbol: str,
    period: str = "2y",
    interval: str = "1d",
) -> list[OHLCVBar]:
    """
    Fetch OHLCV data for a single symbol.
    Runs synchronously (yfinance uses requests internally).

    Args:
        symbol: ticker (e.g. "AAPL", "BTC-USD", "EURUSD=X")
        period: lookback ("1d","5d","1mo","3mo","6mo","1y","2y","5y","10y","ytd","max")
        interval: bar size ("1m","2m","5m","15m","30m","60m","90m","1h","1d","5d","1wk","1mo","3mo")

    Returns:
        List of OHLCVBar objects, sorted by timestamp ascending.
    """
    if not _HAS_YF:
        log.error("yfinance not installed")
        return []

    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval, auto_adjust=False)

        if df.empty:
            log.warning("No data returned for %s", symbol)
            return []

        bars = []
        for idx, row in df.iterrows():
            ts = idx.to_pydatetime()
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)

            bars.append(OHLCVBar(
                symbol=symbol,
                timestamp=ts,
                open=float(row.get("Open", 0)),
                high=float(row.get("High", 0)),
                low=float(row.get("Low", 0)),
                close=float(row.get("Close", 0)),
                volume=float(row.get("Volume", 0)),
                adj_close=float(row.get("Adj Close", row.get("Close", 0))),
            ))

        log.info("Fetched %d bars for %s (%s/%s)", len(bars), symbol, period, interval)
        return bars

    except Exception as e:
        log.error("Failed to fetch %s: %s", symbol, e)
        return []


async def fetch_ohlcv_async(
    symbol: str,
    period: str = "2y",
    interval: str = "1d",
) -> list[OHLCVBar]:
    """Async wrapper — runs yfinance in thread executor."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, fetch_ohlcv, symbol, period, interval)


async def fetch_batch(
    symbols: list[str],
    period: str = "2y",
    interval: str = "1d",
    max_concurrent: int = 5,
    delay_between: float = 0.5,
) -> dict[str, list[OHLCVBar]]:
    """
    Fetch OHLCV for multiple symbols with rate limiting.

    Args:
        symbols: list of tickers
        period: lookback period
        interval: bar size
        max_concurrent: max parallel fetches (be nice to Yahoo)
        delay_between: seconds between batches

    Returns:
        Dict of symbol → list of OHLCVBar
    """
    results: dict[str, list[OHLCVBar]] = {}
    semaphore = asyncio.Semaphore(max_concurrent)

    async def _fetch_one(sym: str):
        async with semaphore:
            bars = await fetch_ohlcv_async(sym, period, interval)
            results[sym] = bars
            await asyncio.sleep(delay_between)

    tasks = [_fetch_one(sym) for sym in symbols]
    await asyncio.gather(*tasks, return_exceptions=True)

    success = sum(1 for v in results.values() if v)
    log.info("Batch fetch complete: %d/%d symbols successful", success, len(symbols))

    return results


async def upsert_to_db(
    pool,  # asyncpg.Pool
    bars: list[OHLCVBar],
) -> int:
    """
    Bulk upsert OHLCV bars to PostgreSQL.
    Uses ON CONFLICT to handle re-runs gracefully (idempotent).

    Requires table:
        CREATE TABLE IF NOT EXISTS ohlcv (
            symbol      TEXT NOT NULL,
            ts          TIMESTAMPTZ NOT NULL,
            open        DOUBLE PRECISION,
            high        DOUBLE PRECISION,
            low         DOUBLE PRECISION,
            close       DOUBLE PRECISION,
            volume      BIGINT,
            adj_close   DOUBLE PRECISION,
            PRIMARY KEY (symbol, ts)
        );
        CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol ON ohlcv(symbol);
        CREATE INDEX IF NOT EXISTS idx_ohlcv_ts ON ohlcv(ts);

    Returns number of rows upserted.
    """
    if not bars:
        return 0

    rows = [b.as_db_tuple() for b in bars]

    await pool.executemany(
        """
        INSERT INTO ohlcv (symbol, ts, open, high, low, close, volume, adj_close)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (symbol, ts) DO UPDATE SET
            open      = EXCLUDED.open,
            high      = EXCLUDED.high,
            low       = EXCLUDED.low,
            close     = EXCLUDED.close,
            volume    = EXCLUDED.volume,
            adj_close = EXCLUDED.adj_close
        """,
        rows,
    )

    log.info("Upserted %d OHLCV bars to database", len(rows))
    return len(rows)


# ── Feature computation (materializes alphas server-side) ─────────────────────

def compute_returns(bars: list[OHLCVBar]) -> list[dict]:
    """
    Compute log returns, volatility, and basic features from OHLCV bars.
    This is the server-side equivalent of what factorEngine.js does in the browser.
    """
    if len(bars) < 2:
        return []

    import math
    features = []

    for i in range(1, len(bars)):
        prev = bars[i - 1]
        curr = bars[i]

        if prev.close <= 0 or curr.close <= 0:
            continue

        log_return = math.log(curr.close / prev.close)
        intraday_range = (curr.high - curr.low) / curr.close if curr.close > 0 else 0
        gap = (curr.open - prev.close) / prev.close if prev.close > 0 else 0

        features.append({
            "symbol":        curr.symbol,
            "timestamp":     curr.timestamp.isoformat(),
            "close":         curr.close,
            "logReturn":     round(log_return, 6),
            "intradayRange": round(intraday_range, 6),
            "gap":           round(gap, 6),
            "volume":        curr.volume,
            "volumeRatio":   round(curr.volume / max(prev.volume, 1), 4),
        })

    return features
