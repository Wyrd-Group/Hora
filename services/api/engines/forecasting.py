"""
Chronos-2 / TimesFM Forecasting Engine — foundation model-powered time series prediction.

Zero-shot forecasting via Amazon Chronos-2 (MIT license, best GIFT-Eval performance).
No training required — feed it raw OHLCV close prices and get calibrated probabilistic
forecasts with prediction intervals.

Architecture:
  1. Consume OHLCV data from the market_data pipeline (PostgreSQL ohlcv table or in-memory)
  2. Run foundation model inference (Chronos-2 Bolt for speed, Chronos-2 full for accuracy)
  3. Return structured forecasts with multi-horizon predictions and prediction bands
  4. Optional: regime-aware weighting (if HMM regime state is available from JS layer)

Models (by size, all MIT license):
  - chronos-bolt-tiny    (9M params)   — fastest, good for batch/screening
  - chronos-bolt-small   (48M params)  — balanced speed/accuracy
  - chronos-bolt-base    (205M params) — best quality for Bolt family
  - chronos-t5-small     (46M params)  — original Chronos, slower but more robust
  - chronos-t5-large     (710M params) — highest accuracy, needs GPU

Fallback: if torch/chronos not installed, degrades to exponential smoothing (statsmodels)
or simple EWMA — never fails, just loses quality.

Usage:
    from engines.forecasting import forecast, forecast_multi, get_model_status

    # Single symbol
    result = await forecast("AAPL", horizon=30, model="bolt-small")

    # Multi-symbol (for portfolio/correlation analysis)
    results = await forecast_multi(["AAPL", "MSFT", "GOOGL"], horizon=30)
"""
from __future__ import annotations

import logging
import math
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import numpy as np

log = logging.getLogger("mss.api.forecasting")

# ── Graceful imports ─────────────────────────────────────────────────────────

_HAS_TORCH = False
_HAS_CHRONOS = False
_HAS_STATSMODELS = False

try:
    import torch
    _HAS_TORCH = True
except ImportError:
    log.info("torch not installed — Chronos models unavailable, using statistical fallback")

if _HAS_TORCH:
    try:
        from chronos import ChronosPipeline
        _HAS_CHRONOS = True
    except ImportError:
        log.info("chronos-forecasting not installed — using statistical fallback")

try:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    _HAS_STATSMODELS = True
except ImportError:
    log.info("statsmodels not installed — using EWMA fallback only")


# ── Model registry ───────────────────────────────────────────────────────────

CHRONOS_MODELS = {
    "bolt-tiny":   "amazon/chronos-bolt-tiny",
    "bolt-small":  "amazon/chronos-bolt-small",
    "bolt-base":   "amazon/chronos-bolt-base",
    "t5-small":    "amazon/chronos-t5-small",
    "t5-base":     "amazon/chronos-t5-base",
    "t5-large":    "amazon/chronos-t5-large",
}

DEFAULT_MODEL = "bolt-small"

# Model cache — load once, reuse across requests
_model_cache: dict[str, object] = {}


# ── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class ForecastPoint:
    """Single forecast point with prediction interval."""
    step: int                    # steps ahead (1-indexed)
    timestamp: Optional[str]     # projected timestamp (if daily)
    median: float                # median forecast (p50)
    low_80: float                # 80% prediction interval lower bound (p10)
    high_80: float               # 80% prediction interval upper bound (p90)
    low_95: float                # 95% prediction interval lower bound (p2.5)
    high_95: float               # 95% prediction interval upper bound (p97.5)


@dataclass
class ForecastResult:
    """Complete forecast for a single symbol."""
    symbol: str
    model: str                   # which model produced this
    method: str                  # "chronos", "holt-winters", "ewma"
    horizon: int                 # number of steps forecast
    interval: str                # bar interval ("1d", "1h", "5m")
    context_length: int          # how many historical bars were used
    points: list[ForecastPoint] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {
            "symbol": self.symbol,
            "model": self.model,
            "method": self.method,
            "horizon": self.horizon,
            "interval": self.interval,
            "contextLength": self.context_length,
            "points": [
                {
                    "step": p.step,
                    "timestamp": p.timestamp,
                    "median": round(p.median, 4),
                    "low80": round(p.low_80, 4),
                    "high80": round(p.high_80, 4),
                    "low95": round(p.low_95, 4),
                    "high95": round(p.high_95, 4),
                }
                for p in self.points
            ],
            "metadata": self.metadata,
        }


# ── Chronos-2 inference ─────────────────────────────────────────────────────

