"""
GET /api/v1/macro/fx            — live exchange rates (30+ currencies)
GET /api/v1/macro/indicators    — World Bank indicators for key countries
GET /api/v1/macro/imf           — IMF forecasts (GDP growth, inflation, etc.)
GET /api/v1/macro/profile/{cc}  — unified country macro profile
GET /api/v1/macro/dashboard     — full macro dashboard (all key countries)
"""
from __future__ import annotations

import httpx
from typing import Optional
from fastapi import APIRouter, Query

from engines.macro import (
    WORLD_BANK_URL, WB_INDICATORS, KEY_COUNTRIES,
    IMF_DATAMAPPER, IMF_INDICATORS,
    FRANKFURTER_URL, EXCHANGE_RATE_URL,
    parse_wb_response, parse_imf_response, parse_fx_rates,
    build_country_profile,
    _cached, _set_cache,
)

router = APIRouter(prefix="/api/v1/macro", tags=["macro"])

_http: httpx.AsyncClient | None = None


def _client() -> httpx.AsyncClient:
    global _http
    if _http is None:
        _http = httpx.AsyncClient(
            headers={"User-Agent": "MSS-Aegis/0.1"},
            follow_redirects=True,
            timeout=15.0,
        )
    return _http


# ── Exchange rates ────────────────────────────────────────────────────────────

@router.get("/fx")
async def get_fx_rates(
    base: str = Query("USD", description="Base currency code"),
) -> dict:
    cache_key = f"fx:{base}"
    cached = _cached(cache_key)
    if cached:
        return cached

    try:
        resp = await _client().get(FRANKFURTER_URL, params={"base": base})
        resp.raise_for_status()
        result = parse_fx_rates(resp.json())
        _set_cache(cache_key, result)
        return result
    except Exception:
        # Fallback to exchangerate-api
        try:
            resp2 = await _client().get(EXCHANGE_RATE_URL.format(base=base))
            resp2.raise_for_status()
            data = resp2.json()
            result = parse_fx_rates(data)
            _set_cache(cache_key, result)
            return result
        except Exception as exc:
            return {"error": str(exc), "rates": {}}


# ── World Bank indicators ────────────────────────────────────────────────────

@router.get("/indicators")
async def get_wb_indicators(
    countries: str = Query("USA;CHN;RUS;GBR;SAU;IRN;ISR;UKR;IND;TUR",
                           description="Semicolon-separated ISO3 codes"),
    indicators: Optional[str] = Query(None, description="Semicolon-separated WB indicator IDs"),
    years: str = Query("2022:2025", description="Year range"),
) -> dict:
    cache_key = f"wb:{countries}:{indicators}:{years}"
    cached = _cached(cache_key)
    if cached:
        return cached

    country_list = countries.split(";")
    ind_list = indicators.split(";") if indicators else list(WB_INDICATORS.keys())

    all_records = []
    for indicator in ind_list[:10]:  # cap at 10 indicators
        for country in country_list[:25]:  # cap at 25 countries
            try:
                url = WORLD_BANK_URL.format(country=country, indicator=indicator)
                resp = await _client().get(url, params={
                    "format": "json",
                    "per_page": 10,
                    "date": years,
                })
                if resp.status_code == 200:
                    records = parse_wb_response(resp.json())
                    all_records.extend(records)
            except Exception:
                continue

    result = {
        "records":    all_records,
        "total":      len(all_records),
        "indicators": {k: v for k, v in WB_INDICATORS.items() if not indicators or k in ind_list},
        "countries":  country_list,
    }
    _set_cache(cache_key, result)
    return result


# ── IMF forecasts ─────────────────────────────────────────────────────────────

@router.get("/imf")
async def get_imf_forecasts(
    indicator: str = Query("NGDP_RPCH", description="IMF indicator code"),
    year: int = Query(2025, ge=2020, le=2030),
) -> dict:
    cache_key = f"imf:{indicator}:{year}"
    cached = _cached(cache_key)
    if cached:
        return cached

    try:
        url = IMF_DATAMAPPER.format(indicator=indicator, year=year)
        resp = await _client().get(url)
        resp.raise_for_status()
        records = parse_imf_response(resp.json(), indicator)
        result = {
            "records":       records,
            "total":         len(records),
            "indicator":     indicator,
            "indicatorName": IMF_INDICATORS.get(indicator, indicator),
            "year":          year,
        }
        _set_cache(cache_key, result)
        return result
    except Exception as exc:
        return {"error": str(exc), "records": []}


# ── Country profile ───────────────────────────────────────────────────────────

