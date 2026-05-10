"""
FRED (Federal Reserve Economic Data) normalizer.
Pulls key economic indicators relevant to geopolitical risk assessment.

Free API — register at fred.stlouisfed.org to get a key.
Without a key the endpoint returns an error; falls back gracefully.

Key series for economic warfare / geopolitical risk:
  DEXRUSL   — USD/RUB exchange rate  (Russia sanctions pressure)
  DEXCHUS   — USD/CNY exchange rate  (China tension proxy)
  DEXUSEU   — USD/EUR exchange rate  (European economic health)
  WTISPLC   — WTI crude oil price    (energy warfare / supply shock)
  GOLDAMGBD228NLBM — Gold price      (safe-haven flows / crisis indicator)
  VIXCLS    — VIX volatility index   (market fear / conflict premium)
  BAMLH0A0HYM2 — US HY spread       (credit stress / instability)
  T10Y2Y    — Yield curve spread     (recession / instability predictor)
"""
from __future__ import annotations

import os
from typing import Any

FRED_API_KEY = os.getenv("MSS_FRED_API_KEY", "")
FRED_BASE    = "https://api.stlouisfed.org/fred/series/observations"

# Series to fetch: (series_id, label, unit, geopolitical_relevance)
FRED_SERIES = [
    ("DEXRUSL",             "USD/RUB Rate",          "USD per RUB",     "Russia sanctions / ruble pressure"),
    ("DEXCHUS",             "USD/CNY Rate",          "USD per CNY",     "China economic tension proxy"),
    ("DEXUSEU",             "USD/EUR Rate",          "USD per EUR",     "European economic health"),
    ("WTISPLC",             "WTI Crude Oil",         "USD/barrel",      "Energy warfare / supply disruption"),
    ("GOLDAMGBD228NLBM",    "Gold (London Fix)",     "USD/troy oz",     "Safe-haven flows / crisis indicator"),
    ("VIXCLS",              "VIX Volatility",        "index",           "Market fear / conflict risk premium"),
    ("BAMLH0A0HYM2",        "US HY Credit Spread",   "pct",             "Credit stress / financial instability"),
    ("T10Y2Y",              "Yield Curve (10Y-2Y)",  "pct",             "Recession / instability predictor"),
]


def fred_params(series_id: str, limit: int = 5) -> dict:
    """Return query params for a FRED observations request."""
    params: dict[str, Any] = {
        "series_id":  series_id,
        "sort_order": "desc",
        "limit":      limit,
        "file_type":  "json",
    }
    if FRED_API_KEY:
        params["api_key"] = FRED_API_KEY
    return params


def parse_fred_observations(series_id: str, label: str, unit: str, relevance: str, data: dict) -> dict | None:
    """
    Parse FRED observations response into a normalised economic indicator dict.
    Returns None if no valid data.
    """
    obs = data.get("observations", [])
    valid = [o for o in obs if o.get("value") not in (".", "", None)]
    if not valid:
        return None

    latest = valid[0]
    try:
        value = float(latest["value"])
    except (ValueError, TypeError):
        return None

    # Compute 5-period change if we have enough history
    change_pct = None
    if len(valid) >= 2:
        try:
            prev = float(valid[-1]["value"])
            if prev != 0:
                change_pct = round((value - prev) / abs(prev) * 100, 2)
        except (ValueError, TypeError):
            pass

    # Anomaly signal: flag if change is significant (>5% for rates, >2% for spreads)
    threshold = 2.0 if series_id in ("VIXCLS", "T10Y2Y", "BAMLH0A0HYM2") else 5.0
    is_anomaly = abs(change_pct or 0) > threshold

    return {
        "seriesId":   series_id,
        "label":      label,
        "unit":       unit,
        "relevance":  relevance,
        "value":      value,
        "date":       latest.get("date"),
        "changePct":  change_pct,
        "isAnomaly":  is_anomaly,
        "direction":  "up" if (change_pct or 0) > 0 else "down",
        "history":    [
            {"date": o["date"], "value": float(o["value"])}
            for o in reversed(valid[:5])
            if o.get("value") not in (".", "", None)
        ],
    }


def build_economic_summary(indicators: list[dict]) -> dict:
    """
    Derive a composite economic risk signal from all fetched indicators.
    Returns a summary with overall stress score 0-100.
    """
    if not indicators:
        return {"stressScore": 0, "signals": [], "status": "no_data"}

    stress_signals = []
    score = 0

    for ind in indicators:
        sid = ind["seriesId"]
        val = ind["value"]
        chg = ind.get("changePct") or 0

        # Series-specific stress logic
        if sid == "DEXRUSL":
            # Ruble weakening (higher USD/RUB) = sanctions pressure
            if val > 90:
                stress_signals.append(f"RUB/USD at {val:.1f} — severe ruble depreciation, sanctions pressure elevated")
                score += 15
        elif sid == "VIXCLS":
            if val > 30:
                stress_signals.append(f"VIX={val:.1f} — elevated market fear, crisis premium active")
                score += min(20, int(val - 20))
        elif sid == "T10Y2Y":
            if val < 0:
                stress_signals.append(f"Yield curve inverted ({val:.2f}%) — recession indicator active")
                score += 10
        elif sid == "BAMLH0A0HYM2":
            if val > 4.0:
                stress_signals.append(f"HY spread {val:.2f}% — credit stress elevated, instability risk")
                score += 12
        elif sid == "WTISPLC":
            if abs(chg) > 10:
                stress_signals.append(f"WTI crude {'+' if chg > 0 else ''}{chg:.1f}% — energy price shock detected")
                score += 8
        elif sid == "GOLDAMGBD228NLBM":
            if chg > 5:
                stress_signals.append(f"Gold +{chg:.1f}% — safe-haven flows surging, crisis risk elevated")
                score += 10

    return {
        "stressScore":  min(100, score),
        "signals":      stress_signals,
        "status":       "critical" if score >= 50 else "elevated" if score >= 20 else "normal",
        "indicatorCount": len(indicators),
    }
