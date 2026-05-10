---
name: prediction-markets
description: Scan Polymarket, Manifold, Metaculus, Kalshi, and PredictIt for arbitrage opportunities and model-vs-market divergences.
---

# Prediction Markets

## API Base
http://localhost:8888

## Tools

### scan_predictions
Scan all prediction market platforms for opportunities.
- Endpoint: GET /api/predictions/scan
- Returns: Markets from all platforms with prices, volumes, categories
- Platforms: Polymarket, Manifold, Metaculus, Kalshi, PredictIt

### get_alerts
Get Sentinel alerts for prediction market opportunities.
- Endpoint: GET /api/sentinel/alerts?type=arbitrage
- Returns: Cross-platform arbitrage alerts with price gaps

## What The Scanner Looks For

### Cross-Platform Arbitrage
Same event listed on multiple platforms at different implied probabilities.
Buy YES on cheap platform and NO on expensive platform = guaranteed profit if gap > fees.

### Model Divergence
When the scanner's probability estimate diverges from market consensus by >15%.

## Usage Examples
- "Scan prediction markets for arbitrage"
- "What's the best opportunity on Polymarket right now?"
- "Any high-volume markets where platforms disagree?"

## Response Guidelines
- Always show both platforms and their implied probabilities for arbitrage
- Calculate the arbitrage profit margin after estimated fees (~2%)
- For large positions, warn about liquidity
- Express opportunities in EUR, not USD