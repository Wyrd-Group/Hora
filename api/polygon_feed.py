"""
Polygon.io Data Feed for Quadratic API.

Provides real-time and historical market data:
  - OHLCV bars (1min to 1month)
  - Real-time snapshots (last trade, last quote)
  - Options chains with greeks
  - Company financials (income statement, balance sheet)
  - Ticker reference data (details, news)
  - Crypto & Forex quotes

Requires: POLYGON_API_KEY env var ($30/month Starter plan)
Docs: https://polygon.io/docs
"""

import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import httpx

log = logging.getLogger("quadratic.feeds.polygon")

# ── Config ───────────────────────────────────────────────────────────────────
POLYGON_KEY = os.environ.get("POLYGON_API_KEY", "")
BASE = "https://api.polygon.io"


def _headers() -> Dict:
    return {"Authorization": f"Bearer {POLYGON_KEY}"}


def _check_key():
    if not POLYGON_KEY:
        return {"error": "POLYGON_API_KEY not set. Get one at https://polygon.io ($30/month Starter)."}
    return None


# ── OHLCV Bars ───────────────────────────────────────────────────────────────

async def get_bars(
    symbol: str,
    multiplier: int = 1,
    timespan: str = "day",
    from_date: str = None,
    to_date: str = None,
    limit: int = 200,
) -> Dict:
    """
    Fetch OHLCV bars from Polygon.

    timespan: second, minute, hour, day, week, month, quarter, year
    """
    err = _check_key()
    if err:
        return {**err, "symbol": symbol}

    if not from_date:
        from_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    if not to_date:
        to_date = datetime.now().strftime("%Y-%m-%d")

    url = f"{BASE}/v2/aggs/ticker/{symbol.upper()}/range/{multiplier}/{timespan}/{from_date}/{to_date}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=_headers(), params={"adjusted": "true", "sort": "asc", "limit": limit})
            resp.raise_for_status()
            data = resp.json()

        results = data.get("results", [])
        if not results:
            return {"symbol": symbol.upper(), "error": "No bar data returned", "count": 0}

        return {
            "symbol": symbol.upper(),
            "timespan": f"{multiplier}{timespan}",
            "count": len(results),
            "last_price": results[-1].get("c"),
            "ohlcv": {
                "timestamps": [r.get("t") for r in results],
                "dates": [datetime.fromtimestamp(r["t"] / 1000).strftime("%Y-%m-%d %H:%M") for r in results],
                "opens": [r.get("o") for r in results],
                "highs": [r.get("h") for r in results],
                "lows": [r.get("l") for r in results],
                "closes": [r.get("c") for r in results],
                "volumes": [r.get("v") for r in results],
                "vwap": [r.get("vw") for r in results],
                "n_transactions": [r.get("n") for r in results],
            },
        }
    except Exception as e:
        log.error(f"Polygon bars error for {symbol}: {e}")
        return {"symbol": symbol, "error": str(e)}


# ── Real-time Snapshot ───────────────────────────────────────────────────────

async def get_snapshot(symbol: str) -> Dict:
    """Get real-time snapshot: last trade, last quote, daily bar, prev close."""
    err = _check_key()
    if err:
        return {**err, "symbol": symbol}

    url = f"{BASE}/v2/snapshot/locale/us/markets/stocks/tickers/{symbol.upper()}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=_headers())
            resp.raise_for_status()
            data = resp.json()

        ticker = data.get("ticker", {})
        day = ticker.get("day", {})
        prev = ticker.get("prevDay", {})
        last_trade = ticker.get("lastTrade", {})
        last_quote = ticker.get("lastQuote", {})

        change = day.get("c", 0) - prev.get("c", 0) if day.get("c") and prev.get("c") else 0
        change_pct = (change / prev["c"] * 100) if prev.get("c") else 0

        return {
            "symbol": symbol.upper(),
            "last_price": last_trade.get("p"),
            "last_size": last_trade.get("s"),
            "bid": last_quote.get("p"),
            "ask": last_quote.get("P"),
            "today": {
                "open": day.get("o"),
                "high": day.get("h"),
                "low": day.get("l"),
                "close": day.get("c"),
                "volume": day.get("v"),
                "vwap": day.get("vw"),
            },
            "prev_close": prev.get("c"),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
        }
    except Exception as e:
        log.error(f"Polygon snapshot error for {symbol}: {e}")
        return {"symbol": symbol, "error": str(e)}