def _load_chronos_model(model_key: str = DEFAULT_MODEL) -> object:
    """Load Chronos model (cached). First call downloads weights (~200MB for bolt-small)."""
    if model_key in _model_cache:
        return _model_cache[model_key]

    if not _HAS_CHRONOS:
        raise RuntimeError("chronos-forecasting not installed")

    model_id = CHRONOS_MODELS.get(model_key)
    if not model_id:
        raise ValueError(f"Unknown model: {model_key}. Available: {list(CHRONOS_MODELS.keys())}")

    log.info("Loading Chronos model: %s (%s)", model_key, model_id)
    t0 = time.monotonic()

    # Use CPU by default — GPU if available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float32  # bfloat16 only on GPU with support

    pipeline = ChronosPipeline.from_pretrained(
        model_id,
        device_map=device,
        torch_dtype=dtype,
    )

    elapsed = time.monotonic() - t0
    log.info("Chronos model loaded in %.1fs on %s", elapsed, device)

    _model_cache[model_key] = pipeline
    return pipeline


def _chronos_forecast(
    series: np.ndarray,
    horizon: int,
    model_key: str = DEFAULT_MODEL,
    num_samples: int = 20,
    quantiles: list[float] | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Run Chronos-2 inference on a single time series.

    Args:
        series: 1D numpy array of historical values (e.g. close prices)
        horizon: number of steps to forecast
        model_key: which model to use
        num_samples: number of forecast samples (more = smoother quantiles)
        quantiles: quantile levels to compute [default: 0.025, 0.1, 0.5, 0.9, 0.975]

    Returns:
        (quantile_forecasts, quantile_levels)
        quantile_forecasts shape: (num_quantiles, horizon)
    """
    if quantiles is None:
        quantiles = [0.025, 0.1, 0.5, 0.9, 0.975]

    pipeline = _load_chronos_model(model_key)

    # Chronos expects a torch tensor
    context = torch.tensor(series, dtype=torch.float32).unsqueeze(0)  # (1, T)

    # Generate quantile forecasts
    quantile_forecasts = pipeline.predict_quantiles(
        context,
        prediction_length=horizon,
        quantile_levels=quantiles,
    )

    # Shape: (1, horizon, num_quantiles) → squeeze batch dim
    qf = quantile_forecasts.squeeze(0).numpy()  # (horizon, num_quantiles)

    return qf, np.array(quantiles)


# ── Statistical fallbacks ────────────────────────────────────────────────────

def _holt_winters_forecast(
    series: np.ndarray,
    horizon: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Holt-Winters exponential smoothing forecast.
    Returns (median, lower_95, upper_95) arrays of shape (horizon,).
    """
    if not _HAS_STATSMODELS:
        return _ewma_forecast(series, horizon)

    try:
        # Additive trend, no seasonality (daily prices don't have clean seasonality)
        model = ExponentialSmoothing(
            series,
            trend="add",
            seasonal=None,
            damped_trend=True,
        ).fit(optimized=True)

        forecast = model.forecast(horizon)

        # Approximate prediction intervals from residual std
        residuals = model.resid
        sigma = np.std(residuals[~np.isnan(residuals)])
        steps = np.arange(1, horizon + 1)
        expanding_sigma = sigma * np.sqrt(steps)

        lower_95 = forecast - 1.96 * expanding_sigma
        upper_95 = forecast + 1.96 * expanding_sigma

        return forecast, lower_95, upper_95

    except Exception as exc:
        log.warning("Holt-Winters failed (%s), falling back to EWMA", exc)
        return _ewma_forecast(series, horizon)


def _ewma_forecast(
    series: np.ndarray,
    horizon: int,
    span: int = 20,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Simple EWMA forecast — flat extrapolation of exponentially weighted mean.
    Always works, no dependencies. Last resort fallback.
    """
    # Compute EWMA
    alpha = 2.0 / (span + 1)
    ewma = series[0]
    for val in series[1:]:
        ewma = alpha * val + (1 - alpha) * ewma

    forecast = np.full(horizon, ewma)

    # Rough prediction intervals from trailing volatility
    if len(series) >= 20:
        returns = np.diff(np.log(np.maximum(series[-60:], 1e-8)))
        vol = np.std(returns) if len(returns) > 1 else 0.02
    else:
        vol = 0.02  # fallback 2% daily vol

    steps = np.arange(1, horizon + 1)
    expanding_sigma = series[-1] * vol * np.sqrt(steps)

    lower_95 = forecast - 1.96 * expanding_sigma
    upper_95 = forecast + 1.96 * expanding_sigma

    return forecast, lower_95, upper_95


# ── Public API ───────────────────────────────────────────────────────────────

async def forecast(
    close_prices: list[float] | np.ndarray,
    symbol: str = "UNKNOWN",
    horizon: int = 30,
    interval: str = "1d",
    model_key: str = DEFAULT_MODEL,
    timestamps: list[str] | None = None,
) -> ForecastResult:
    """
    Forecast a single time series.

    Args:
        close_prices: historical close prices (oldest first)
        symbol: ticker for labeling
        horizon: number of steps to predict
        interval: bar size ("1d", "1h", "5m") — for metadata only
        model_key: Chronos model variant
        timestamps: optional list of historical timestamps (to project future timestamps)

    Returns:
        ForecastResult with probabilistic predictions
    """
    series = np.array(close_prices, dtype=np.float64)

    # Clean: drop NaN, require minimum context
    series = series[~np.isnan(series)]
    if len(series) < 10:
        return ForecastResult(
            symbol=symbol, model="none", method="insufficient_data",
            horizon=horizon, interval=interval, context_length=len(series),
            metadata={"error": f"Need >= 10 data points, got {len(series)}"},
        )

    t0 = time.monotonic()

    # Try Chronos-2 first, then Holt-Winters, then EWMA
    if _HAS_CHRONOS and _HAS_TORCH:
        try:
            qf, ql = _chronos_forecast(series, horizon, model_key)
            # qf shape: (horizon, 5) for quantiles [0.025, 0.1, 0.5, 0.9, 0.975]
            method = "chronos"
            model_name = CHRONOS_MODELS.get(model_key, model_key)

            points = []
            for i in range(horizon):
                points.append(ForecastPoint(
                    step=i + 1,
                    timestamp=None,  # TODO: project from last timestamp
                    median=float(qf[i, 2]),     # p50
                    low_80=float(qf[i, 1]),     # p10
                    high_80=float(qf[i, 3]),    # p90
                    low_95=float(qf[i, 0]),     # p2.5
                    high_95=float(qf[i, 4]),    # p97.5
                ))

        except Exception as exc:
            log.warning("Chronos inference failed (%s), falling back to statistics", exc)
            qf = None  # trigger fallback
    else:
        qf = None

    if qf is None:
        # Statistical fallback
        median, lower_95, upper_95 = _holt_winters_forecast(series, horizon)
        method = "holt-winters" if _HAS_STATSMODELS else "ewma"
        model_name = method

        # Approximate 80% bands from 95% bands (1.28 vs 1.96 z-scores)
        scale_80 = 1.28 / 1.96
        center = median
        half_width_95 = (upper_95 - lower_95) / 2
        lower_80 = center - half_width_95 * scale_80
        upper_80 = center + half_width_95 * scale_80

        points = []
        for i in range(horizon):
            points.append(ForecastPoint(
                step=i + 1,
                timestamp=None,
                median=float(median[i]),
                low_80=float(lower_80[i]),
                high_80=float(upper_80[i]),
                low_95=float(lower_95[i]),
                high_95=float(upper_95[i]),
            ))

    elapsed = time.monotonic() - t0

    return ForecastResult(
        symbol=symbol,
        model=model_name,
        method=method,
        horizon=horizon,
        interval=interval,
        context_length=len(series),
        points=points,
        metadata={
            "inferenceTimeMs": round(elapsed * 1000, 1),
            "lastPrice": float(series[-1]),
            "hasTorch": _HAS_TORCH,
            "hasChronos": _HAS_CHRONOS,
        },
    )


async def forecast_multi(
    symbols_data: dict[str, list[float]],
    horizon: int = 30,
    interval: str = "1d",
    model_key: str = DEFAULT_MODEL,
) -> dict[str, ForecastResult]:
    """
    Forecast multiple symbols. Returns dict of symbol → ForecastResult.
    Runs sequentially (Chronos handles batching internally for Bolt models).
    """
    results = {}
    for symbol, prices in symbols_data.items():
        results[symbol] = await forecast(
            close_prices=prices,
            symbol=symbol,
            horizon=horizon,
            interval=interval,
            model_key=model_key,
        )
    return results


def get_model_status() -> dict:
    """Return current model availability and configuration."""
    return {
        "hasTorch": _HAS_TORCH,
        "hasChronos": _HAS_CHRONOS,
        "hasStatsmodels": _HAS_STATSMODELS,
        "availableModels": list(CHRONOS_MODELS.keys()) if _HAS_CHRONOS else [],
        "defaultModel": DEFAULT_MODEL,
        "fallbackMethod": (
            "holt-winters" if _HAS_STATSMODELS
            else "ewma"
        ),
        "loadedModels": list(_model_cache.keys()),
        "gpuAvailable": _HAS_TORCH and torch.cuda.is_available(),
    }
