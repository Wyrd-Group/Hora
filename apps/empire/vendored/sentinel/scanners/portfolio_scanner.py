"""
Portfolio drift scanner.
Monitors portfolio allocation using real market data and alerts when
drift exceeds rebalance threshold.

Wired to: yfinance for live asset returns
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import List, Dict, Optional

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from ..alerts import Alert
from ..config import SENTINEL_CONFIG

logger = logging.getLogger(__name__)

SENTINEL_STATE_FILE = Path(__file__).parent.parent / 'state.json'


def get_asset_returns(symbols: List[str]) -> Dict[str, float]:
    """
    Fetch 3-month returns for assets via yfinance.
    Returns {symbol: return_pct}
    """
    returns = {}
    try:
        import yfinance as yf
        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="3mo")
                if hist.empty or len(hist) < 2:
                    continue
                first = float(hist['Close'].iloc[0])
                last = float(hist['Close'].iloc[-1])
                if first > 0:
                    returns[symbol] = round(((last - first) / first) * 100, 2)
            except Exception as e:
                logger.debug(f"Return fetch failed for {symbol}: {e}")
                continue
    except ImportError:
        logger.warning("yfinance not available for portfolio scanner")
    except Exception as e:
        logger.error(f"Asset returns error: {e}")
    return returns


def get_current_prices(symbols: List[str]) -> Dict[str, float]:
    """Fetch current prices for allocation weighting."""
    prices = {}
    try:
        import yfinance as yf
        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                price = info.get('currentPrice', info.get('regularMarketPrice', 0))
                if price and price > 0:
                    prices[symbol] = float(price)
            except Exception:
                continue
    except ImportError:
        pass
    return prices


def compute_equal_weight_allocation(symbols: List[str]) -> Dict[str, float]:
    """Equal-weight allocation as baseline."""
    if not symbols:
        return {}
    weight = round(100.0 / len(symbols), 2)
    return {s: weight for s in symbols}


def compute_momentum_allocation(symbols: List[str], returns: Dict[str, float]) -> Dict[str, float]:
    """
    Simple momentum tilt: overweight positive-return assets, underweight negative.
    Still sums to 100%.
    """
    if not symbols or not returns:
        return compute_equal_weight_allocation(symbols)

    # Score each asset: base weight + momentum bonus
    base = 100.0 / len(symbols)
    scores = {}
    for s in symbols:
        ret = returns.get(s, 0)
        # Tilt: +/- 20% of base weight based on return
        tilt = min(max(ret / 50, -0.2), 0.2)  # Cap at ±20% tilt
        scores[s] = base * (1 + tilt)

    # Normalize to sum to 100
    total = sum(scores.values())
    if total <= 0:
        return compute_equal_weight_allocation(symbols)

    return {s: round(v / total * 100, 2) for s, v in scores.items()}


def load_last_allocation() -> Optional[Dict[str, float]]:
    """Load last stored allocation from sentinel/state.json."""
    try:
        if SENTINEL_STATE_FILE.exists():
            with open(SENTINEL_STATE_FILE, 'r') as f:
                state = json.load(f)
                return state.get('last_allocation')
    except Exception as e:
        logger.debug(f"Could not load last allocation: {e}")
    return None


def save_allocation(allocation: Dict[str, float]) -> None:
    """Save current allocation to sentinel/state.json."""
    try:
        state = {}
        if SENTINEL_STATE_FILE.exists():
            with open(SENTINEL_STATE_FILE, 'r') as f:
                state = json.load(f)

        state['last_allocation'] = allocation
        SENTINEL_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)

        with open(SENTINEL_STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save allocation: {e}")


def calculate_drift(last: Dict[str, float], current: Dict[str, float]) -> Dict[str, float]:
    """Calculate allocation drift per asset."""
    drift = {}
    all_keys = set(last.keys()) | set(current.keys())
    for symbol in all_keys:
        drift[symbol] = abs(current.get(symbol, 0) - last.get(symbol, 0))
    return drift


def scan_portfolio_drift() -> List[Alert]:
    """
    Monitor portfolio allocation drift using real market returns.
    Alert when any asset drifts >rebalance_drift_pct from last recorded allocation.
    """
    alerts = []

    try:
        watchlist = SENTINEL_CONFIG['stock_watchlist'] + SENTINEL_CONFIG['crypto_watchlist']
        drift_threshold = SENTINEL_CONFIG['rebalance_drift_pct']

        # Get real returns
        returns = get_asset_returns(watchlist)
        if not returns:
            logger.info("No return data available for portfolio scanner")
            return alerts

        # Compute momentum-tilted allocation
        symbols_with_data = [s for s in watchlist if s in returns]
        optimal_alloc = compute_momentum_allocation(symbols_with_data, returns)

        if not optimal_alloc:
            logger.info("No optimal allocation computed")
            return alerts

        # Load last allocation
        last_alloc = load_last_allocation()
        if not last_alloc:
            logger.info("No prior allocation stored, saving current as baseline")
            save_allocation(optimal_alloc)
            return alerts

        # Calculate drift
        drift = calculate_drift(last_alloc, optimal_alloc)
        max_drift = max(drift.values()) if drift else 0
        drifted_assets = {k: round(v, 2) for k, v in drift.items() if v > drift_threshold}

        if drifted_assets:
            # Build rebalance recommendations
            rebal_actions = []
            for sym in drifted_assets:
                old_w = last_alloc.get(sym, 0)
                new_w = optimal_alloc.get(sym, 0)
                direction = "increase" if new_w > old_w else "decrease"
                rebal_actions.append(f"{sym}: {direction} {old_w:.1f}% → {new_w:.1f}%")

            alert = Alert(
                alert_type='portfolio_drift',
                severity='high' if max_drift > 15 else 'medium',
                title=f'Portfolio rebalancing recommended: {max_drift:.1f}% max drift',
                summary=(
                    f'{len(drifted_assets)} assets have drifted >{drift_threshold:.0f}% '
                    f'from target allocation based on 3-month momentum.'
                ),
                details={
                    'drifted_assets': drifted_assets,
                    'max_drift_pct': round(max_drift, 2),
                    'optimal_allocation': optimal_alloc,
                    'last_allocation': last_alloc,
                    'asset_returns_3mo': {s: returns.get(s) for s in drifted_assets},
                    'rebalance_actions': rebal_actions,
                },
                recommendation=f'Rebalance: {"; ".join(rebal_actions[:5])}',
                confidence=0.85,
            )
            alerts.append(alert)

            # Update stored allocation
            save_allocation(optimal_alloc)
        else:
            logger.info(f"Portfolio within drift tolerance (max drift: {max_drift:.1f}%)")

        logger.info(f"Portfolio scanner: {len(symbols_with_data)} assets, max drift {max_drift:.1f}%, {len(alerts)} alerts")

    except Exception as e:
        logger.error(f"Portfolio scanner crashed: {e}", exc_info=True)

    return alerts
