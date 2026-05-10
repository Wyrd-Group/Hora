"""
Forecast breakout scanner.
Runs Monte Carlo forecasting on watchlist assets using real price data
and alerts when forecast significantly diverges from current price.

Wired to: api.data_feeds (yfinance) for live prices
"""

import logging
import math
import os
import sys
from typing import List, Dict, Optional

import numpy as np

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from ..alerts import Alert
from ..config import SENTINEL_CONFIG

logger = logging.getLogger(__name__)

# ── Per-Asset Sigma Multipliers ─────────────────────────────────────────────
# Calibrated 2026-04-04: individual band coverage targets ~80%.
# Low-coverage assets (AAPL 56%) get wider bands; high-coverage (ETH 84%) stay tight.
SIGMA_MULTIPLIERS = {
    "AAPL":   1.45,
    "COIN":   1.30,
    "PLTR":   1.25,
    "SHOP":   1.25,
    "META":   1.20,
    "NVDA":   1.20,
    "AMZN":   1.15,
    "AMD":    1.15,
    "UBER":   1.15,
    "TSLA":   1.15,
    "GOOGL":  1.10,
    "MSFT":   1.05,
    "SOL":    1.10,
    "BTC":    1.05,
    "ETH":    1.00,
}
DEFAULT_SIGMA_MULTIPLIER = 1.15

# ── VIX Regime Override ─────────────────────────────────────────────────────
# When VIX is elevated, ALL assets get an additional multiplier on top of their
# per-asset base. This catches regime shifts the per-asset calibration misses.
VIX_THRESHOLDS = {
    35: 1.60,   # Panic: widen bands 60% more
    25: 1.30,   # Elevated stress: widen bands 30% more
}


# ── Signal Exclusions ───────────────────────────────────────────────────────
# Assets where the model is anti-predictive. Still run MC forecast (show bands),
# but suppress the directional signal label entirely.
EXCLUDED_FROM_SIGNALS = ["AMD"]
EXCLUDE_REASON = {
    "AMD": "Model anti-predictive (28% accuracy < 50% baseline)",
}


# ── Naive Baseline Comparison ───────────────────────────────────────────────
# Track observed prices so we can compare model MAPE vs "predict no change".
import json
from datetime import date

_PRICE_HISTORY_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'price_history.json')
_MAX_HISTORY_PER_ASSET = 30


