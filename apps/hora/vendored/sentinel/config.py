"""Sentinel Configuration — Edit these to match your risk appetite."""

SENTINEL_CONFIG = {
    # ─── General ──────────────────────────────────────────
    'active_hours': ('07:00', '23:00'),  # Don't alert outside these hours (CET)
    'timezone': 'Europe/Madrid',
    'alert_channel': 'console',  # 'whatsapp' | 'telegram' | 'console'
    'phone_number': '',  # Your WhatsApp number (set in .env)
    
    # ─── Bankroll & Risk ──────────────────────────────────
    'bankroll_eur': 5000,
    'max_kelly_pct': 5.0,        # Never recommend more than 5% of bankroll
    'min_edge_pct': 8.0,         # Don't alert below 8% model edge
    'min_confidence': 0.65,      # Model must be >65% confident
    
    # ─── Portfolio ────────────────────────────────────────
    'stock_watchlist': [
        'NVDA', 'AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META',
        'COIN', 'AMD', 'PLTR', 'SQ', 'SHOP', 'UBER'
    ],
    'crypto_watchlist': ['BTC-USD', 'ETH-USD', 'SOL-USD'],
    'rebalance_drift_pct': 10.0,  # Alert when allocation drifts >10% from optimal
    'forecast_breakout_pct': 5.0, # Alert when forecast is >5% above/below current price
    'volatility_scale': 1.15,    # Widen MC bands by 15% to hit ~80% coverage (calibrated 2026-04-04)

    # ─── Anti-Predictive Exclusions ──────────────────────
    # Assets where the MC model is anti-predictive (<40% directional accuracy).
    # These are excluded from forecast signals. Based on 435-forecast backtest.
    'forecast_exclusions': ['AMD'],

    # ─── Sports Betting ───────────────────────────────────
    'sports_leagues': ['EPL', 'La Liga', 'Serie A', 'Bundesliga', 'Champions League', 'NBA'],
    'min_odds': 1.40,            # Ignore odds below 1.40 (too short)
    'max_odds': 8.00,            # Ignore odds above 8.00 (too speculative)
    
    # ─── Prediction Markets ───────────────────────────────
    'prediction_platforms': ['polymarket', 'manifold', 'metaculus', 'kalshi'],
    'min_arbitrage_pct': 3.0,    # Minimum cross-platform arbitrage gap
    'min_model_divergence_pct': 15.0,  # Minimum model vs market disagreement
    
    # ─── Scanner Intervals (seconds) ─────────────────────
    'intervals': {
        'prediction_markets': 300,   # Every 5 minutes
        'sports_value_bets': 900,    # Every 15 minutes on game days
        'forecast_breakout': 3600,   # Every hour during market hours
        'portfolio_drift': 43200,    # Twice daily
        'macro_events': 86400,       # Once daily at 7am
    },
}
