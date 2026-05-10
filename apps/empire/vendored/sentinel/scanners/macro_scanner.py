"""
Macro and earnings scanner.
Fetches real FRED economic indicators and geopolitical news sentiment.
Provides daily digest of macro-moving events.

Wired to: api.fred_feed (FRED economic data), api.news_feed (geopolitical news + FinBERT)
"""

import asyncio
import logging
import os
import sys
from typing import List, Dict

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from ..alerts import Alert
from ..config import SENTINEL_CONFIG

logger = logging.getLogger(__name__)


def _fetch_fred_indicators() -> Dict:
    """
    Fetch key macro indicators from FRED via fred_feed module.
    Returns dict with indicator names and current values.
    """
    try:
        from api.fred_feed import get_macro_dashboard
        loop = asyncio.new_event_loop()
        try:
            dashboard = loop.run_until_complete(get_macro_dashboard())
        finally:
            loop.close()
        return dashboard
    except ImportError:
        logger.warning("fred_feed module not available")
        return {}
    except Exception as e:
        logger.error(f"FRED fetch error: {e}")
        return {}


def _fetch_geopolitical_news() -> Dict:
    """
    Fetch geopolitical news with FinBERT sentiment scoring via news_feed module.
    """
    try:
        from api.news_feed import get_geopolitical_news
        loop = asyncio.new_event_loop()
        try:
            news = loop.run_until_complete(get_geopolitical_news(limit=10))
        finally:
            loop.close()
        return news
    except ImportError:
        logger.warning("news_feed module not available")
        return {}
    except Exception as e:
        logger.error(f"Geopolitical news fetch error: {e}")
        return {}


def _fetch_market_mood() -> Dict:
    """
    Fetch cross-ticker sentiment (market mood) from news_feed module.
    """
    try:
        from api.news_feed import get_market_mood
        # Use a subset of the watchlist for mood
        watchlist = SENTINEL_CONFIG['stock_watchlist'][:6]
        loop = asyncio.new_event_loop()
        try:
            mood = loop.run_until_complete(get_market_mood(watchlist=watchlist, limit_per_ticker=3))
        finally:
            loop.close()
        return mood
    except ImportError:
        logger.warning("news_feed module not available")
        return {}
    except Exception as e:
        logger.error(f"Market mood fetch error: {e}")
        return {}


def _fetch_earnings_calendar() -> List[Dict]:
    """
    Fetch upcoming earnings dates for watchlist via yfinance.
    """
    try:
        import yfinance as yf
        from datetime import datetime, timedelta

        watchlist = SENTINEL_CONFIG['stock_watchlist']
        upcoming = []
        today = datetime.now()
        week_ahead = today + timedelta(days=7)

        for symbol in watchlist:
            try:
                ticker = yf.Ticker(symbol)
                cal = ticker.calendar
                if cal is not None and not cal.empty:
                    # yfinance calendar is a DataFrame with earnings date
                    if hasattr(cal, 'iloc') and len(cal) > 0:
                        earnings_date = cal.iloc[0].get('Earnings Date', None)
                        if earnings_date:
                            upcoming.append({
                                'symbol': symbol,
                                'date': str(earnings_date),
                            })
            except Exception:
                continue

        return upcoming
    except ImportError:
        logger.debug("yfinance not available for earnings calendar")
        return []
    except Exception as e:
        logger.error(f"Earnings calendar error: {e}")
        return []


