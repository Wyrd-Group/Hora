"""
FRED (Federal Reserve Economic Data) Feed for Quadratic API.

Provides macroeconomic indicators for portfolio context, regime detection,
and geopolitical-to-market signal conditioning.

Key series:
  - VIXCLS: VIX (fear index)
  - DFF: Fed Funds Rate
  - T10Y2Y: 10Y-2Y yield spread (recession indicator)
  - CPIAUCSL: CPI (inflation)
  - UNRATE: Unemployment rate
  - DGS10: 10-Year Treasury yield
  - DTWEXBGS: Trade-weighted USD index
  - BAMLH0A0HYM2: High-yield credit spread (risk appetite)

Requires: FRED_API_KEY env var (FREE — https://fred.stlouisfed.org/docs/api/api_key.html)
"""

import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import httpx

log = logging.getLogger("quadratic.feeds.fred")

# ── Config ───────────────────────────────────────────────────────────────────
FRED_KEY = os.environ.get("FRED_API_KEY", "")
BASE = "https://api.stlouisfed.org/fred"

# Key macro series for the Quadratic engines
MACRO_SERIES = {
    "vix": {"id": "VIXCLS", "name": "VIX Volatility Index", "category": "risk"},
    "fed_rate": {"id": "DFF", "name": "Fed Funds Rate", "category": "rates"},
    "yield_spread": {"id": "T10Y2Y", "name": "10Y-2Y Yield Spread", "category": "rates"},
    "treasury_10y": {"id": "DGS10", "name": "10-Year Treasury Yield", "category": "rates"},
    "treasury_2y": {"id": "DGS2", "name": "2-Year Treasury Yield", "category": "rates"},
    "cpi": {"id": "CPIAUCSL", "name": "CPI (All Urban)", "category": "inflation"},
    "core_cpi": {"id": "CPILFESL", "name": "Core CPI (ex Food & Energy)", "category": "inflation"},
    "pce": {"id": "PCEPI", "name": "PCE Price Index", "category": "inflation"},
    "unemployment": {"id": "UNRATE", "name": "Unemployment Rate", "category": "labor"},
    "nonfarm_payrolls": {"id": "PAYEMS", "name": "Nonfarm Payrolls", "category": "labor"},
    "initial_claims": {"id": "ICSA", "name": "Initial Jobless Claims", "category": "labor"},
    "usd_index": {"id": "DTWEXBGS", "name": "Trade-Weighted USD", "category": "fx"},
    "hy_spread": {"id": "BAMLH0A0HYM2", "name": "High-Yield Credit Spread", "category": "credit"},
    "ig_spread": {"id": "BAMLC0A0CM", "name": "Investment-Grade Spread", "category": "credit"},
    "m2": {"id": "M2SL", "name": "M2 Money Supply", "category": "money"},
    "retail_sales": {"id": "RSXFS", "name": "Retail Sales ex Food", "category": "consumer"},
    "housing_starts": {"id": "HOUST", "name": "Housing Starts", "category": "housing"},
    "industrial_prod": {"id": "INDPRO", "name": "Industrial Production", "category": "output"},
    "gdp": {"id": "GDP", "name": "GDP (Nominal)", "category": "output"},
    "real_gdp": {"id": "GDPC1", "name": "Real GDP", "category": "output"},
}


def _check_key():
    if not FRED_KEY:
        return {"error": "FRED_API_KEY not set. Get a FREE key at https://fred.stlouisfed.org/docs/api/api_key.html"}
    return None


# ── Single Series ────────────────────────────────────────────────────────────

async def get_series(
    series_id: str,
    limit: int = 60,
    frequency: str = None,
) -> Dict:
    """
    Fetch a single FRED series.

    frequency: d (daily), w (weekly), m (monthly), q (quarterly), a (annual)
    """
    err = _check_key()
    if err:
        return {**err, "series_id": series_id}

    url = f"{BASE}/series/observations"
    params = {
        "api_key": FRED_KEY,
        "series_id": series_id.upper(),
        "file_type": "json",
        "sort_order": "desc",
        "limit": limit,
    }
    if frequency:
        params["frequency"] = frequency

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        observations = data.get("observations", [])
        points = []
        for obs in reversed(observations):
            val = obs.get("value", ".")
            if val != ".":
                points.append({
                    "date": obs.get("date"),
                    "value": float(val),
                })

        latest = points[-1] if points else {}

        return {
            "series_id": series_id.upper(),
            "count": len(points),
            "latest": latest,
            "data": points,
        }
    except Exception as e:
        log.error(f"FRED error for {series_id}: {e}")
        return {"series_id": series_id, "error": str(e)}


# ── Macro Dashboard (all key indicators) ────────────────────────────────────