async def get_multi_snapshot(symbols: List[str]) -> Dict:
    """Get snapshots for multiple tickers at once."""
    err = _check_key()
    if err:
        return err

    tickers = ",".join(s.upper() for s in symbols)
    url = f"{BASE}/v2/snapshot/locale/us/markets/stocks/tickers"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=_headers(), params={"tickers": tickers})
            resp.raise_for_status()
            data = resp.json()

        snapshots = {}
        for t in data.get("tickers", []):
            sym = t.get("ticker")
            day = t.get("day", {})
            prev = t.get("prevDay", {})
            last_trade = t.get("lastTrade", {})
            change = day.get("c", 0) - prev.get("c", 0) if day.get("c") and prev.get("c") else 0

            snapshots[sym] = {
                "last_price": last_trade.get("p"),
                "volume": day.get("v"),
                "change": round(change, 2),
                "change_pct": round((change / prev["c"] * 100) if prev.get("c") else 0, 2),
                "vwap": day.get("vw"),
            }

        return {"count": len(snapshots), "snapshots": snapshots}
    except Exception as e:
        log.error(f"Polygon multi-snapshot error: {e}")
        return {"error": str(e)}


# ── Options Chain ────────────────────────────────────────────────────────────

async def get_options_chain(
    symbol: str,
    expiration_date: str = None,
    contract_type: str = None,
    limit: int = 50,
) -> Dict:
    """
    Fetch options chain for a symbol.

    contract_type: 'call', 'put', or None for both
    expiration_date: YYYY-MM-DD or None for nearest
    """
    err = _check_key()
    if err:
        return {**err, "symbol": symbol}

    url = f"{BASE}/v3/reference/options/contracts"
    params = {
        "underlying_ticker": symbol.upper(),
        "limit": limit,
        "order": "asc",
        "sort": "expiration_date",
    }
    if expiration_date:
        params["expiration_date"] = expiration_date
    if contract_type:
        params["contract_type"] = contract_type

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=_headers(), params=params)
            resp.raise_for_status()
            data = resp.json()

        contracts = []
        for c in data.get("results", []):
            contracts.append({
                "ticker": c.get("ticker"),
                "type": c.get("contract_type"),
                "strike": c.get("strike_price"),
                "expiration": c.get("expiration_date"),
                "shares_per_contract": c.get("shares_per_contract", 100),
                "exercise_style": c.get("exercise_style"),
            })

        return {
            "underlying": symbol.upper(),
            "contracts": contracts,
            "count": len(contracts),
        }
    except Exception as e:
        log.error(f"Polygon options chain error for {symbol}: {e}")
        return {"symbol": symbol, "error": str(e)}


async def get_option_snapshot(symbol: str) -> Dict:
    """Get real-time options snapshot with greeks."""
    err = _check_key()
    if err:
        return {**err, "symbol": symbol}

    url = f"{BASE}/v3/snapshot/options/{symbol.upper()}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=_headers(), params={"limit": 50})
            resp.raise_for_status()
            data = resp.json()

        options = []
        for r in data.get("results", []):
            details = r.get("details", {})
            greeks = r.get("greeks", {})
            day = r.get("day", {})
            options.append({
                "contract": details.get("ticker"),
                "type": details.get("contract_type"),
                "strike": details.get("strike_price"),
                "expiration": details.get("expiration_date"),
                "last_price": day.get("close"),
                "volume": day.get("volume"),
                "open_interest": r.get("open_interest"),
                "implied_volatility": r.get("implied_volatility"),
                "greeks": {
                    "delta": greeks.get("delta"),
                    "gamma": greeks.get("gamma"),
                    "theta": greeks.get("theta"),
                    "vega": greeks.get("vega"),
                },
            })

        return {
            "underlying": symbol.upper(),
            "options": options,
            "count": len(options),
        }
    except Exception as e:
        log.error(f"Polygon option snapshot error for {symbol}: {e}")
        return {"symbol": symbol, "error": str(e)}