@router.get("/profile/{country_code}")
async def get_country_profile(
    country_code: str,
    years: str = Query("2022:2025"),
) -> dict:
    cache_key = f"profile:{country_code}:{years}"
    cached = _cached(cache_key)
    if cached:
        return cached

    cc = country_code.upper()
    wb_records = []
    imf_records = []

    # Fetch WB data
    for indicator in list(WB_INDICATORS.keys())[:8]:
        try:
            url = WORLD_BANK_URL.format(country=cc, indicator=indicator)
            resp = await _client().get(url, params={
                "format": "json", "per_page": 5, "date": years,
            })
            if resp.status_code == 200:
                wb_records.extend(parse_wb_response(resp.json()))
        except Exception:
            continue

    # Fetch IMF data
    current_year = 2025
    for ind in list(IMF_INDICATORS.keys())[:6]:
        try:
            url = IMF_DATAMAPPER.format(indicator=ind, year=current_year)
            resp = await _client().get(url)
            if resp.status_code == 200:
                imf_records.extend(parse_imf_response(resp.json(), ind))
        except Exception:
            continue

    profile = build_country_profile(wb_records, imf_records, cc)
    _set_cache(cache_key, profile)
    return profile


# ── Full dashboard ────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_macro_dashboard() -> dict:
    cache_key = "macro:dashboard"
    cached = _cached(cache_key)
    if cached:
        return cached

    # FX rates
    fx = {}
    try:
        resp = await _client().get(FRANKFURTER_URL, params={"base": "USD"})
        if resp.status_code == 200:
            fx = parse_fx_rates(resp.json())
    except Exception:
        pass

    # IMF GDP growth for all countries
    gdp_growth = []
    try:
        url = IMF_DATAMAPPER.format(indicator="NGDP_RPCH", year=2025)
        resp = await _client().get(url)
        if resp.status_code == 200:
            gdp_growth = parse_imf_response(resp.json(), "NGDP_RPCH")
            # Filter to key countries
            gdp_growth = [r for r in gdp_growth if r["countryCode"] in KEY_COUNTRIES]
    except Exception:
        pass

    # IMF inflation for key countries
    inflation = []
    try:
        url = IMF_DATAMAPPER.format(indicator="PCPIPCH", year=2025)
        resp = await _client().get(url)
        if resp.status_code == 200:
            inflation = parse_imf_response(resp.json(), "PCPIPCH")
            inflation = [r for r in inflation if r["countryCode"] in KEY_COUNTRIES]
    except Exception:
        pass

    result = {
        "fx":          fx,
        "gdpGrowth":   gdp_growth,
        "inflation":   inflation,
        "crypto":      {},
        "spaceWeather": {},
        "keyCountries": KEY_COUNTRIES,
        "availableIndicators": {
            "worldBank": WB_INDICATORS,
            "imf":       IMF_INDICATORS,
        },
    }

    # Crypto snapshot
    try:
        resp = await _client().get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={
                "ids": "bitcoin,ethereum,solana,ripple,cardano",
                "vs_currencies": "usd",
                "include_24hr_change": "true",
                "include_market_cap": "true",
            },
        )
        if resp.status_code == 200:
            result["crypto"] = resp.json()
    except Exception:
        pass

    # Space weather
    try:
        resp = await _client().get("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json")
        if resp.status_code == 200:
            kp_data = resp.json()
            if kp_data and len(kp_data) > 1:
                latest = kp_data[-1]
                result["spaceWeather"] = {
                    "kpIndex": latest.get("Kp"),
                    "timestamp": latest.get("time_tag"),
                    "stationCount": latest.get("station_count"),
                }
    except Exception:
        pass

    _set_cache(cache_key, result)
    return result


# ── Cryptocurrency markets ────────────────────────────────────────────────────

COINGECKO_PRICE_URL  = "https://api.coingecko.com/api/v3/simple/price"
COINGECKO_GLOBAL_URL = "https://api.coingecko.com/api/v3/global"
COINGECKO_MARKETS_URL = "https://api.coingecko.com/api/v3/coins/markets"


