# Sentinel Daemon — File Manifest

Complete list of files in the Sentinel autonomous monitoring system.

## Core Files

### `__init__.py`
Module docstring. Identifies this as the Sentinel package.

### `config.py`
User-configurable settings:
- Active hours (CET timezone)
- Bankroll and risk thresholds (Kelly %, min edge, min confidence)
- Stock and crypto watchlists
- Prediction market platforms and arbitrage thresholds
- Sports betting parameters (odds ranges, leagues)
- Scanner run intervals (in seconds)

Edit this file to customize Sentinel for your risk profile.

### `alerts.py`
Alert dataclass and formatting:
- `Alert` dataclass with fields: alert_type, severity, title, summary, details, recommendation, stake_eur, edge_pct, confidence, timestamp, acknowledged
- `format_whatsapp()` — Plain text format for WhatsApp (emoji, compact)
- `format_console()` — Rich console format with boxes
- `to_dict()` — Serialize to JSON

### `daemon.py`
Main entry point — orchestrates all scanners:
- `run_daemon()` — Run indefinitely with configurable intervals
- `run_once()` — Run all scanners once and exit
- `generate_test_alert()` — Create test alert for verification
- `filter_alerts()` — Filter by active hours, confidence, edge
- `dispatch_alert()` — Send via configured channel (console/WhatsApp/Telegram)
- CLI interface with `--once`, `--test`, and default daemon modes

## Scanners

All scanners live in `sentinel/scanners/` and follow the pattern:
```python
def scan_feature_name() -> List[Alert]:
    alerts = []
    try:
        # Logic here
        alerts.append(Alert(...))
    except Exception as e:
        logger.error(f"...", exc_info=True)
    return alerts
```

Scanners are defensive — all wrap in try/except, never crash daemon, log errors.

### `scanners/__init__.py`
Module marker. Empty or minimal docstring.

### `scanners/prediction_scanner.py`
Scans Polymarket, Manifold, Metaculus, Kalshi:
- Fetches markets from each platform's free API
- Normalizes to (question, implied_probability, platform)
- Groups by fuzzy-matched question text
- Detects cross-platform arbitrage when spread > min_arbitrage_pct
- Returns `Alert` with alert_type='arbitrage', severity based on spread %

**API Endpoints:**
- Polymarket: `https://clob.polymarket.com/markets?limit=50`
- Manifold: `https://api.manifold.markets/v0/markets?limit=50&sort=liquidity`
- Metaculus: `https://www.metaculus.com/api2/questions/?limit=50&status=open`

### `scanners/sports_scanner.py`
Detects value bets in sports:
- Fetches live odds (ESPN API — stub, ready for real API)
- Estimates fair win probability using Pythagorean expectation: win% = W^2 / (W^2 + L^2)
- Compares model probability vs. implied probability from odds
- Calculates edge: (fair_prob - implied_prob) * 100
- Sizes bets with Kelly criterion, capped at max_kelly_pct
- Returns Alert with alert_type='value_bet' when edge > min_edge_pct

**v1 Note:** Uses Pythagorean expectation (simple, fast). Upgradeable to Elo ratings.

### `scanners/forecast_scanner.py`
Monitors watchlist for forecast breakouts:
- Fetches current prices for each symbol (stub, ready for yfinance)
- Runs forecasting engine (Chronos integration ready, EWMA fallback)
- Compares 10-step median forecast to current price
- Returns Alert with alert_type='forecast_breakout' when |pct_change| > forecast_breakout_pct

**Fallback:** EWMA with momentum decay if Chronos unavailable.

### `scanners/portfolio_scanner.py`
Monitors portfolio allocation drift:
- Fetches 1-year returns for watchlist assets (stub, ready for yfinance)
- Runs portfolio optimization to get current optimal allocation (equal-weight stub, ready for Markowitz)
- Loads last recorded allocation from `sentinel/state.json`
- Calculates drift for each asset: |current_alloc - last_alloc|
- Returns Alert with alert_type='portfolio_drift' when max_drift > rebalance_drift_pct
- Saves updated allocation to state.json after alerting

**Storage:** `sentinel/state.json` persists last_allocation dict.

### `scanners/macro_scanner.py`
Daily digest of market-moving events:
- Fetches SEC EDGAR filings (stub, ready for sec-api)
- Fetches earnings announcements (stub, ready for YahooFinance/MarketWatch)
- Fetches economic calendar events (stub, ready for trading_economics API)
- Compiles into single daily Alert with alert_type='macro_event'
- Lists up to 5 of each category in digest

**Stub Status:** All data fetches are stubs. Ready for real API integration.

## State & Storage

### `sentinel/state.json`
Persisted state (created on first portfolio scan):
```json
{
  "last_allocation": {
    "NVDA": 15.0,
    "AAPL": 12.5,
    ...
  }
}
```

Used by portfolio_scanner to detect drift.

### `sentinel/alerts_log.json`
Append-only alert log. Each alert serialized with `.to_dict()`:
```json
[
  {
    "alert_type": "arbitrage",
    "severity": "high",
    "title": "...",
    "summary": "...",
    "details": {...},
    "edge_pct": 5.2,
    "confidence": 0.95,
    "timestamp": "2026-04-03T15:51:18.751940",
    "acknowledged": false
  },
  ...
]
```

## Documentation

### `README.md`
User guide covering:
- Quick start & installation
- Configuration walkthrough
- Scanner overview & API endpoints
- Alert types, severity, filtering
- State management & extensibility
- Performance notes
- Future enhancements

### `MANIFEST.md` (this file)
Complete file listing with brief descriptions.

---

## File Tree

```
sentinel/
├── __init__.py                    # Package marker
├── config.py                      # User configuration
├── alerts.py                      # Alert dataclass & formatting
├── daemon.py                      # Main daemon & CLI
├── state.json                     # Last portfolio allocation (auto-created)
├── alerts_log.json               # Append-only alert log (auto-created)
├── README.md                      # User guide
├── MANIFEST.md                    # This file
└── scanners/
    ├── __init__.py               # Package marker
    ├── prediction_scanner.py      # Polymarket/Manifold/Metaculus/Kalshi
    ├── sports_scanner.py          # ESPN value bets (Pythagorean)
    ├── forecast_scanner.py        # Watchlist forecast breakouts (EWMA)
    ├── portfolio_scanner.py       # Allocation drift detection
    └── macro_scanner.py           # Daily digest (EDGAR/earnings/macro)
```

## Usage Examples

### Run daemon (production)
```bash
python -m sentinel.daemon
```

### Run scanners once and exit
```bash
python -m sentinel.daemon --once
```

### Generate test alert
```bash
python -m sentinel.daemon --test
```

### Review alerts
```bash
cat sentinel/alerts_log.json | jq '.'
```

### Customize config
Edit `config.py`:
- Set `alert_channel` to 'whatsapp' or 'telegram' (needs credentials in .env)
- Adjust `min_edge_pct`, `min_confidence` to match risk appetite
- Update `stock_watchlist` and `crypto_watchlist`

---

**All files created:** 2026-04-03  
**Status:** Fully functional, API stubs ready for integration  
**Next Steps:** Integrate real APIs (yfinance, sec-api, sports odds, WhatsApp, etc.)
