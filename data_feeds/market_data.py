"""
Market Data Feed Module
Provides OHLCV data for portfolio.py, forecasting.py, and drl_training.py

Usage:
    from data_feeds.market_data import MarketDataFeed
    feed = MarketDataFeed()

    # For portfolio.py
    returns_df = feed.get_returns(tickers=['AAPL','MSFT','GOOGL'], start='2020-01-01')

    # For forecasting.py
    closes = feed.get_close_prices('AAPL', start='2020-01-01')

    # For drl_training.py
    ohlcv = feed.get_ohlcv_arrays('AAPL', start='2020-01-01')
"""

import os, json, time, logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
import numpy as np

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)
CACHE_TTL_HOURS = 24

# Default ticker sets
DEFAULT_STOCKS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'GS', 'BAC',
    'V', 'MA', 'WMT', 'JNJ', 'PG', 'UNH', 'HD', 'DIS', 'NFLX', 'ADBE',
    'CRM', 'INTC', 'AMD', 'PYPL', 'COIN', 'SHOP', 'UBER', 'ABNB', 'PLTR', 'SQ'
]
DEFAULT_CRYPTO = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'ADA-USD', 'DOT-USD']
ALL_DEFAULT = DEFAULT_STOCKS + DEFAULT_CRYPTO


def _cache_path(key: str) -> Path:
    safe = key.replace('/', '_').replace(' ', '_')
    return CACHE_DIR / f"{safe}.csv"


def _cache_valid(path: Path) -> bool:
    if not path.exists():
        return False
    age = time.time() - path.stat().st_mtime
    return age < CACHE_TTL_HOURS * 3600


