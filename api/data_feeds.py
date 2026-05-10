"""
Live Data Feeds for Quadratic API.

Provides real market data, sports odds, and scores from free APIs:
  - yfinance: Stock OHLCV, price history (no key needed)
  - The Odds API: Sports betting odds (free tier, 500 req/month)
  - ESPN: Live scores (free, no key needed)
"""

import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import httpx
import yfinance as yf

log = logging.getLogger("quadratic.feeds")

# ── Config ───────────────────────────────────────────────────────────────────
ODDS_API_KEY = os.environ.get("ODDS_API_KEY", "")
ODDS_BASE = "https://api.the-odds-api.com/v4"

# League mapping for Odds API sport keys
LEAGUE_MAP = {
    "epl": "soccer_epl",
    "laliga": "soccer_spain_la_liga",
    "seriea": "soccer_italy_serie_a",
    "bundesliga": "soccer_germany_bundesliga",
    "champions-league": "soccer_uefa_champs_league",
    "nba": "basketball_nba",
    "nfl": "americanfootball_nfl",
    "mlb": "baseball_mlb",
    "nhl": "icehockey_nhl",
    "mls": "soccer_usa_mls",
}

# ESPN API sport/league mapping
ESPN_MAP = {
    "epl": ("soccer", "eng.1"),
    "laliga": ("soccer", "esp.1"),
    "seriea": ("soccer", "ita.1"),
    "bundesliga": ("soccer", "ger.1"),
    "champions-league": ("soccer", "uefa.champions"),
    "nba": ("basketball", "nba"),
    "nfl": ("football", "nfl"),
    "mlb": ("baseball", "mlb"),
    "nhl": ("hockey", "nhl"),
}


# ── Stock Market Data (yfinance) ─────────────────────────────────────────────

def get_ohlcv(symbol: str, period: str = "3mo", interval: str = "1d") -> Dict:
    """Fetch real OHLCV data for a stock symbol."""
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval)
        if df.empty:
            return {"symbol": symbol, "error": f"No data for {symbol}"}

        return {
            "symbol": symbol.upper(),
            "period": period,
            "interval": interval,
            "count": len(df),
            "last_price": round(float(df["Close"].iloc[-1]), 2),
            "ohlcv": {
                "dates": [d.strftime("%Y-%m-%d") for d in df.index],
                "opens": [round(float(v), 2) for v in df["Open"]],
                "highs": [round(float(v), 2) for v in df["High"]],
                "lows": [round(float(v), 2) for v in df["Low"]],
                "closes": [round(float(v), 2) for v in df["Close"]],
                "volumes": [int(v) for v in df["Volume"]],
            },
        }
    except Exception as e:
        log.error(f"yfinance error for {symbol}: {e}")
        return {"symbol": symbol, "error": str(e)}


def get_price_history(symbol: str, days: int = 60) -> List[float]:
    """Get closing price history for forecasting input."""
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=f"{days}d")
        if df.empty:
            return []
        return [round(float(v), 2) for v in df["Close"]]
    except Exception as e:
        log.error(f"Price history error for {symbol}: {e}")
        return []


