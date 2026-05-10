"""
Sports betting value scanner.
Fetches live odds from The Odds API (via data_feeds), compares implied probs
across bookmakers, and alerts on positive expected value bets.

Wired to: api.data_feeds.get_odds(), api.data_feeds.find_value_bets()
"""

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from typing import List, Dict, Optional

# Add project root to path so we can import api modules
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from ..alerts import Alert
from ..config import SENTINEL_CONFIG

logger = logging.getLogger(__name__)

# ── Match Window Scheduling ─────────────────────────────────────────────────
# Only poll odds during pre-match windows when line movements create pricing
# discrepancies. Outside these windows, polling wastes API quota.
# days: 0=Monday, 6=Sunday. Times in UTC hour integers.
# End times past midnight wrap to next day.
MATCH_WINDOWS_UTC = {
    "EPL":     {"days": [5, 6], "start": 6,  "end": 20},
    "NBA":     {"days": [0, 1, 2, 3, 4, 5, 6], "start": 17, "end": 4},
    "La_Liga": {"days": [5, 6], "start": 13, "end": 22},
    "MLB":     {"days": [0, 1, 2, 3, 4, 5, 6], "start": 16, "end": 1},
    "NHL":     {"days": [0, 1, 2, 3, 4, 5, 6], "start": 17, "end": 2},
}


def is_active_window() -> bool:
    """
    Check if ANY league is currently in its active pre-match window.
    Returns True if at least one league's window is open.
    """
    now = datetime.now(timezone.utc)
    current_day = now.weekday()  # 0=Monday, 6=Sunday
    current_hour = now.hour

    for league, window in MATCH_WINDOWS_UTC.items():
        if current_day not in window["days"]:
            continue

        start = window["start"]
        end = window["end"]

        if start < end:
            # Normal window (e.g., 6–20)
            if start <= current_hour < end:
                return True
        else:
            # Wraps past midnight (e.g., 17–4 means 17:00 to 04:00 next day)
            if current_hour >= start or current_hour < end:
                return True

    return False


def kelly_criterion(prob: float, odds: float, bankroll: float) -> float:
    """
    Calculate Kelly criterion stake.
    bet_size = (prob * odds - (1 - prob)) / (odds - 1)
    Cap at max_kelly_pct from config.
    """
    if odds <= 1 or prob <= 0 or prob >= 1:
        return 0

    edge = prob * odds - (1 - prob)
    if edge <= 0:
        return 0

    bet_frac = edge / (odds - 1)
    bet_pct = bet_frac * 100

    max_kelly = SENTINEL_CONFIG['max_kelly_pct']
    capped_pct = min(bet_pct, max_kelly)

    return max(0, (capped_pct / 100) * bankroll)


def implied_probability(odds: float) -> float:
    """Convert decimal odds to implied probability."""
    if odds <= 1:
        return 1.0
    return 1.0 / odds


def _fetch_value_bets_sync() -> List[Dict]:
    """
    Call data_feeds.find_value_bets() for each configured league.
    Returns flat list of value bet dicts.
    """
    try:
        from api.data_feeds import find_value_bets, get_odds
    except ImportError as e:
        logger.error(f"Cannot import data_feeds: {e}")
        return []

    leagues = SENTINEL_CONFIG.get('sports_leagues', [])
    # Map config names to data_feeds league keys
    league_key_map = {
        'EPL': 'epl',
        'La Liga': 'laliga',
        'Serie A': 'seriea',
        'Bundesliga': 'bundesliga',
        'Champions League': 'champions-league',
        'NBA': 'nba',
        'NFL': 'nfl',
        'MLB': 'mlb',
        'NHL': 'nhl',
        'MLS': 'mls',
    }

    all_bets = []
    all_odds = []

    loop = asyncio.new_event_loop()
    try:
        for league_name in leagues:
            key = league_key_map.get(league_name, league_name.lower())
            try:
                # Fetch value bets (cross-bookmaker edge detection)
                bets = loop.run_until_complete(
                    find_value_bets(key, min_edge=SENTINEL_CONFIG['min_edge_pct'] / 100)
                )
                for b in bets:
                    b['league'] = league_name
                all_bets.extend(bets)
            except Exception as e:
                logger.warning(f"Value bet scan failed for {league_name}: {e}")

            try:
                # Also fetch raw odds for additional analysis
                odds_data = loop.run_until_complete(get_odds(key))
                if odds_data.get('events'):
                    for ev in odds_data['events']:
                        ev['league'] = league_name
                    all_odds.extend(odds_data['events'])
            except Exception as e:
                logger.warning(f"Odds fetch failed for {league_name}: {e}")
    finally:
        loop.close()

    return all_bets, all_odds


