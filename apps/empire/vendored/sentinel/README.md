# Sentinel — Autonomous Opportunity Scanner

Sentinel continuously monitors markets for trading, betting, and investment opportunities. It runs multiple specialized scanners on configurable intervals and dispatches alerts via console, WhatsApp, or Telegram.

## Quick Start

### Install Dependencies

```bash
pip install httpx apscheduler
```

### Configuration

Edit `sentinel/config.py` to customize:

- **Active hours** — When to send alerts (default: 07:00–23:00 CET)
- **Bankroll & risk** — Total capital, max Kelly %, minimum edge thresholds
- **Watchlists** — Stock and crypto symbols to monitor
- **Scanner intervals** — How often each scanner runs (prediction markets: 5 min, sports: 15 min, etc.)
- **Alert channel** — `console`, `whatsapp`, or `telegram`

### Run the Daemon

```bash
# Run continuously (production)
python -m sentinel.daemon

# Run all scanners once and exit
python -m sentinel.daemon --once

# Generate a test alert
python -m sentinel.daemon --test
```

## Scanners

### Prediction Markets (`prediction_scanner.py`)
Scans Polymarket, Manifold, Metaculus, and Kalshi for:
- **Cross-platform arbitrage** — Same event at different implied probabilities across platforms
- Reports arbitrage % and recommended lay/back sides

**API Sources:**
- Polymarket: `https://clob.polymarket.com/markets`
- Manifold: `https://api.manifold.markets/v0/markets`
- Metaculus: `https://www.metaculus.com/api2/questions/`

### Sports Value Bets (`sports_scanner.py`)
Detects undervalued sports bets:
- Fetches live odds (ESPN API stub)
- Estimates fair win probability using Pythagorean expectation
- Compares to implied probability from odds
- Sizes bets using Kelly criterion

**Current implementation:** v1 with simplified Pythagorean expectation. Upgradeable to full Elo or other rating systems.

### Forecast Breakout (`forecast_scanner.py`)
Monitors stock and crypto watchlist for significant forecast divergence:
- Runs forecasting engine (Chronos ML model if available, EWMA fallback)
- Compares 10-step median forecast to current price
- Alerts when forecast deviates >forecast_breakout_pct

**Current implementation:** EWMA fallback ready. Integrable with Chronos or similar.

### Portfolio Drift (`portfolio_scanner.py`)
Monitors allocation drift:
- Fetches 1-year returns for watchlist assets
- Runs portfolio optimization (equal-weight stub, upgradeable to Markowitz)
- Compares to last recorded allocation
- Recommends rebalancing when drift >threshold

**Storage:** `sentinel/state.json` maintains last optimal allocation.

### Macro Scanner (`macro_scanner.py`)
Daily digest of corporate and macro events:
- SEC EDGAR filings (stub, ready for integration)
- Earnings announcements (stub, ready for integration)
- Economic calendar events (stub, ready for integration)

Returns single daily alert summarizing market-moving events.

## Alert System

### Alert Types
- `value_bet` — Positive expected value bet with Kelly sizing
- `arbitrage` — Risk-free cross-platform spread
- `forecast_breakout` — ML forecast significantly diverges from current price
- `portfolio_drift` — Allocation has drifted >threshold from optimal
- `macro_event` — Market-moving news or earnings

### Severity Levels
- `low` — FYI only
- `medium` — Monitor closely
- `high` — Consider acting
- `critical` — Urgent action

### Alert Dispatch Channels
- **Console** — Prints formatted alert (development/testing)
- **WhatsApp** — Integration stub (requires OpenClaw or Twilio)
- **Telegram** — Integration stub (requires bot token)

### Filtering
Alerts are filtered by:
1. Active hours (don't disturb outside configured window)
2. Minimum confidence threshold
3. Minimum edge % (for value bets)

Failed alerts are logged but never crash the daemon.

## Alert Log

All alerts are stored in `sentinel/alerts_log.json`:

```json
[
  {
    "alert_type": "arbitrage",
    "severity": "high",
    "title": "Arbitrage opportunity: Will Trump win 2024?",
    "summary": "Cross-platform probability spread detected...",
    "details": {...},
    "edge_pct": 5.2,
    "confidence": 0.95,
    "timestamp": "2026-04-03T15:51:18.751940",
    "acknowledged": false
  }
]
```

## State Management

`sentinel/state.json` persists:
- Last recorded portfolio allocation (used for drift detection)
- Other scanner state as needed

## Extensibility

### Adding a New Scanner

1. Create `sentinel/scanners/my_scanner.py`:
```python
def scan_my_feature() -> List[Alert]:
    alerts = []
    try:
        # Your logic here
        alerts.append(Alert(...))
    except Exception as e:
        logger.error(f"Scanner crashed: {e}", exc_info=True)
    return alerts
```

2. Import and call in `daemon.py`:
```python
from .scanners.my_scanner import scan_my_feature
# Add to scanners list:
# ('my_feature', scan_my_feature),
```

3. Add interval config to `config.py`:
```python
'intervals': {
    'my_feature': 3600,  # Run every hour
}
```

### Upgrading Stubs

These are ready to integrate with real APIs:

- **Polymarket/Manifold/Metaculus** — Already fetching, normalization ready
- **Sports odds** — Ready for ESPN+, TheOdds, or SBR (Pinnacle API)
- **Forecast model** — Ready for Chronos, LSTNet, or TimeGPT
- **Portfolio optimization** — Ready for CVXPY or PyPortfolioOpt
- **SEC EDGAR** — Ready for sec-api or direct scraping
- **Earnings data** — Ready for YahooFinance, MarketWatch, or Seeking Alpha

## Logging

All modules log to `stdout` at INFO level. Enable DEBUG logging:

```python
logging.getLogger('sentinel').setLevel(logging.DEBUG)
```

## Performance Notes

- **Prediction markets**: ~20–30 requests/min during active scanning
- **Sports odds**: Stub (API to be added)
- **Forecasts**: Single model inference per symbol per run
- **Portfolio**: Optimization on watchlist (default 13 stocks + 3 crypto)

No database required — everything stored in JSON.

## Future Enhancements

- [ ] Live WhatsApp/Telegram integration
- [ ] Elo rating system for sports (replace Pythagorean)
- [ ] Chronos/LSTNet integration for forecasting
- [ ] Markowitz portfolio optimization
- [ ] Real historical alert backtesting
- [ ] Web dashboard for alert review + acknowledgment
- [ ] Email digest summaries
- [ ] Slack integration
- [ ] Position tracking (if integrating with brokerage API)

---

**Author:** Sentinel Daemon  
**License:** Internal use only  
**Last Updated:** 2026-04-03
