---
name: sentinel
description: Autonomous monitoring daemon that scans markets, sports odds, and prediction platforms for opportunities. Control scanners and view alerts.
---

# Sentinel — Autonomous Monitor

## API Base
http://localhost:8888

## Tools

### get_status
Check Sentinel health, scanner states, and last run times.
- Endpoint: GET /api/sentinel/status

### get_alerts
Get all recent Sentinel alerts (value bets, arbitrage, forecast breakouts, etc.).
- Endpoint: GET /api/sentinel/alerts
- Filter: Add ?type=value_bet or ?type=arbitrage or ?type=forecast_breakout

### update_config
Update Sentinel thresholds and preferences.
- Endpoint: POST /api/sentinel/config
- Body: {"min_edge_pct": 10.0, "max_kelly_pct": 3.0, "bankroll_eur": 8000}
- Only include fields you want to change

## Scanner Inventory
- Prediction Market Scanner (every 5 min) — cross-platform arbitrage
- Sports Value Bet Scanner (every 15 min on game days) — model vs bookmaker odds
- Forecast Breakout Scanner (every hour during market hours) — price forecast divergence
- Portfolio Drift Scanner (twice daily) — allocation drift detection
- Macro Event Scanner (daily at 7am) — SEC filings, earnings, economic indicators

## Usage Examples
- "What's the Sentinel status?"
- "Show me all alerts from today"
- "Change my bankroll to €8000"
- "Increase minimum edge to 12%"

## Response Guidelines
- Always show when each scanner last ran
- For alerts, prioritize by severity (critical > high > medium > low)
- If a scanner hasn't run recently, flag it as potentially stale data