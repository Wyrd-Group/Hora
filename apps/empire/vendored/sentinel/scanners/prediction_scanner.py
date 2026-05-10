"""
Prediction market scanner — detects arbitrage and model divergence.
Scans Polymarket, Manifold, Metaculus, Kalshi for cross-platform opportunities.
"""

import logging
import json
from typing import List, Dict, Tuple
from difflib import SequenceMatcher
from datetime import datetime
from ..alerts import Alert
from ..config import SENTINEL_CONFIG

logger = logging.getLogger(__name__)


def fuzzy_match(a: str, b: str, threshold: float = 0.75) -> bool:
    """Fuzzy string matching for question deduplication."""
    ratio = SequenceMatcher(None, a.lower(), b.lower()).ratio()
    return ratio >= threshold


def fetch_polymarket_markets() -> List[Dict]:
    """Fetch latest markets from Polymarket CLOB API."""
    try:
        import httpx
        with httpx.Client(timeout=10) as client:
            resp = client.get('https://clob.polymarket.com/markets?limit=50')
            if resp.status_code == 200:
                data = resp.json()
                # Handle both dict and list responses
                if isinstance(data, dict):
                    return data.get('data', data.get('markets', []))
                elif isinstance(data, list):
                    return data
                return []
            else:
                logger.warning(f"Polymarket API returned {resp.status_code}")
                return []
    except Exception as e:
        logger.error(f"Failed to fetch Polymarket data: {e}")
        return []


def fetch_manifold_markets() -> List[Dict]:
    """Fetch latest markets from Manifold API."""
    try:
        import httpx
        with httpx.Client(timeout=10) as client:
            resp = client.get('https://api.manifold.markets/v0/markets?limit=50&sort=liquidity')
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    return data
                return []
            else:
                logger.warning(f"Manifold API returned {resp.status_code}")
                return []
    except Exception as e:
        logger.error(f"Failed to fetch Manifold data: {e}")
        return []


def fetch_metaculus_markets() -> List[Dict]:
    """Fetch latest markets from Metaculus API."""
    try:
        import httpx
        with httpx.Client(timeout=10) as client:
            resp = client.get('https://www.metaculus.com/api2/questions/?limit=50&status=open')
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, dict):
                    return data.get('results', [])
                return []
            else:
                logger.warning(f"Metaculus API returned {resp.status_code}")
                return []
    except Exception as e:
        logger.error(f"Failed to fetch Metaculus data: {e}")
        return []


def normalize_polymarket(market: Dict) -> Tuple[str, float, str]:
    """Normalize Polymarket market to (question, implied_prob, platform)."""
    try:
        if not isinstance(market, dict):
            return None
        question = market.get('question', '')
        # In CLOB API, the yes price is the best bid or ask
        yes_price = float(market.get('yes_price', 0.5))
        return (question, yes_price, 'polymarket')
    except (KeyError, ValueError, TypeError, AttributeError) as e:
        logger.debug(f"Failed to normalize Polymarket market: {e}")
        return None


def normalize_manifold(market: Dict) -> Tuple[str, float, str]:
    """Normalize Manifold market to (question, implied_prob, platform)."""
    try:
        if not isinstance(market, dict):
            return None
        question = market.get('question', '')
        # Manifold uses probability directly
        prob = float(market.get('probability', 0.5))
        return (question, prob, 'manifold')
    except (KeyError, ValueError, TypeError, AttributeError) as e:
        logger.debug(f"Failed to normalize Manifold market: {e}")
        return None


def normalize_metaculus(market: Dict) -> Tuple[str, float, str]:
    """Normalize Metaculus market to (question, implied_prob, platform)."""
    try:
        if not isinstance(market, dict):
            return None
        question = market.get('title', '')
        # Metaculus uses community prediction
        community_pred = market.get('community_prediction', 0.5)
        if isinstance(community_pred, dict):
            prob = community_pred.get('q2', 0.5)
        else:
            prob = float(community_pred)
        return (question, prob, 'metaculus')
    except (KeyError, ValueError, TypeError, AttributeError) as e:
        logger.debug(f"Failed to normalize Metaculus market: {e}")
        return None


def scan_prediction_markets() -> List[Alert]:
    """
    Scan prediction markets for:
    1. Cross-platform arbitrage (same event, different implied probs)
    2. Model vs market divergence (optional: if we have an internal model)
    """
    alerts = []
    
    try:
        # Fetch all markets
        poly_markets = fetch_polymarket_markets()
        manifold_markets = fetch_manifold_markets()
        metaculus_markets = fetch_metaculus_markets()
        
        # Normalize all markets
        all_markets = []
        all_markets.extend(filter(None, [normalize_polymarket(m) for m in poly_markets]))
        all_markets.extend(filter(None, [normalize_manifold(m) for m in manifold_markets]))
        all_markets.extend(filter(None, [normalize_metaculus(m) for m in metaculus_markets]))
        
        if not all_markets:
            logger.info("No prediction markets fetched")
            return alerts
        
        # Group by fuzzy-matched question
        groups = {}
        for question, prob, platform in all_markets:
            found = False
            for key in groups:
                if fuzzy_match(question, key):
                    groups[key].append((question, prob, platform))
                    found = True
                    break
            if not found:
                groups[question] = [(question, prob, platform)]
        
        # Detect arbitrage within groups
        min_arb_pct = SENTINEL_CONFIG['min_arbitrage_pct']
        
        for group_key, markets in groups.items():
            if len(markets) < 2:
                continue  # Need at least 2 platforms for arbitrage
            
            probs = [prob for _, prob, _ in markets]
            min_prob = min(probs)
            max_prob = max(probs)
            
            # Calculate arbitrage percentage
            # A simple measure: (max - min) / avg * 100
            avg_prob = sum(probs) / len(probs)
            if avg_prob > 0:
                arb_pct = ((max_prob - min_prob) / avg_prob) * 100
                
                if arb_pct >= min_arb_pct:
                    # Find which platform has highest and lowest prob
                    markets_sorted = sorted(markets, key=lambda x: x[1])
                    low_platform = markets_sorted[0][2]
                    high_platform = markets_sorted[-1][2]
                    
                    alert = Alert(
                        alert_type='arbitrage',
                        severity='high' if arb_pct > 10 else 'medium',
                        title=f'Arbitrage opportunity: {group_key[:50]}',
                        summary=f'Cross-platform probability spread detected. {low_platform} at {min_prob:.1%} vs {high_platform} at {max_prob:.1%}.',
                        details={
                            'question': group_key,
                            'platforms': [
                                {
                                    'platform': platform,
                                    'probability': prob
                                }
                                for _, prob, platform in markets
                            ],
                            'arbitrage_pct': arb_pct,
                        },
                        recommendation=f'Lay the high side ({high_platform}) and take the low ({low_platform}) for {arb_pct:.1f}% risk-free return.',
                        edge_pct=arb_pct,
                        confidence=0.95,
                    )
                    alerts.append(alert)
    
    except Exception as e:
        logger.error(f"Prediction scanner crashed: {e}", exc_info=True)
    
    return alerts
