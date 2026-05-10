---
name: trading-desk
description: Access Quadratic's portfolio optimization, price forecasting, and market analysis engines. Ask about stock allocations, price predictions, and risk metrics.
---

# Trading Desk

## API Base
http://localhost:8888

## Tools

### optimize_portfolio
Optimize a portfolio allocation using Riskfolio-Lib (CVaR, Mean-Variance, HRP).
- Endpoint: POST /api/portfolio/optimize
- Body: {"tickers": ["AAPL", "MSFT", "GOOGL"], "start": "2023-01-01", "method": "CVaR", "objective": "MinRisk"}
- Returns: Optimal weights per asset, expected return, risk, Sharpe ratio

### forecast_price
Forecast future prices using Chronos-2 / EWMA models.
- Endpoint: POST /api/forecast/{symbol}
- Body: {"start": "2024-01-01", "horizon": 10}
- Returns: Median forecast with 80% and 95% confidence intervals

### forecast_multi
Forecast multiple assets simultaneously.
- Endpoint: POST /api/forecast/multi
- Body: {"tickers": ["AAPL", "TSLA", "NVDA"], "start": "2024-01-01", "horizon": 10}

### get_ohlcv
Get historical OHLCV data for any stock or crypto.
- Endpoint: GET /api/market/ohlcv/{symbol}?start=2024-01-01

### get_returns
Get daily return data for portfolio analysis.
- Endpoint: GET /api/portfolio/returns?tickers=AAPL,MSFT&start=2024-01-01

## Usage Examples
- "What's the optimal allocation for NVDA, AAPL, MSFT, and GOOGL?"
- "Forecast TSLA price for the next 30 days"
- "Show me OHLCV data for Bitcoin this year"

## Response Guidelines
- Always show the Sharpe ratio and expected risk alongside recommendations
- Express portfolio weights as percentages, not decimals
- For forecasts, highlight the confidence interval width
- Convert USD amounts to EUR using approximate 0.92 rate
- Flag when using fallback models (EWMA instead of Chronos-2)