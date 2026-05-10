"""
Macroeconomic data aggregator — free, no-auth APIs.

Sources:
  1. World Bank API (GDP, inflation, trade, unemployment) — no key
  2. IMF DataMapper (GDP growth forecasts, all countries) — no key
  3. Frankfurter API (ECB exchange rates, 30+ currencies) — no key
  4. Open Exchange Rates (daily FX via exchangerate-api) — no key
  5. UN Comtrade (trade balances) — no key for public preview

All responses cached in-memory with TTL to avoid hammering.
"""
from __future__ import annotations

import time
import logging
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger("mss.macro")

# ── URLs ──────────────────────────────────────────────────────────────────────

WORLD_BANK_URL    = "https://api.worldbank.org/v2/country/{country}/indicator/{indicator}"
IMF_DATAMAPPER    = "https://www.imf.org/external/datamapper/api/v1/{indicator}?periods={year}"
FRANKFURTER_URL   = "https://api.frankfurter.dev/v1/latest"
EXCHANGE_RATE_URL = "https://open.er-api.com/v6/latest/{base}"

# Key macro indicators from World Bank
WB_INDICATORS = {
    "NY.GDP.MKTP.CD":     "GDP (current USD)",
    "NY.GDP.MKTP.KD.ZG":  "GDP Growth (%)",
    "FP.CPI.TOTL.ZG":     "Inflation CPI (%)",
    "SL.UEM.TOTL.ZS":     "Unemployment (%)",
    "BN.CAB.XOKA.CD":     "Current Account Balance (USD)",
    "GC.DOD.TOTL.GD.ZS":  "Central Govt Debt (% GDP)",
    "BX.TRF.PWKR.CD.DT":  "Remittances Received (USD)",
    "NE.TRD.GNFS.ZS":     "Trade (% GDP)",
    "BX.KLT.DINV.CD.WD":  "FDI Net Inflows (USD)",
    "FR.INR.RINR":         "Real Interest Rate (%)",
}

# IMF indicators
IMF_INDICATORS = {
    "NGDP_RPCH":  "Real GDP Growth (%)",
    "PCPIPCH":    "Inflation Rate (%)",
    "LUR":        "Unemployment Rate (%)",
    "GGR_NGDP":   "Govt Revenue (% GDP)",
    "GGXWDG_NGDP":"Govt Gross Debt (% GDP)",
    "BCA_NGDPD":  "Current Account (% GDP)",
}

# Key countries for geopolitical dashboard
KEY_COUNTRIES = [
    "USA", "CHN", "RUS", "GBR", "DEU", "FRA", "JPN", "IND",
    "SAU", "IRN", "IRQ", "ISR", "TUR", "EGY", "ARE", "QAT",
    "UKR", "PAK", "KOR", "BRA", "NGA", "ZAF",
]

# In-memory cache: key -> (data, timestamp)
_cache: dict[str, tuple[Any, float]] = {}
CACHE_TTL = 3600  # 1 hour


def _cached(key: str) -> Any | None:
    if key in _cache:
        data, ts = _cache[key]
        if time.monotonic() - ts < CACHE_TTL:
            return data
    return None


def _set_cache(key: str, data: Any) -> None:
    _cache[key] = (data, time.monotonic())


# ── World Bank parser ─────────────────────────────────────────────────────────

def parse_wb_response(data: list) -> list[dict[str, Any]]:
    """Parse World Bank API JSON response [metadata, records]."""
    if not data or len(data) < 2 or not data[1]:
        return []

    records = []
    for item in data[1]:
        val = item.get("value")
        if val is None:
            continue
        records.append({
            "country":     item.get("country", {}).get("value", ""),
            "countryCode": item.get("countryiso3code", ""),
            "indicator":   item.get("indicator", {}).get("id", ""),
            "indicatorName": item.get("indicator", {}).get("value", ""),
            "year":        item.get("date", ""),
            "value":       val,
        })
    return records


# ── IMF parser ────────────────────────────────────────────────────────────────

def parse_imf_response(data: dict, indicator: str) -> list[dict[str, Any]]:
    """Parse IMF DataMapper response."""
    values = data.get("values", {}).get(indicator, {})
    if not values:
        return []

    records = []
    for country_code, periods in values.items():
        for year, value in periods.items():
            records.append({
                "countryCode": country_code,
                "indicator":   indicator,
                "indicatorName": IMF_INDICATORS.get(indicator, indicator),
                "year":        year,
                "value":       float(value),
            })
    return records


# ── Exchange rate parser ──────────────────────────────────────────────────────

def parse_fx_rates(data: dict) -> dict[str, Any]:
    """Parse Frankfurter or Open Exchange Rates response."""
    rates = data.get("rates", {})
    return {
        "base":   data.get("base", "USD"),
        "date":   data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "rates":  rates,
        "count":  len(rates),
        "fetchedAt": datetime.now(timezone.utc).isoformat() + "Z",
    }


# ── Aggregate builders ────────────────────────────────────────────────────────

def build_country_profile(wb_data: list[dict], imf_data: list[dict], country_code: str) -> dict[str, Any]:
    """Build a unified macro profile for a country."""
    profile: dict[str, Any] = {
        "countryCode": country_code,
        "worldBank":   {},
        "imf":         {},
        "updatedAt":   datetime.now(timezone.utc).isoformat() + "Z",
    }

    for rec in wb_data:
        if rec.get("countryCode") == country_code:
            ind = rec["indicator"]
            if ind not in profile["worldBank"] or rec["year"] > profile["worldBank"][ind].get("year", "0"):
                profile["worldBank"][ind] = {
                    "name":  rec["indicatorName"],
                    "year":  rec["year"],
                    "value": rec["value"],
                }

    for rec in imf_data:
        if rec.get("countryCode") == country_code:
            ind = rec["indicator"]
            profile["imf"][ind] = {
                "name":  rec["indicatorName"],
                "year":  rec["year"],
                "value": rec["value"],
            }

    return profile