def get_stock_info(symbol: str) -> Dict:
    """Get basic stock info (name, sector, market cap)."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        return {
            "symbol": symbol.upper(),
            "name": info.get("shortName", symbol),
            "sector": info.get("sector", "N/A"),
            "market_cap": info.get("marketCap", 0),
            "current_price": info.get("currentPrice", info.get("regularMarketPrice", 0)),
            "pe_ratio": info.get("trailingPE", None),
            "52w_high": info.get("fiftyTwoWeekHigh", None),
            "52w_low": info.get("fiftyTwoWeekLow", None),
        }
    except Exception as e:
        log.error(f"Stock info error for {symbol}: {e}")
        return {"symbol": symbol, "error": str(e)}


# ── Sports Odds (The Odds API) ───────────────────────────────────────────────

async def get_odds(league: str, markets: str = "h2h") -> Dict:
    """Fetch live betting odds for a league."""
    sport_key = LEAGUE_MAP.get(league.lower())
    if not sport_key:
        return {"league": league, "error": f"Unknown league: {league}", "events": []}

    if not ODDS_API_KEY:
        return {"league": league, "error": "ODDS_API_KEY not set. Get a free key at https://the-odds-api.com", "events": []}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{ODDS_BASE}/sports/{sport_key}/odds",
                params={
                    "apiKey": ODDS_API_KEY,
                    "regions": "eu",
                    "markets": markets,
                    "oddsFormat": "decimal",
                },
            )
            if resp.status_code == 401:
                log.warning(f"Odds API 401 for {league} — invalid API key")
                return {"league": league, "error": "Invalid API key (401)", "events": []}
            if resp.status_code == 429:
                log.warning(f"Odds API rate-limited for {league}")
                return {"league": league, "error": "Rate limited — try again later (429)", "events": []}
            if resp.status_code == 422:
                log.warning(f"Odds API 422 for {league} — sport may be out of season")
                return {"league": league, "error": f"No events available for {league} (422)", "events": []}
            resp.raise_for_status()
            events = resp.json()

        results = []
        for ev in events[:20]:  # cap at 20 events
            bookmakers = ev.get("bookmakers", [])
            best_odds = _extract_best_odds(bookmakers, markets)
            results.append({
                "id": ev.get("id"),
                "home": ev.get("home_team"),
                "away": ev.get("away_team"),
                "commence": ev.get("commence_time"),
                "bookmaker_count": len(bookmakers),
                "odds": best_odds,
            })

        remaining = resp.headers.get("x-requests-remaining", "?")
        return {
            "league": league,
            "sport_key": sport_key,
            "events": results,
            "count": len(results),
            "api_requests_remaining": remaining,
        }
    except httpx.TimeoutException:
        log.warning(f"Odds API timeout for {league}")
        return {"league": league, "error": "Request timed out", "events": []}
    except Exception as e:
        log.error(f"Odds API error for {league}: {e}")
        return {"league": league, "error": str(e), "events": []}


def _extract_best_odds(bookmakers: List, market_key: str = "h2h") -> Dict:
    """Extract best available odds across bookmakers."""
    best = {}
    for bm in bookmakers:
        for mkt in bm.get("markets", []):
            if mkt.get("key") == market_key:
                for outcome in mkt.get("outcomes", []):
                    name = outcome["name"]
                    price = outcome["price"]
                    if name not in best or price > best[name]["price"]:
                        best[name] = {
                            "price": price,
                            "bookmaker": bm["title"],
                        }
    return best


async def find_value_bets(league: str, min_edge: float = 0.05) -> List[Dict]:
    """Find value bets where implied probability diverges across books."""
    sport_key = LEAGUE_MAP.get(league.lower())
    if not sport_key or not ODDS_API_KEY:
        return []

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{ODDS_BASE}/sports/{sport_key}/odds",
                params={
                    "apiKey": ODDS_API_KEY,
                    "regions": "eu",
                    "markets": "h2h",
                    "oddsFormat": "decimal",
                },
            )
            if resp.status_code in (401, 403, 422, 429):
                log.warning(f"Odds API {resp.status_code} in value_bets for {league}")
                return []
            resp.raise_for_status()
            events = resp.json()

        value_bets = []
        for ev in events:
            bookmakers = ev.get("bookmakers", [])
            if len(bookmakers) < 2:
                continue

            # Collect all odds per outcome
            outcome_odds = {}
            for bm in bookmakers:
                for mkt in bm.get("markets", []):
                    if mkt["key"] == "h2h":
                        for out in mkt["outcomes"]:
                            name = out["name"]
                            if name not in outcome_odds:
                                outcome_odds[name] = []
                            outcome_odds[name].append({
                                "price": out["price"],
                                "book": bm["title"],
                            })

            # Find edges: best odds vs average implied prob
            for name, odds_list in outcome_odds.items():
                prices = [o["price"] for o in odds_list]
                best = max(odds_list, key=lambda x: x["price"])
                avg_implied = sum(1/p for p in prices) / len(prices)
                best_implied = 1 / best["price"]
                edge = avg_implied - best_implied

                if edge >= min_edge:
                    value_bets.append({
                        "match": f"{ev['home_team']} vs {ev['away_team']}",
                        "outcome": name,
                        "best_odds": best["price"],
                        "bookmaker": best["book"],
                        "edge": round(edge * 100, 1),
                        "avg_implied_prob": round(avg_implied * 100, 1),
                        "commence": ev.get("commence_time"),
                    })

        value_bets.sort(key=lambda x: x["edge"], reverse=True)
        return value_bets[:10]

    except Exception as e:
        log.error(f"Value bet scan error: {e}")
        return []


# ── Live Scores (ESPN API) ───────────────────────────────────────────────────

async def get_live_scores(league: str) -> Dict:
    """Fetch live/recent scores from ESPN."""
    espn = ESPN_MAP.get(league.lower())
    if not espn:
        return {"league": league, "error": f"Unknown league: {league}", "games": []}

    sport, league_id = espn
    url = f"https://site.api.espn.com/apis/site/v2/sports/{sport}/{league_id}/scoreboard"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            if resp.status_code == 404:
                log.warning(f"ESPN 404 for {league} — league may be off-season")
                return {"league": league, "error": f"No scoreboard data for {league}", "games": []}
            resp.raise_for_status()
            data = resp.json()

        games = []
        for ev in data.get("events", [])[:15]:
            comp = ev.get("competitions", [{}])[0]
            teams = comp.get("competitors", [])
            if len(teams) < 2:
                continue

            home = next((t for t in teams if t.get("homeAway") == "home"), teams[0])
            away = next((t for t in teams if t.get("homeAway") == "away"), teams[1])

            games.append({
                "home": home.get("team", {}).get("displayName", "?"),
                "away": away.get("team", {}).get("displayName", "?"),
                "score": f"{home.get('score', '?')}-{away.get('score', '?')}",
                "status": comp.get("status", {}).get("type", {}).get("shortDetail", "?"),
                "clock": comp.get("status", {}).get("displayClock", ""),
                "venue": comp.get("venue", {}).get("fullName", ""),
                "date": ev.get("date", ""),
            })

        return {
            "league": league,
            "sport": sport,
            "games": games,
            "count": len(games),
            "season": data.get("season", {}).get("year", ""),
        }
    except Exception as e:
        log.error(f"ESPN scores error for {league}: {e}")
        return {"league": league, "error": str(e), "games": []}