def scan_macro_events() -> List[Alert]:
    """
    Daily macro scanner combining:
    1. FRED economic indicators (GDP, unemployment, CPI, rates)
    2. Geopolitical news with FinBERT sentiment
    3. Market mood (cross-ticker sentiment)
    4. Upcoming earnings for watchlist
    """
    alerts = []

    try:
        # ── Fetch all data sources ──
        fred_data = _fetch_fred_indicators()
        geo_news = _fetch_geopolitical_news()
        market_mood = _fetch_market_mood()
        earnings = _fetch_earnings_calendar()

        has_data = bool(fred_data) or bool(geo_news.get('articles')) or bool(market_mood) or bool(earnings)

        if not has_data:
            logger.info("No macro/earnings data available")
            return alerts

        # ── Build digest ──
        digest_sections = []

        # FRED indicators
        if fred_data and isinstance(fred_data, dict):
            indicators = fred_data.get('indicators', fred_data)
            if indicators:
                section = "ECONOMIC INDICATORS:"
                for key, val in indicators.items():
                    if isinstance(val, dict):
                        name = val.get('name', key)
                        value = val.get('value', val.get('latest', 'N/A'))
                        section += f"\n  {name}: {value}"
                    else:
                        section += f"\n  {key}: {val}"
                digest_sections.append(section)

        # Geopolitical news sentiment
        geo_articles = geo_news.get('articles', [])
        if geo_articles:
            neg_articles = [a for a in geo_articles
                           if a.get('sentiment', {}).get('label') == 'negative']
            pos_articles = [a for a in geo_articles
                           if a.get('sentiment', {}).get('label') == 'positive']

            section = f"GEOPOLITICAL NEWS ({len(geo_articles)} articles):"
            section += f"\n  Negative sentiment: {len(neg_articles)}"
            section += f"\n  Positive sentiment: {len(pos_articles)}"
            for a in geo_articles[:3]:
                title = (a.get('title') or '')[:80]
                sentiment = a.get('sentiment', {}).get('label', '?')
                section += f"\n  [{sentiment}] {title}"
            digest_sections.append(section)

            # Alert if overwhelmingly negative geo news
            if len(neg_articles) >= 5 and len(neg_articles) > len(pos_articles) * 2:
                alert = Alert(
                    alert_type='macro_event',
                    severity='high',
                    title='Geopolitical risk elevated — negative news dominance',
                    summary=(
                        f'{len(neg_articles)}/{len(geo_articles)} geopolitical headlines '
                        f'scored negative by FinBERT. Consider defensive positioning.'
                    ),
                    details={
                        'negative_count': len(neg_articles),
                        'positive_count': len(pos_articles),
                        'total_articles': len(geo_articles),
                        'top_headlines': [a.get('title', '')[:100] for a in neg_articles[:5]],
                    },
                    recommendation='Review geopolitical risk exposure. Consider hedging or reducing positions.',
                    confidence=0.75,
                )
                alerts.append(alert)

        # Market mood
        if market_mood and market_mood.get('market_mood'):
            mood = market_mood['market_mood']
            mood_index = market_mood.get('market_sentiment_index', 0)
            section = f"MARKET MOOD: {mood.upper()} (index: {mood_index:+.3f})"
            tickers = market_mood.get('tickers', {})
            for sym, data in list(tickers.items())[:6]:
                if isinstance(data, dict):
                    sent = data.get('sentiment', '?')
                    idx = data.get('index', 0)
                    section += f"\n  {sym}: {sent} ({idx:+.3f})"
            digest_sections.append(section)

            # Alert on extreme mood
            if mood in ('bearish',) and mood_index < -0.3:
                alert = Alert(
                    alert_type='macro_event',
                    severity='high',
                    title=f'Market sentiment BEARISH (index: {mood_index:+.3f})',
                    summary='Cross-ticker news sentiment is strongly bearish. Caution advised.',
                    details={
                        'mood': mood,
                        'sentiment_index': mood_index,
                        'tickers_analyzed': market_mood.get('tickers_analyzed', 0),
                    },
                    recommendation='Consider reducing long exposure or adding hedges.',
                    confidence=0.70,
                )
                alerts.append(alert)
            elif mood in ('bullish',) and mood_index > 0.3:
                alert = Alert(
                    alert_type='macro_event',
                    severity='medium',
                    title=f'Market sentiment BULLISH (index: {mood_index:+.3f})',
                    summary='Cross-ticker news sentiment is strongly bullish. Opportunity window.',
                    details={
                        'mood': mood,
                        'sentiment_index': mood_index,
                        'tickers_analyzed': market_mood.get('tickers_analyzed', 0),
                    },
                    recommendation='Consider adding to long positions on watchlist names.',
                    confidence=0.70,
                )
                alerts.append(alert)

        # Earnings calendar
        if earnings:
            section = f"UPCOMING EARNINGS ({len(earnings)}):"
            for e in earnings[:8]:
                section += f"\n  {e['symbol']}: {e['date']}"
            digest_sections.append(section)

        # ── Always produce a daily digest if we have any data ──
        if digest_sections:
            full_digest = '\n\n'.join(digest_sections)
            alert = Alert(
                alert_type='macro_event',
                severity='low',
                title='Daily macro & market digest',
                summary=(
                    f'FRED: {"available" if fred_data else "N/A"}, '
                    f'Geo news: {len(geo_articles)} articles, '
                    f'Mood: {market_mood.get("market_mood", "N/A")}, '
                    f'Earnings: {len(earnings)} upcoming.'
                ),
                details={
                    'digest': full_digest,
                    'fred_available': bool(fred_data),
                    'geo_articles_count': len(geo_articles),
                    'market_mood': market_mood.get('market_mood'),
                    'earnings_count': len(earnings),
                },
                recommendation='Review digest for market-moving events.',
                confidence=0.80,
            )
            alerts.append(alert)

        logger.info(f"Macro scanner: {len(alerts)} alerts generated")

    except Exception as e:
        logger.error(f"Macro scanner crashed: {e}", exc_info=True)

    return alerts