def scan_sports_value_bets() -> List[Alert]:
    """
    Scan sports odds for value bets using live Odds API data:
    1. find_value_bets() — cross-bookmaker edge detection
    2. Raw odds analysis — implied probability comparison

    Only runs during active pre-match windows to conserve API quota.
    """
    # P6: Check if any league is in its active pre-match window
    if not is_active_window():
        logger.info("Sports scanner idle — no active pre-match window")
        return []

    alerts = []

    try:
        value_bets, raw_odds = _fetch_value_bets_sync()

        bankroll = SENTINEL_CONFIG['bankroll_eur']
        min_edge = SENTINEL_CONFIG['min_edge_pct']
        min_odds = SENTINEL_CONFIG.get('min_odds', 1.40)
        max_odds = SENTINEL_CONFIG.get('max_odds', 8.00)

        # ── Process value bets from cross-bookmaker comparison ──
        for bet in value_bets:
            try:
                edge_pct = bet.get('edge', 0)
                best_odds = bet.get('best_odds', 0)
                outcome = bet.get('outcome', '?')
                match = bet.get('match', '?')
                bookmaker = bet.get('bookmaker', '?')
                league = bet.get('league', '?')

                # Filter by odds range
                if best_odds < min_odds or best_odds > max_odds:
                    continue

                # Filter by minimum edge
                if edge_pct < min_edge:
                    continue

                # Calculate Kelly stake
                fair_prob = bet.get('avg_implied_prob', 50) / 100
                stake = kelly_criterion(fair_prob, best_odds, bankroll)

                if stake <= 0:
                    continue

                alert = Alert(
                    alert_type='value_bet',
                    severity='high' if edge_pct > 15 else 'medium',
                    title=f'{league}: {match} — {outcome}',
                    summary=(
                        f'{outcome} at {best_odds:.2f} ({bookmaker}) has '
                        f'{edge_pct:.1f}% edge vs market average.'
                    ),
                    details={
                        'league': league,
                        'match': match,
                        'outcome': outcome,
                        'best_odds': best_odds,
                        'bookmaker': bookmaker,
                        'edge_pct': edge_pct,
                        'avg_implied_prob': bet.get('avg_implied_prob'),
                        'commence': bet.get('commence'),
                    },
                    recommendation=f'Bet €{stake:.0f} on {outcome} at {best_odds:.2f} ({bookmaker})',
                    stake_eur=stake,
                    edge_pct=edge_pct,
                    confidence=min(0.5 + edge_pct / 100, 0.95),
                )
                alerts.append(alert)

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Failed to process value bet: {e}")
                continue

        # ── Supplementary: flag lopsided odds from raw data ──
        for ev in raw_odds:
            try:
                odds = ev.get('odds', {})
                if not odds or len(odds) < 2:
                    continue

                home = ev.get('home', '?')
                away = ev.get('away', '?')
                league = ev.get('league', '?')

                # Check for significant odds discrepancy between outcomes
                prices = {name: info['price'] for name, info in odds.items()
                          if isinstance(info, dict) and 'price' in info}

                if len(prices) < 2:
                    continue

                # Calculate total implied probability (should be ~105-115% for bookmaker margin)
                total_implied = sum(1/p for p in prices.values())

                # If total implied is below 100%, that's a guaranteed arbitrage
                if total_implied < 1.0:
                    arb_pct = (1.0 - total_implied) * 100
                    alert = Alert(
                        alert_type='arbitrage',
                        severity='critical',
                        title=f'{league}: {home} vs {away} — ARBITRAGE',
                        summary=f'Total implied probability {total_implied:.1%} — guaranteed {arb_pct:.1f}% return.',
                        details={
                            'league': league,
                            'home': home,
                            'away': away,
                            'odds': prices,
                            'total_implied': total_implied,
                            'arbitrage_pct': arb_pct,
                        },
                        recommendation=f'Back all outcomes proportionally for {arb_pct:.1f}% risk-free return.',
                        edge_pct=arb_pct,
                        confidence=0.99,
                    )
                    alerts.append(alert)

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Failed to process raw odds: {e}")
                continue

        if not value_bets and not raw_odds:
            logger.info("No sports data available (check ODDS_API_KEY)")
        else:
            logger.info(f"Sports scanner: {len(value_bets)} value bets, {len(raw_odds)} events analyzed, {len(alerts)} alerts")

    except Exception as e:
        logger.error(f"Sports scanner crashed: {e}", exc_info=True)

    return alerts