# ── Company Financials ───────────────────────────────────────────────────────

async def get_financials(
    symbol: str,
    timeframe: str = "annual",
    limit: int = 4,
) -> Dict:
    """
    Fetch company financials (income statement, balance sheet, cash flow).

    timeframe: 'annual', 'quarterly', 'ttm'
    """
    err = _check_key()
    if err:
        return {**err, "symbol": symbol}

    url = f"{BASE}/vX/reference/financials"
    params = {
        "ticker": symbol.upper(),
        "timeframe": timeframe,
        "limit": limit,
        "order": "desc",
        "sort": "period_of_report_date",
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=_headers(), params=params)
            resp.raise_for_status()
            data = resp.json()

        periods = []
        for r in data.get("results", []):
            financials = r.get("financials", {})
            income = financials.get("income_statement", {})
            balance = financials.get("balance_sheet", {})
            cash_flow = financials.get("cash_flow_statement", {})

            def _val(section, key):
                return section.get(key, {}).get("value")

            periods.append({
                "period": r.get("fiscal_period"),
                "fiscal_year": r.get("fiscal_year"),
                "end_date": r.get("end_date"),
                "income_statement": {
                    "revenue": _val(income, "revenues"),
                    "cost_of_revenue": _val(income, "cost_of_revenue"),
                    "gross_profit": _val(income, "gross_profit"),
                    "operating_income": _val(income, "operating_income_loss"),
                    "net_income": _val(income, "net_income_loss"),
                    "eps_basic": _val(income, "basic_earnings_per_share"),
                    "eps_diluted": _val(income, "diluted_earnings_per_share"),
                },
                "balance_sheet": {
                    "total_assets": _val(balance, "assets"),
                    "total_liabilities": _val(balance, "liabilities"),
                    "equity": _val(balance, "equity"),
                    "cash": _val(balance, "current_assets"),
                },
                "cash_flow": {
                    "operating": _val(cash_flow, "net_cash_flow_from_operating_activities"),
                    "investing": _val(cash_flow, "net_cash_flow_from_investing_activities"),
                    "financing": _val(cash_flow, "net_cash_flow_from_financing_activities"),
                },
            })

        return {
            "symbol": symbol.upper(),
            "timeframe": timeframe,
            "periods": periods,
            "count": len(periods),
        }
    except Exception as e:
        log.error(f"Polygon financials error for {symbol}: {e}")
        return {"symbol": symbol, "error": str(e)}


# ── Ticker Details ───────────────────────────────────────────────────────────

async def get_ticker_details(symbol: str) -> Dict:
    """Get comprehensive ticker info (sector, industry, market cap, description)."""
    err = _check_key()
    if err:
        return {**err, "symbol": symbol}

    url = f"{BASE}/v3/reference/tickers/{symbol.upper()}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=_headers())
            resp.raise_for_status()
            data = resp.json()

        r = data.get("results", {})
        return {
            "symbol": r.get("ticker"),
            "name": r.get("name"),
            "description": r.get("description", "")[:500],
            "market_cap": r.get("market_cap"),
            "sector": r.get("sic_description"),
            "exchange": r.get("primary_exchange"),
            "type": r.get("type"),
            "locale": r.get("locale"),
            "currency": r.get("currency_name"),
            "outstanding_shares": r.get("share_class_shares_outstanding"),
            "weighted_shares": r.get("weighted_shares_outstanding"),
            "homepage": r.get("homepage_url"),
            "phone": r.get("phone_number"),
            "address": r.get("address"),
            "branding": {
                "icon": r.get("branding", {}).get("icon_url"),
                "logo": r.get("branding", {}).get("logo_url"),
            },
        }
    except Exception as e:
        log.error(f"Polygon ticker details error for {symbol}: {e}")
        return {"symbol": symbol, "error": str(e)}