def _load_price_history() -> Dict:
    """Load observed price history from disk."""
    try:
        with open(_PRICE_HISTORY_PATH, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_price_history(history: Dict):
    """Persist price history to disk."""
    try:
        os.makedirs(os.path.dirname(_PRICE_HISTORY_PATH), exist_ok=True)
        with open(_PRICE_HISTORY_PATH, 'w') as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save price history: {e}")


def record_price(symbol: str, price: float):
    """Append today's observed price for an asset. Keep last 30 entries."""
    history = _load_price_history()
    today = date.today().isoformat()

    if symbol not in history:
        history[symbol] = []

    entries = history[symbol]

    # Don't duplicate today's entry
    if entries and entries[-1].get("date") == today:
        entries[-1]["price"] = price
    else:
        entries.append({"date": today, "price": price})

    # Cap at max entries
    if len(entries) > _MAX_HISTORY_PER_ASSET:
        history[symbol] = entries[-_MAX_HISTORY_PER_ASSET:]

    _save_price_history(history)


def compute_naive_baseline(symbol: str, actual_price: float) -> Optional[Dict]:
    """
    Compute naive MAPE (predict no change from 10 observations ago).
    Returns {naive_mape, model_edge, price_10_ago} or None if insufficient data.
    """
    history = _load_price_history()
    entries = history.get(symbol, [])

    if len(entries) < 10:
        needed = 10 - len(entries)
        logger.info(f"Insufficient history for naive baseline on {symbol} — need {needed} more observations")
        return None

    price_10_ago = entries[-10]["price"]
    naive_mape = abs(price_10_ago - actual_price) / actual_price * 100

    return {
        "naive_mape": round(naive_mape, 2),
        "price_10_ago": round(price_10_ago, 2),
        "date_10_ago": entries[-10]["date"],
        "observations": len(entries),
    }


# ── Per-Asset Accuracy Weights ──────────────────────────────────────────────
HISTORICAL_ACCURACY = {
    "MSFT":  0.76,
    "GOOGL": 0.64,
    "UBER":  0.64,
    "COIN":  0.64,
    "TSLA":  0.60,
    "ETH":   0.578,
    "BTC":   0.556,
    "SOL":   0.489,
    "SHOP":  0.52,
    "PLTR":  0.48,
    "NVDA":  0.44,
    "AAPL":  0.44,
    "META":  0.44,
    "AMZN":  0.44,
    "AMD":   0.28,
}


def get_confidence_weight(symbol: str) -> float:
    """
    Compute confidence weight from historical accuracy.
    confidence_weight = max(0, (accuracy - 0.50) / 0.50)
    """
    lookup = symbol.replace("-USD", "")
    accuracy = HISTORICAL_ACCURACY.get(lookup)
    if accuracy is None:
        return 0.5  # Unknown asset: neutral confidence
    return max(0, (accuracy - 0.50) / 0.50)


def _get_current_vix() -> Optional[float]:
    """Fetch current VIX from FRED via fred_feed.py. Returns None on failure."""
    try:
        import asyncio
        from api.fred_feed import get_series
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(get_series("VIXCLS", limit=1))
        finally:
            loop.close()
        latest = result.get("latest", {})
        val = latest.get("value")
        if val is not None:
            return float(val)
    except Exception as e:
        logger.debug(f"VIX fetch failed: {e}")
    return None


def get_sigma_multiplier(symbol: str) -> float:
    """
    Compute the final sigma multiplier for an asset.

    1. Look up per-asset base multiplier (or DEFAULT_SIGMA_MULTIPLIER).
    2. If VIX > 25: apply additional VIX regime multiplier on top.
    3. Log which multipliers were applied.
    """
    # Normalize symbol: strip -USD suffix for crypto lookups
    lookup = symbol.replace("-USD", "")
    base = SIGMA_MULTIPLIERS.get(lookup, DEFAULT_SIGMA_MULTIPLIER)

    # VIX regime check
    vix = _get_current_vix()
    vix_mult = 1.0
    if vix is not None:
        for threshold in sorted(VIX_THRESHOLDS.keys(), reverse=True):
            if vix > threshold:
                vix_mult = VIX_THRESHOLDS[threshold]
                break

    final = base * vix_mult

    if vix_mult > 1.0:
        logger.info(f"{symbol}: sigma_mult={base:.2f} × VIX_mult={vix_mult:.2f} (VIX={vix:.1f}) → {final:.2f}")
    else:
        logger.info(f"{symbol}: sigma_mult={final:.2f}" + (f" (VIX={vix:.1f}, normal)" if vix else " (VIX unavailable)"))

    return final


def get_current_price(symbol: str) -> Optional[float]:
    """Fetch current price via yfinance."""
    try:
        from api.data_feeds import get_stock_info
        info = get_stock_info(symbol)
        price = info.get('current_price', 0)
        if price and price > 0:
            return float(price)
        return None
    except Exception as e:
        logger.debug(f"Price fetch failed for {symbol}: {e}")
        return None


def get_price_history(symbol: str, days: int = 90) -> List[float]:
    """Fetch closing price history via yfinance."""
    try:
        from api.data_feeds import get_price_history as _get_history
        prices = _get_history(symbol, days=days)
        return prices if prices else []
    except Exception as e:
        logger.debug(f"Price history failed for {symbol}: {e}")
        return []


def monte_carlo_forecast(prices: List[float], horizon: int = 10, n_sims: int = 200, vol_scale: float = None, symbol: str = None) -> Optional[Dict]:
    """
    Log-normal Monte Carlo forecast.
    Returns {median, lower_bound, upper_bound, mu, sigma_raw, sigma_daily, vol_scale, method}

    vol_scale: multiplier on historical sigma to widen confidence bands.
               If None and symbol is provided, uses per-asset multiplier + VIX regime.
               Otherwise falls back to DEFAULT_SIGMA_MULTIPLIER.
    """
    if len(prices) < 10:
        return None

    arr = np.array(prices, dtype=float)
    log_returns = np.diff(np.log(arr))

    mu = float(np.mean(log_returns))
    sigma_raw = float(np.std(log_returns))

    if sigma_raw == 0:
        return None

    # Apply per-asset + VIX regime volatility scaling BEFORE generating paths
    if vol_scale is None:
        if symbol:
            vol_scale = get_sigma_multiplier(symbol)
        else:
            vol_scale = DEFAULT_SIGMA_MULTIPLIER
    sigma = sigma_raw * vol_scale

    last_price = float(arr[-1])

    # Simulate paths
    rng = np.random.default_rng()
    sims = np.zeros((n_sims, horizon))
    for i in range(n_sims):
        price = last_price
        for t in range(horizon):
            shock = rng.normal(mu, sigma)
            price *= math.exp(shock)
            sims[i, t] = price

    median = float(np.median(sims[:, -1]))
    lower = float(np.percentile(sims[:, -1], 10))
    upper = float(np.percentile(sims[:, -1], 90))

    return {
        'median': round(median, 2),
        'lower_bound': round(lower, 2),
        'upper_bound': round(upper, 2),
        'mu_daily': round(mu, 6),
        'sigma_raw': round(sigma_raw, 6),
        'sigma_daily': round(sigma, 6),
        'vol_scale': round(vol_scale, 2),
        'method': 'monte_carlo_lognormal',
    }


def scan_forecast_breakout() -> List[Alert]:
    """
    Scan stock and crypto watchlists for forecast breakouts.
    Alert when forecast median is >forecast_breakout_pct above/below current price.
    """
    alerts = []

    try:
        watchlist = SENTINEL_CONFIG['stock_watchlist'] + SENTINEL_CONFIG['crypto_watchlist']
        breakout_threshold = SENTINEL_CONFIG['forecast_breakout_pct']
        exclusions = set(SENTINEL_CONFIG.get('forecast_exclusions', []))

        # Build set of signal-excluded assets (separate from forecast-excluded)
        signal_exclusions = set(EXCLUDED_FROM_SIGNALS)

        for symbol in watchlist:
            if symbol in exclusions:
                logger.info(f"Skipping {symbol}: in forecast_exclusions (anti-predictive)")
                continue
            try:
                current_price = get_current_price(symbol)
                if current_price is None:
                    logger.debug(f"Skipping {symbol}: no price data")
                    continue

                # P4: Record observed price for naive baseline tracking
                record_price(symbol, current_price)

                prices = get_price_history(symbol, days=90)
                if len(prices) < 15:
                    logger.debug(f"Skipping {symbol}: insufficient history ({len(prices)} days)")
                    continue

                forecast = monte_carlo_forecast(prices, horizon=10, n_sims=200, symbol=symbol)
                if not forecast:
                    continue

                forecast_price = forecast['median']
                pct_change = ((forecast_price - current_price) / current_price) * 100

                # P4: Compute naive baseline comparison
                naive = compute_naive_baseline(symbol, current_price)

                # P5: Compute model confidence weight
                conf_weight = get_confidence_weight(symbol)
                lookup_sym = symbol.replace("-USD", "")
                hist_acc = HISTORICAL_ACCURACY.get(lookup_sym)

                # Build shared details dict with P4 + P5 fields
                base_details = {
                    'symbol': symbol,
                    'current_price': current_price,
                    'forecast_price': forecast_price,
                    'pct_change': round(pct_change, 2),
                    'lower_bound': forecast['lower_bound'],
                    'upper_bound': forecast['upper_bound'],
                    'mu_daily': forecast['mu_daily'],
                    'sigma_raw': forecast.get('sigma_raw'),
                    'sigma_daily': forecast['sigma_daily'],
                    'vol_scale': forecast.get('vol_scale'),
                    'method': forecast['method'],
                    # P5: accuracy weight
                    'historical_accuracy': hist_acc,
                    'confidence_weight': round(conf_weight, 3),
                    'model_confidence_pct': round(conf_weight * 100, 1),
                }

                # P4: add naive baseline fields if available
                if naive:
                    model_mape = abs(pct_change)
                    model_edge_vs_naive = naive['naive_mape'] - model_mape
                    base_details['naive_mape'] = naive['naive_mape']
                    base_details['model_mape'] = round(model_mape, 2)
                    base_details['model_edge_vs_naive'] = round(model_edge_vs_naive, 2)
                    base_details['naive_price_10_ago'] = naive['price_10_ago']
                    base_details['naive_date_10_ago'] = naive['date_10_ago']
                    naive_summary = (f' Model MAPE: {model_mape:.1f}% | '
                                     f'Naive MAPE: {naive["naive_mape"]:.1f}% | '
                                     f'Model edge: {model_edge_vs_naive:+.1f}%')
                else:
                    naive_summary = ''

                conf_summary = f' Model confidence: {conf_weight * 100:.0f}%'

                # Check if this asset's signal should be suppressed
                if symbol in signal_exclusions:
                    reason = EXCLUDE_REASON.get(symbol, "Anti-predictive")
                    logger.info(f"{symbol}: SIGNAL SUPPRESSED — {reason}. "
                                f"Forecast: ${forecast_price:.2f} ({pct_change:+.1f}%), "
                                f"bands: ${forecast['lower_bound']:.2f}–${forecast['upper_bound']:.2f}")
                    if abs(pct_change) >= breakout_threshold:
                        alert = Alert(
                            alert_type='forecast_breakout',
                            severity='low',
                            title=f'{symbol} SIGNAL SUPPRESSED — {reason}',
                            summary=(
                                f'10-day MC forecast: ${forecast_price:.2f} '
                                f'(now ${current_price:.2f}). {pct_change:+.1f}%. '
                                f'Range: ${forecast["lower_bound"]:.2f}\u2013${forecast["upper_bound"]:.2f}. '
                                f'SIGNAL SUPPRESSED — {reason}.{naive_summary}{conf_summary}'
                            ),
                            details={
                                **base_details,
                                'signal_suppressed': True,
                                'suppress_reason': reason,
                            },
                            recommendation=f'SIGNAL SUPPRESSED — {reason}. No action recommended.',
                            edge_pct=0,
                            confidence=0,
                        )
                        alerts.append(alert)
                    continue

                if abs(pct_change) >= breakout_threshold:
                    direction = 'UP' if pct_change > 0 else 'DOWN'
                    severity = 'high' if abs(pct_change) > 15 else 'medium'

                    alert = Alert(
                        alert_type='forecast_breakout',
                        severity=severity,
                        title=f'{symbol} forecast breakout: {direction} {abs(pct_change):.1f}%',
                        summary=(
                            f'10-day Monte Carlo forecast: ${forecast_price:.2f} '
                            f'(now ${current_price:.2f}). {pct_change:+.1f}% {direction}. '
                            f'Range: ${forecast["lower_bound"]:.2f}\u2013${forecast["upper_bound"]:.2f}.'
                            f'{naive_summary}{conf_summary}'
                        ),
                        details=base_details,
                        recommendation=(
                            f'Review {symbol} charts and news. '
                            f'Forecast model predicts {direction} {abs(pct_change):.1f}% over 10 days.'
                        ),
                        edge_pct=abs(pct_change),
                        confidence=min(0.6 + abs(pct_change) / 50, 0.90),
                    )
                    alerts.append(alert)

            except Exception as e:
                logger.debug(f"Failed to process {symbol}: {e}")
                continue

        logger.info(f"Forecast scanner: processed {len(watchlist)} symbols, {len(alerts)} breakout alerts")

    except Exception as e:
        logger.error(f"Forecast scanner crashed: {e}", exc_info=True)

    return alerts