async def get_macro_dashboard() -> Dict:
    """
    Fetch latest values for all key macro indicators.
    Returns a dashboard-ready summary for portfolio context.
    """
    err = _check_key()
    if err:
        return err

    # Fetch all series in parallel
    tasks = {}
    for key, meta in MACRO_SERIES.items():
        tasks[key] = get_series(meta["id"], limit=5)

    results = await asyncio.gather(*tasks.values(), return_exceptions=True)

    dashboard = {}
    categories = {}
    for (key, meta), result in zip(MACRO_SERIES.items(), results):
        if isinstance(result, Exception):
            dashboard[key] = {"name": meta["name"], "error": str(result)}
            continue

        latest = result.get("latest", {})
        data = result.get("data", [])

        # Compute change from previous observation
        change = None
        if len(data) >= 2:
            change = round(data[-1]["value"] - data[-2]["value"], 4)

        entry = {
            "name": meta["name"],
            "value": latest.get("value"),
            "date": latest.get("date"),
            "change": change,
            "category": meta["category"],
        }
        dashboard[key] = entry

        cat = meta["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append({"key": key, **entry})

    # Regime detection heuristics
    regime = _detect_regime(dashboard)

    return {
        "indicators": dashboard,
        "by_category": categories,
        "regime": regime,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _detect_regime(dashboard: Dict) -> Dict:
    """
    Simple regime detection from macro indicators.
    Used by portfolio.py for risk aversion adjustment and market_intel.py for signal conditioning.
    """
    signals = {}

    # VIX regime
    vix = dashboard.get("vix", {}).get("value")
    if vix is not None:
        if vix > 30:
            signals["volatility"] = "crisis"
        elif vix > 20:
            signals["volatility"] = "elevated"
        else:
            signals["volatility"] = "calm"

    # Yield curve (recession indicator)
    spread = dashboard.get("yield_spread", {}).get("value")
    if spread is not None:
        if spread < 0:
            signals["yield_curve"] = "inverted"  # recession warning
        elif spread < 0.5:
            signals["yield_curve"] = "flat"
        else:
            signals["yield_curve"] = "normal"

    # Credit stress
    hy = dashboard.get("hy_spread", {}).get("value")
    if hy is not None:
        if hy > 6:
            signals["credit"] = "distressed"
        elif hy > 4:
            signals["credit"] = "stressed"
        else:
            signals["credit"] = "healthy"

    # Fed policy
    fed = dashboard.get("fed_rate", {}).get("value")
    fed_change = dashboard.get("fed_rate", {}).get("change")
    if fed is not None:
        if fed_change and fed_change > 0:
            signals["fed"] = "tightening"
        elif fed_change and fed_change < 0:
            signals["fed"] = "easing"
        else:
            signals["fed"] = "hold"

    # Overall regime
    crisis_signals = sum(1 for v in signals.values() if v in ("crisis", "inverted", "distressed", "tightening"))
    if crisis_signals >= 2:
        overall = "risk_off"
    elif crisis_signals >= 1:
        overall = "cautious"
    else:
        overall = "risk_on"

    return {
        "overall": overall,
        "signals": signals,
        "risk_aversion_multiplier": 2.0 if overall == "risk_off" else 1.3 if overall == "cautious" else 1.0,
    }


# ── Specific Indicator Bundles ───────────────────────────────────────────────

async def get_rates_bundle() -> Dict:
    """Fed rate, treasuries, yield spread — for portfolio and forecasting engines."""
    keys = ["fed_rate", "treasury_10y", "treasury_2y", "yield_spread"]
    tasks = {k: get_series(MACRO_SERIES[k]["id"], limit=30) for k in keys}
    results = await asyncio.gather(*tasks.values())
    return {k: r for k, r in zip(keys, results)}


async def get_inflation_bundle() -> Dict:
    """CPI, Core CPI, PCE — for macro regime and portfolio context."""
    keys = ["cpi", "core_cpi", "pce"]
    tasks = {k: get_series(MACRO_SERIES[k]["id"], limit=24, frequency="m") for k in keys}
    results = await asyncio.gather(*tasks.values())
    return {k: r for k, r in zip(keys, results)}


async def get_labor_bundle() -> Dict:
    """Unemployment, payrolls, claims — for economic health assessment."""
    keys = ["unemployment", "nonfarm_payrolls", "initial_claims"]
    tasks = {k: get_series(MACRO_SERIES[k]["id"], limit=24) for k in keys}
    results = await asyncio.gather(*tasks.values())
    return {k: r for k, r in zip(keys, results)}


async def get_risk_indicators() -> Dict:
    """VIX, credit spreads, USD — for threat/risk scoring context."""
    keys = ["vix", "hy_spread", "ig_spread", "usd_index"]
    tasks = {k: get_series(MACRO_SERIES[k]["id"], limit=30) for k in keys}
    results = await asyncio.gather(*tasks.values())
    return {k: r for k, r in zip(keys, results)}