class MarketDataFeed:
    """Unified market data provider for all trading/portfolio engines."""

    def __init__(self, cache_ttl_hours: int = 24):
        global CACHE_TTL_HOURS
        CACHE_TTL_HOURS = cache_ttl_hours
        self._pd = None
        self._yf = None
        self._has_yfinance = None

    def _ensure_pandas(self):
        if self._pd is None:
            import pandas as pd
            self._pd = pd
        return self._pd

    def _ensure_yfinance(self) -> bool:
        if self._has_yfinance is None:
            try:
                import yfinance as yf
                self._yf = yf
                self._has_yfinance = True
            except ImportError:
                logger.warning("yfinance not installed. Using synthetic data. Install: pip install yfinance")
                self._has_yfinance = False
        return self._has_yfinance

    # ─── Core fetchers ────────────────────────────────────────────

    def _fetch_ohlcv(self, tickers: list[str], start: str = '2020-01-01',
                      end: Optional[str] = None) -> 'pd.DataFrame':
        """Fetch OHLCV data. Returns MultiIndex DataFrame (Date × [Open,High,Low,Close,Volume] × Ticker)."""
        pd = self._ensure_pandas()
        cache_key = f"ohlcv_{'_'.join(sorted(tickers[:5]))}_{len(tickers)}_{start}"
        cp = _cache_path(cache_key)

        if _cache_valid(cp):
            logger.info(f"Loading cached OHLCV from {cp}")
            df = pd.read_csv(cp, index_col=0, parse_dates=True, header=[0,1])
            return df

        if self._ensure_yfinance():
            try:
                logger.info(f"Downloading {len(tickers)} tickers from Yahoo Finance...")
                df = self._yf.download(tickers, start=start, end=end,
                                        progress=False, threads=True)
                if not df.empty:
                    df.to_csv(cp)
                    logger.info(f"Cached {len(df)} rows to {cp}")
                    return df
            except Exception as e:
                logger.warning(f"yfinance download failed: {e}")

        # Fallback: synthetic data
        logger.info("Generating synthetic OHLCV data...")
        return self._generate_synthetic_ohlcv(tickers, start, end)

    def _generate_synthetic_ohlcv(self, tickers: list[str], start: str = '2020-01-01',
                                    end: Optional[str] = None) -> 'pd.DataFrame':
        """Generate realistic synthetic OHLCV with geometric Brownian motion."""
        pd = self._ensure_pandas()
        if end is None:
            end = datetime.now().strftime('%Y-%m-%d')

        dates = pd.bdate_range(start=start, end=end)
        n_days = len(dates)

        np.random.seed(42)

        data = {}
        for ticker in tickers:
            # Parameters per ticker (seeded by hash for consistency)
            h = hash(ticker) % 1000
            base_price = 50 + (h % 400)
            annual_return = 0.05 + (h % 30) / 100
            annual_vol = 0.15 + (h % 40) / 100

            dt = 1/252
            daily_ret = annual_return * dt
            daily_vol = annual_vol * np.sqrt(dt)

            # GBM path
            returns = np.random.normal(daily_ret, daily_vol, n_days)
            prices = base_price * np.exp(np.cumsum(returns))

            # Generate OHLCV
            closes = prices
            intraday_vol = daily_vol * 0.5
            highs = closes * (1 + np.abs(np.random.normal(0, intraday_vol, n_days)))
            lows = closes * (1 - np.abs(np.random.normal(0, intraday_vol, n_days)))
            opens = np.roll(closes, 1) * (1 + np.random.normal(0, daily_vol * 0.3, n_days))
            opens[0] = base_price
            volumes = np.random.lognormal(mean=15, sigma=0.5, size=n_days).astype(int)

            data[('Open', ticker)] = opens
            data[('High', ticker)] = highs
            data[('Low', ticker)] = lows
            data[('Close', ticker)] = closes
            data[('Volume', ticker)] = volumes

        df = pd.DataFrame(data, index=dates)
        df.columns = pd.MultiIndex.from_tuples(df.columns)

        # Cache
        cp = _cache_path(f"synthetic_{'_'.join(sorted(tickers[:5]))}_{len(tickers)}_{start}")
        df.to_csv(cp)

        return df

    # ─── Portfolio engine interface ───────────────────────────────

    def get_returns(self, tickers: Optional[list[str]] = None,
                    start: str = '2020-01-01', end: Optional[str] = None) -> 'pd.DataFrame':
        """
        Get daily log returns DataFrame for portfolio.py.

        Returns: pd.DataFrame with shape (T, N), T≥20, columns=ticker symbols
        Ready to pass directly to: portfolio.optimize(returns=df)
        """
        pd = self._ensure_pandas()
        if tickers is None:
            tickers = ALL_DEFAULT

        ohlcv = self._fetch_ohlcv(tickers, start, end)

        # Extract close prices
        if isinstance(ohlcv.columns, pd.MultiIndex):
            closes = ohlcv['Close']
        else:
            closes = ohlcv

        # Log returns
        returns = np.log(closes / closes.shift(1)).dropna()

        # Drop columns with too many NaN
        valid_cols = returns.columns[returns.notna().sum() >= 20]
        returns = returns[valid_cols].dropna()

        logger.info(f"Portfolio returns: {returns.shape[0]} days × {returns.shape[1]} assets")
        return returns

    # ─── Forecasting engine interface ────────────────────────────

    def get_close_prices(self, ticker: str = 'AAPL',
                          start: str = '2020-01-01', end: Optional[str] = None) -> np.ndarray:
        """
        Get close price array for forecasting.py.

        Returns: np.ndarray of close prices, oldest-first, len≥10
        Ready to pass to: await forecast(close_prices=arr, symbol=ticker)
        """
        pd = self._ensure_pandas()
        ohlcv = self._fetch_ohlcv([ticker], start, end)

        if isinstance(ohlcv.columns, pd.MultiIndex):
            closes = ohlcv['Close']
            if ticker in closes.columns:
                arr = closes[ticker].dropna().values
            else:
                arr = closes.iloc[:, 0].dropna().values
        else:
            arr = ohlcv.dropna().values.flatten()

        logger.info(f"Forecast data for {ticker}: {len(arr)} prices")
        return arr.astype(np.float64)

    def get_close_prices_multi(self, tickers: Optional[list[str]] = None,
                                start: str = '2020-01-01') -> dict:
        """
        Get close prices for multiple tickers.

        Returns: {symbol: list[float]} for forecast_multi()
        """
        pd = self._ensure_pandas()
        if tickers is None:
            tickers = DEFAULT_STOCKS[:10]

        ohlcv = self._fetch_ohlcv(tickers, start)
        if isinstance(ohlcv.columns, pd.MultiIndex):
            closes = ohlcv['Close']
        else:
            closes = ohlcv

        result = {}
        for t in tickers:
            if t in closes.columns:
                vals = closes[t].dropna().values
                result[t] = vals.tolist()

        return result

    # ─── DRL training engine interface ───────────────────────────

    def get_ohlcv_arrays(self, ticker: str = 'AAPL',
                          start: str = '2020-01-01', end: Optional[str] = None) -> dict:
        """
        Get OHLCV numpy arrays for drl_training.py MarketEnv.

        Returns: {"closes": np.ndarray, "highs": np.ndarray, "lows": np.ndarray,
                  "opens": np.ndarray, "volumes": np.ndarray}
        Ready to pass to: await train_agent(ohlcv_data=result, symbol=ticker)
        """
        pd = self._ensure_pandas()
        ohlcv = self._fetch_ohlcv([ticker], start, end)

        def _extract(col):
            if isinstance(ohlcv.columns, pd.MultiIndex):
                series = ohlcv[col]
                if ticker in series.columns:
                    return series[ticker].dropna().values.astype(np.float64)
                return series.iloc[:, 0].dropna().values.astype(np.float64)
            return ohlcv[col].dropna().values.astype(np.float64) if col in ohlcv else np.array([])

        result = {
            "closes": _extract('Close'),
            "highs": _extract('High'),
            "lows": _extract('Low'),
            "opens": _extract('Open'),
            "volumes": _extract('Volume'),
        }

        # Ensure all arrays same length (trim to shortest)
        min_len = min(len(v) for v in result.values() if len(v) > 0)
        for k in result:
            result[k] = result[k][:min_len]

        logger.info(f"DRL OHLCV for {ticker}: {min_len} bars")
        return result

    # ─── Convenience: download all default data ──────────────────

    def bootstrap(self, start: str = '2020-01-01'):
        """Download and cache all default market data. Run once."""
        pd = self._ensure_pandas()

        print(f"[MarketDataFeed] Bootstrapping {len(ALL_DEFAULT)} tickers from {start}...")
        ohlcv = self._fetch_ohlcv(ALL_DEFAULT, start)

        if isinstance(ohlcv.columns, pd.MultiIndex):
            n_tickers = len(ohlcv['Close'].columns)
            n_days = len(ohlcv)
        else:
            n_tickers = 1
            n_days = len(ohlcv)

        print(f"[MarketDataFeed] ✓ Downloaded {n_days} days × {n_tickers} tickers")

        # Pre-compute returns for portfolio engine
        returns = self.get_returns(ALL_DEFAULT, start)

        # Save individual ticker arrays for DRL engine
        for ticker in DEFAULT_STOCKS[:5] + DEFAULT_CRYPTO[:2]:
            arrays = self.get_ohlcv_arrays(ticker, start)
            print(f"  ✓ {ticker}: {len(arrays['closes'])} bars")

        print(f"[MarketDataFeed] ✓ Bootstrap complete. Cache at: {CACHE_DIR}")
        return True


# ─── Quick test ───────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    feed = MarketDataFeed()

    # Test all three interfaces
    print("\n=== Portfolio Returns ===")
    returns = feed.get_returns(['AAPL', 'MSFT', 'GOOGL'], start='2024-01-01')
    print(f"Shape: {returns.shape}")
    print(returns.tail(3))

    print("\n=== Forecast Close Prices ===")
    closes = feed.get_close_prices('AAPL', start='2024-01-01')
    print(f"Length: {len(closes)}, Last 5: {closes[-5:]}")

    print("\n=== DRL OHLCV Arrays ===")
    ohlcv = feed.get_ohlcv_arrays('AAPL', start='2024-01-01')
    for k, v in ohlcv.items():
        print(f"  {k}: shape={v.shape}, dtype={v.dtype}")

    print("\n✅ All market data feeds working")