# ── Ticker News ──────────────────────────────────────────────────────────────

async def get_ticker_news(symbol: str, limit: int = 10) -> Dict:
    """Get latest news articles for a ticker."""
    err = _check_key()
    if err:
        return {**err, "symbol": symbol}

    url = f"{BASE}/v2/reference/news"
    params = {"ticker": symbol.upper(), "limit": limit, "order": "desc", "sort": "published_utc"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=_headers(), params=params)
            resp.raise_for_status()
            data = resp.json()

        articles = []
        for a in data.get("results", []):
            articles.append({
                "title": a.get("title"),
                "author": a.get("author"),
                "published": a.get("published_utc"),
                "url": a.get("article_url"),
                "source": a.get("publisher", {}).get("name"),
                "tickers": a.get("tickers", []),
                "description": (a.get("description") or "")[:300],
                "keywords": a.get("keywords", []),
            })

        return {
            "symbol": symbol.upper(),
            "articles": articles,
            "count": len(articles),
        }
    except Exception as e:
        log.error(f"Polygon news error for {symbol}: {e}")
        return {"symbol": symbol, "error": str(e)}


# ── Crypto & Forex ───────────────────────────────────────────────────────────

async def get_crypto_snapshot(symbol: str = "X:BTCUSD") -> Dict:
    """Get crypto snapshot. Symbol format: X:BTCUSD, X:ETHUSD, etc."""
    err = _check_key()
    if err:
        return {**err, "symbol": symbol}

    url = f"{BASE}/v2/snapshot/locale/global/markets/crypto/tickers/{symbol}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=_headers())
            resp.raise_for_status()
            data = resp.json()

        ticker = data.get("ticker", {})
        day = ticker.get("day", {})
        prev = ticker.get("prevDay", {})

        return {
            "symbol": symbol,
            "last_price": ticker.get("lastTrade", {}).get("p"),
            "today": {
                "open": day.get("o"),
                "high": day.get("h"),
                "low": day.get("l"),
                "close": day.get("c"),
                "volume": day.get("v"),
            },
            "prev_close": prev.get("c"),
            "change_pct": round(((day.get("c", 0) - prev.get("c", 1)) / prev.get("c", 1)) * 100, 2) if prev.get("c") else 0,
        }
    except Exception as e:
        log.error(f"Polygon crypto error for {symbol}: {e}")
        return {"symbol": symbol, "error": str(e)}


async def get_forex_snapshot(pair: str = "C:EURUSD") -> Dict:
    """Get forex pair snapshot. Symbol format: C:EURUSD, C:GBPUSD, etc."""
    err = _check_key()
    if err:
        return {**err, "pair": pair}

    url = f"{BASE}/v2/snapshot/locale/global/markets/forex/tickers/{pair}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=_headers())
            resp.raise_for_status()
            data = resp.json()

        ticker = data.get("ticker", {})
        day = ticker.get("day", {})

        return {
            "pair": pair,
            "bid": ticker.get("lastQuote", {}).get("b"),
            "ask": ticker.get("lastQuote", {}).get("a"),
            "mid": round((ticker.get("lastQuote", {}).get("b", 0) + ticker.get("lastQuote", {}).get("a", 0)) / 2, 5),
            "today": {
                "open": day.get("o"),
                "high": day.get("h"),
                "low": day.get("l"),
                "close": day.get("c"),
            },
        }
    except Exception as e:
        log.error(f"Polygon forex error for {pair}: {e}")
        return {"pair": pair, "error": str(e)}