@router.get("/crypto")
async def get_crypto_markets() -> dict:
    cache_key = "crypto:markets"
    cached = _cached(cache_key)
    if cached:
        return cached

    result = {"prices": {}, "global": {}, "top": []}

    # Prices for key assets
    try:
        resp = await _client().get(COINGECKO_PRICE_URL, params={
            "ids": "bitcoin,ethereum,solana,ripple,cardano,dogecoin,polkadot,chainlink,toncoin,avalanche-2",
            "vs_currencies": "usd,eur,gbp",
            "include_24hr_change": "true",
            "include_market_cap": "true",
            "include_24hr_vol": "true",
        })
        if resp.status_code == 200:
            result["prices"] = resp.json()
    except Exception:
        pass

    # Global market stats
    try:
        resp = await _client().get(COINGECKO_GLOBAL_URL)
        if resp.status_code == 200:
            gd = resp.json().get("data", {})
            result["global"] = {
                "totalMarketCap":   gd.get("total_market_cap", {}).get("usd"),
                "totalVolume24h":   gd.get("total_volume", {}).get("usd"),
                "btcDominance":     gd.get("market_cap_percentage", {}).get("btc"),
                "ethDominance":     gd.get("market_cap_percentage", {}).get("eth"),
                "activeCryptos":    gd.get("active_cryptocurrencies"),
                "markets":          gd.get("markets"),
                "marketCapChange24h": gd.get("market_cap_change_percentage_24h_usd"),
            }
    except Exception:
        pass

    # Top 25 by market cap
    try:
        resp = await _client().get(COINGECKO_MARKETS_URL, params={
            "vs_currency": "usd",
            "order": "market_cap_desc",
            "per_page": 25,
            "page": 1,
            "sparkline": "false",
            "price_change_percentage": "24h,7d,30d",
        })
        if resp.status_code == 200:
            result["top"] = resp.json()
    except Exception:
        pass

    _set_cache(cache_key, result)
    return result


# ── Space weather ─────────────────────────────────────────────────────────────

@router.get("/space-weather")
async def get_space_weather() -> dict:
    cache_key = "space:weather"
    cached = _cached(cache_key)
    if cached:
        return cached

    result = {"kpIndex": [], "solarFlares": [], "alerts": [], "solarWind": {}}

    # Kp index (geomagnetic activity)
    try:
        resp = await _client().get("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json")
        if resp.status_code == 200:
            raw = resp.json()
            # Skip header row, get last 24 entries (3-hr intervals = 3 days)
            result["kpIndex"] = raw[-24:] if len(raw) > 24 else raw[1:]
    except Exception:
        pass

    # Solar flares
    try:
        resp = await _client().get("https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json")
        if resp.status_code == 200:
            result["solarFlares"] = resp.json()[:20]
    except Exception:
        pass

    # Space weather alerts
    try:
        resp = await _client().get("https://services.swpc.noaa.gov/products/alerts.json")
        if resp.status_code == 200:
            result["alerts"] = resp.json()[:10]
    except Exception:
        pass

    # Solar wind plasma
    try:
        resp = await _client().get("https://services.swpc.noaa.gov/products/solar-wind/plasma-5-minute.json")
        if resp.status_code == 200:
            raw = resp.json()
            if raw and len(raw) > 2:
                latest = raw[-1]
                result["solarWind"] = {
                    "timestamp":   latest[0] if len(latest) > 0 else None,
                    "density":     float(latest[1]) if len(latest) > 1 and latest[1] else None,
                    "speed":       float(latest[2]) if len(latest) > 2 and latest[2] else None,
                    "temperature": float(latest[3]) if len(latest) > 3 and latest[3] else None,
                }
    except Exception:
        pass

    _set_cache(cache_key, result)
    return result


# ── ISS / Space assets ────────────────────────────────────────────────────────

@router.get("/iss")
async def get_iss_position() -> dict:
    """Real-time ISS position — updates every second, no caching."""
    try:
        resp = await _client().get("http://api.open-notify.org/iss-now.json")
        if resp.status_code == 200:
            data = resp.json()
            pos = data.get("iss_position", {})
            return {
                "lat": float(pos.get("latitude", 0)),
                "lon": float(pos.get("longitude", 0)),
                "timestamp": data.get("timestamp"),
            }
    except Exception as exc:
        return {"error": str(exc)}


# ── Humanitarian data (UN OCHA HDX) ──────────────────────────────────────────

HDX_SEARCH_URL = "https://data.humdata.org/api/3/action/package_search"


@router.get("/humanitarian")
async def get_humanitarian_data(
    query: str = Query("conflict armed", description="Search query"),
    rows: int = Query(20, ge=1, le=50),
) -> dict:
    cache_key = f"hdx:{query}:{rows}"
    cached = _cached(cache_key)
    if cached:
        return cached

    try:
        resp = await _client().get(HDX_SEARCH_URL, params={
            "q": query,
            "rows": rows,
            "sort": "metadata_modified desc",
        })
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("result", {}).get("results", [])
            records = []
            for r in results:
                records.append({
                    "title":    r.get("title"),
                    "org":      r.get("organization", {}).get("title"),
                    "updated":  r.get("metadata_modified"),
                    "country":  [g.get("display_name") for g in r.get("groups", [])],
                    "tags":     [t.get("name") for t in r.get("tags", [])[:5]],
                    "url":      f"https://data.humdata.org/dataset/{r.get('name')}",
                    "resources": len(r.get("resources", [])),
                })
            result = {
                "records": records,
                "total":   data.get("result", {}).get("count", 0),
                "query":   query,
            }
            _set_cache(cache_key, result)
            return result
    except Exception as exc:
        return {"error": str(exc), "records": []}

