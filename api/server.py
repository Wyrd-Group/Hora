"""
FastAPI Backend Server for Quadratic Engines.

This server exposes all Quadratic analytical engines (portfolio optimization,
forecasting, anomaly detection, threat analysis, clustering, etc.) as REST
endpoints. It serves as the unified API for OpenClaw and Sentinel.

Engines:
  - Portfolio optimization (CVaR, risk parity, efficient frontier)
  - Time-series forecasting (bolt, ensemble models)
  - Deep RL training (PPO, DQN for trading agents)
  - Anomaly detection (statistical, behavioral)
  - Kalman filtering (tracking, prediction)
  - Clustering (DBSCAN, hierarchical)
  - Threat scoring and ranking
  - Link analysis (entity relationship graphs)
  - Explainability (threat score attribution)

Data Feeds:
  - Market data (returns, OHLCV, prices)
  - AIS data (vessel tracking, scenarios)
  - ML benchmarks (classification, regression datasets)

Configuration:
  - PORT env var (default: 8888)
  - CORS enabled for localhost
  - Comprehensive error handling
  - Request/response logging
  - Graceful degradation for missing dependencies
"""

import asyncio
import json
import logging
import os
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Load .env files before anything reads os.environ
try:
    from dotenv import load_dotenv
    # Try api/.env first, then project root .env
    _api_env = Path(__file__).parent / ".env"
    _root_env = Path(__file__).parent.parent / ".env"
    if _api_env.exists():
        load_dotenv(_api_env, override=False)
    if _root_env.exists():
        load_dotenv(_root_env, override=False)
except ImportError:
    pass  # python-dotenv not installed — rely on shell env vars

import numpy as np

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field

# Import live data feeds
from api import data_feeds        # yfinance, Odds API, ESPN
from api import polygon_feed      # Polygon.io (real-time stocks, options, financials)
from api import news_feed         # NewsAPI + FinBERT sentiment
from api import fred_feed         # FRED macro indicators

ODDS_API_KEY = os.environ.get("ODDS_API_KEY", "")

# ── Configuration ────────────────────────────────────────────────────────────

PORT = int(os.environ.get("PORT", 8888))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

# API Key authentication (set QUADRATIC_API_KEY env var to enable)
API_KEY = os.environ.get("QUADRATIC_API_KEY", "")
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(API_KEY_HEADER)):
    """Verify API key if one is configured. No-op if QUADRATIC_API_KEY is unset."""
    if not API_KEY:
        return None  # No key configured — open access
    if api_key != API_KEY:
        raise HTTPException(
            status_code=401,
            detail={"status": "error", "message": "Invalid or missing API key. Set X-API-Key header."},
        )
    return api_key

# Setup logging
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
log = logging.getLogger("quadratic.api")

# Add project paths for engine imports
PROJECT_ROOT = Path(__file__).parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# ── Engine Imports (with graceful fallback) ──────────────────────────────────

ENGINE_STATUS = {}

def _import_engine(module_name: str, engine_name: str) -> Optional[Any]:
    """Safely import an engine module with error reporting."""
    try:
        module = __import__(f"services.api.engines.{module_name}", fromlist=[module_name])
        ENGINE_STATUS[engine_name] = "available"
        log.info(f"Engine '{engine_name}' loaded successfully")
        return module
    except ImportError as e:
        ENGINE_STATUS[engine_name] = f"import_error: {str(e)}"
        log.warning(f"Engine '{engine_name}' failed to import: {e}")
        return None
    except Exception as e:
        ENGINE_STATUS[engine_name] = f"error: {str(e)}"
        log.error(f"Engine '{engine_name}' failed to load: {e}")
        return None

# Load all engines
portfolio_engine = _import_engine("portfolio", "portfolio")
forecasting_engine = _import_engine("forecasting", "forecasting")
drl_engine = _import_engine("drl_training", "drl_training")
anomaly_engine = _import_engine("anomaly", "anomaly")
kalman_engine = _import_engine("kalman", "kalman")
clustering_engine = _import_engine("clustering", "clustering")
threat_engine = _import_engine("threat", "threat")
link_analysis_engine = _import_engine("link_analysis", "link_analysis")
explain_engine = _import_engine("explain", "explain")
market_intel_engine = _import_engine("market_intel", "market_intel")
intelligence_engine = _import_engine("intelligence", "intelligence")

# Register live data feeds in engine status
ENGINE_STATUS["yfinance"] = "available"
ENGINE_STATUS["espn_scores"] = "available"
ENGINE_STATUS["odds_api"] = "available" if os.environ.get("ODDS_API_KEY") else "no_api_key"
ENGINE_STATUS["polygon"] = "available" if os.environ.get("POLYGON_API_KEY") else "no_api_key"
ENGINE_STATUS["newsapi"] = "available" if os.environ.get("NEWSAPI_KEY") else "no_api_key"
ENGINE_STATUS["finbert"] = "pending"  # lazy-loaded on first sentiment call
ENGINE_STATUS["fred"] = "available" if os.environ.get("FRED_API_KEY") else "no_api_key"

# ── Request/Response Models ──────────────────────────────────────────────────

class APIResponse(BaseModel):
    """Standard API response wrapper."""
    status: str = Field(..., description="'ok' or 'error'")
    data_status: str = Field(
        default="live",
        description="'live' = real data, 'empty' = no results found, "
                    "'degraded' = partial data (API key missing/rate-limited), "
                    "'unavailable' = data source down",
    )
    data: Optional[Dict[str, Any]] = Field(None, description="Response payload")
    engine: Optional[str] = Field(None, description="Engine that handled the request")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    message: Optional[str] = Field(None, description="Error message if status is 'error'")
    traceback: Optional[str] = Field(None, description="Stack trace if available (dev only)")


class PortfolioOptimizeRequest(BaseModel):
    tickers: List[str] = Field(..., description="List of stock tickers")
    start: str = Field(..., description="Start date (YYYY-MM-DD)")
    method: str = Field(default="CVaR", description="Optimization method")
    objective: str = Field(default="MinRisk", description="Optimization objective")


class ForecastRequest(BaseModel):
    start: str = Field(..., description="Start date (YYYY-MM-DD)")
    horizon: int = Field(default=30, description="Forecast horizon in days")
    model_key: str = Field(default="bolt-small", description="Model key")


class ForecastMultiRequest(BaseModel):
    tickers: List[str] = Field(..., description="List of tickers")
    start: str = Field(..., description="Start date (YYYY-MM-DD)")
    horizon: int = Field(default=30, description="Forecast horizon")


class AnomalyScanRequest(BaseModel):
    n: int = Field(default=100, description="Number of entities")
    scenario: str = Field(default="default", description="Scenario name")
    include_anomalies: bool = Field(default=True, description="Include anomalies")


class AnomalyAnalyzeRequest(BaseModel):
    entities: List[Dict[str, Any]] = Field(..., description="List of entity dicts")


class ThreatRankRequest(BaseModel):
    entities: List[Dict[str, Any]] = Field(..., description="List of entities")
    min_score: int = Field(default=0, description="Minimum threat score")


class ClusteringRequest(BaseModel):
    entities: List[Dict[str, Any]] = Field(..., description="List of entities")
    eps_nm: float = Field(default=30.0, description="Epsilon in nautical miles")
    min_pts: int = Field(default=3, description="Minimum points")


class LinksGraphRequest(BaseModel):
    entities: List[Dict[str, Any]] = Field(..., description="List of entities")


class KalmanTrackRequest(BaseModel):
    tracks: Dict[str, Any] = Field(..., description="Track data")


class ExplainThreatRequest(BaseModel):
    entity: Dict[str, Any] = Field(..., description="Entity dict")
    threat_result: Dict[str, Any] = Field(..., description="Threat result dict")


# ── FastAPI App Setup ────────────────────────────────────────────────────────

app = FastAPI(
    title="Quadratic API",
    description="Unified REST API for Quadratic analytical engines",
    version="1.1.0",
    dependencies=[Depends(verify_api_key)],
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ── Request/Response Logging Middleware ──────────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    log.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    return response


# ── Helper Functions ────────────────────────────────────────────────────────

def ok_response(
    data: Any, engine: str = None, message: str = None,
    data_status: str = "live",
) -> APIResponse:
    """Create a successful response.

    data_status values:
      - 'live'        — real data returned successfully
      - 'empty'       — query succeeded but found no results
      - 'degraded'    — partial data (e.g. API key missing, rate-limited)
      - 'unavailable' — data source is down or unreachable
    """
    return APIResponse(
        status="ok",
        data_status=data_status,
        data=data,
        engine=engine,
        message=message,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


def error_response(
    message: str, engine: str = None, include_traceback: bool = False,
    data_status: str = "unavailable",
) -> APIResponse:
    """Create an error response."""
    tb = traceback.format_exc() if include_traceback else None
    return APIResponse(
        status="error",
        data_status=data_status,
        message=message,
        engine=engine,
        traceback=tb,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


# ── Health & Status Endpoints ────────────────────────────────────────────────

@app.get("/", response_model=APIResponse)
async def health_check():
    """Health check endpoint."""
    return ok_response(
        data={"message": "Quadratic API is running", "engines": len(ENGINE_STATUS)},
        engine="system",
    )


@app.get("/api/status", response_model=APIResponse)
async def get_status():
    """Get status of all engines."""
    return ok_response(
        data={
            "engines": ENGINE_STATUS,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "port": PORT,
        },
        engine="system",
    )


# ── Portfolio Optimization Endpoints ─────────────────────────────────────────

@app.post("/api/portfolio/optimize", response_model=APIResponse)
async def optimize_portfolio(req: PortfolioOptimizeRequest):
    """Optimize portfolio using specified method."""
    if portfolio_engine is None:
        raise HTTPException(
            status_code=503,
            detail=error_response(
                "Portfolio engine not available", engine="portfolio"
            ).dict(),
        )

    try:
        # Call the optimize function from the engine
        if not hasattr(portfolio_engine, "optimize"):
            raise ValueError("Engine missing optimize() function")

        # For now, return a placeholder; in production, call the actual engine
        result = {
            "method": req.method,
            "objective": req.objective,
            "tickers": req.tickers,
            "weights": {t: 1.0 / len(req.tickers) for t in req.tickers},
            "expected_return": 0.12,
            "risk": 0.08,
        }

        return ok_response(data=result, engine="portfolio")

    except Exception as e:
        log.error(f"Portfolio optimization error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(
                f"Optimization failed: {str(e)}", engine="portfolio"
            ).dict(),
        )


@app.get("/api/portfolio/returns")
async def get_portfolio_returns(
    tickers: str = None, start: str = None
) -> APIResponse:
    """Get historical returns for tickers via yfinance."""
    try:
        if not tickers:
            raise ValueError("tickers parameter required (comma-separated)")

        ticker_list = [t.strip() for t in tickers.split(",")]
        returns = {}
        for t in ticker_list:
            prices = data_feeds.get_price_history(t, days=90)
            if prices and len(prices) > 1:
                arr = np.array(prices)
                daily_ret = list(np.diff(arr) / arr[:-1])
                returns[t] = [round(float(r), 6) for r in daily_ret]
            else:
                returns[t] = []

        return ok_response(
            data={"tickers": ticker_list, "returns": returns},
            engine="yfinance",
        )

    except Exception as e:
        log.error(f"Returns fetch error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Failed to fetch returns: {str(e)}").dict(),
        )


@app.get("/api/market/info/{symbol}", response_model=APIResponse)
async def get_market_info(symbol: str):
    """Get stock info (name, sector, market cap) via yfinance."""
    try:
        result = data_feeds.get_stock_info(symbol)
        return ok_response(data=result, engine="yfinance")
    except Exception as e:
        log.error(f"Stock info error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Failed to fetch info: {str(e)}").dict(),
        )


# ── Forecasting Endpoints ────────────────────────────────────────────────────

@app.post("/api/forecast/{symbol}", response_model=APIResponse)
async def forecast_single(symbol: str, req: ForecastRequest):
    """Forecast a single symbol using real price history + drift model."""
    # ── Per-Asset Sigma Multipliers (calibrated 2026-04-04) ──
    SIGMA_MULTIPLIERS = {
        "AAPL": 1.45, "COIN": 1.30, "PLTR": 1.25, "SHOP": 1.25,
        "META": 1.20, "NVDA": 1.20, "AMZN": 1.15, "AMD": 1.15,
        "UBER": 1.15, "TSLA": 1.15, "GOOGL": 1.10, "MSFT": 1.05,
        "SOL": 1.10, "BTC": 1.05, "ETH": 1.00,
    }
    DEFAULT_SIGMA_MULTIPLIER = 1.15

    # Anti-predictive assets: still show forecast bands, suppress signal label
    EXCLUDED_FROM_SIGNALS = {"AMD"}
    EXCLUDE_REASON = {
        "AMD": "Model anti-predictive (28% accuracy < 50% baseline)",
    }

    # VIX regime override thresholds
    VIX_THRESHOLDS = {35: 1.60, 25: 1.30}

    try:
        prices = data_feeds.get_price_history(symbol, days=120)
        if not prices or len(prices) < 10:
            return ok_response(
                data={"symbol": symbol, "error": f"Not enough price history for {symbol}"},
                engine="forecasting",
                data_status="empty",
                message=f"Insufficient price history for {symbol} ({len(prices) if prices else 0} days)",
            )

        # Log-return drift + volatility model
        arr = np.array(prices)
        log_returns = np.diff(np.log(arr))
        mu = float(np.mean(log_returns))
        sigma_raw = float(np.std(log_returns))
        last_price = float(arr[-1])

        # Per-asset sigma multiplier
        sym_upper = symbol.upper().replace("-USD", "")
        base_mult = SIGMA_MULTIPLIERS.get(sym_upper, DEFAULT_SIGMA_MULTIPLIER)

        # VIX regime override — fetch current VIX
        vix_mult = 1.0
        vix_value = None
        try:
            vix_data = await fred_feed.get_series("VIXCLS", limit=1)
            vix_value = vix_data.get("latest", {}).get("value")
            if vix_value is not None:
                for threshold in sorted(VIX_THRESHOLDS.keys(), reverse=True):
                    if vix_value > threshold:
                        vix_mult = VIX_THRESHOLDS[threshold]
                        break
        except Exception as e:
            log.debug(f"VIX fetch failed (using base multiplier only): {e}")

        vol_scale = base_mult * vix_mult
        sigma = sigma_raw * vol_scale

        # Monte Carlo median path + confidence bands (applied BEFORE generating paths)
        n_sims = 500
        horizon = req.horizon
        sims = np.zeros((n_sims, horizon))
        for i in range(n_sims):
            shocks = np.random.normal(mu, sigma, horizon)
            sims[i] = last_price * np.exp(np.cumsum(shocks))

        median = np.median(sims, axis=0)
        upper = np.percentile(sims, 90, axis=0)
        lower = np.percentile(sims, 10, axis=0)

        result = {
            "symbol": symbol.upper(),
            "horizon": horizon,
            "model": "log-normal-mc",
            "last_price": last_price,
            "mu_daily": round(mu, 6),
            "sigma_raw": round(sigma_raw, 6),
            "sigma_daily": round(sigma, 6),
            "volatility_scale": round(vol_scale, 3),
            "base_multiplier": base_mult,
            "vix_multiplier": vix_mult,
            "vix_value": vix_value,
            "forecast": {
                "median": [round(float(v), 2) for v in median],
                "upper": [round(float(v), 2) for v in upper],
                "lower": [round(float(v), 2) for v in lower],
            },
        }

        # P5: Per-asset accuracy weights
        HISTORICAL_ACCURACY = {
            "MSFT": 0.76, "GOOGL": 0.64, "UBER": 0.64, "COIN": 0.64,
            "TSLA": 0.60, "ETH": 0.578, "BTC": 0.556, "SOL": 0.489,
            "SHOP": 0.52, "PLTR": 0.48, "NVDA": 0.44, "AAPL": 0.44,
            "META": 0.44, "AMZN": 0.44, "AMD": 0.28,
        }
        hist_acc = HISTORICAL_ACCURACY.get(sym_upper)
        conf_weight = max(0, (hist_acc - 0.50) / 0.50) if hist_acc is not None else 0.5
        result["historical_accuracy"] = hist_acc
        result["confidence_weight"] = round(conf_weight, 3)
        result["model_confidence_pct"] = round(conf_weight * 100, 1)

        # Flag signal-excluded assets: still show forecast, suppress signal label
        warning = None
        if sym_upper in EXCLUDED_FROM_SIGNALS:
            reason = EXCLUDE_REASON.get(sym_upper, "Anti-predictive")
            result["signal_suppressed"] = True
            result["suppress_reason"] = reason
            result["signal"] = f"SIGNAL SUPPRESSED — {reason}"
            warning = f"{sym_upper}: SIGNAL SUPPRESSED — {reason}"
        else:
            result["signal_suppressed"] = False

        return ok_response(data=result, engine="forecasting", message=warning)

    except Exception as e:
        log.error(f"Forecast error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Forecast failed: {str(e)}", engine="forecasting").dict(),
        )


@app.post("/api/forecast/multi", response_model=APIResponse)
async def forecast_multi(req: ForecastMultiRequest):
    """Forecast multiple symbols."""
    if forecasting_engine is None:
        raise HTTPException(
            status_code=503,
            detail=error_response(
                "Forecasting engine not available", engine="forecasting"
            ).dict(),
        )

    try:
        # Placeholder implementation
        forecasts = {}
        for ticker in req.tickers:
            forecasts[ticker] = {
                "forecast": [100.0 + i * 0.5 for i in range(req.horizon)],
                "model": "ensemble",
            }

        return ok_response(data=forecasts, engine="forecasting")

    except Exception as e:
        log.error(f"Multi-forecast error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(
                f"Multi-forecast failed: {str(e)}", engine="forecasting"
            ).dict(),
        )


# ── Market Data Endpoints ────────────────────────────────────────────────────

@app.get("/api/market/ohlcv/{symbol}", response_model=APIResponse)
async def get_ohlcv(symbol: str, period: str = "3mo", interval: str = "1d"):
    """Get real OHLCV data for a symbol via yfinance."""
    try:
        result = data_feeds.get_ohlcv(symbol, period=period, interval=interval)
        if "error" in result:
            ds = "empty" if "No data" in result["error"] else "unavailable"
            return ok_response(data=result, engine="yfinance", message=result["error"], data_status=ds)
        return ok_response(data=result, engine="yfinance")

    except Exception as e:
        log.error(f"OHLCV fetch error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Failed to fetch OHLCV: {str(e)}").dict(),
        )


# ── Anomaly Detection Endpoints ──────────────────────────────────────────────

@app.post("/api/anomaly/scan", response_model=APIResponse)
async def scan_anomalies(req: AnomalyScanRequest):
    """Scan for anomalies in entities."""
    if anomaly_engine is None:
        raise HTTPException(
            status_code=503,
            detail=error_response(
                "Anomaly engine not available", engine="anomaly"
            ).dict(),
        )

    try:
        # Placeholder implementation
        result = {
            "n_scanned": req.n,
            "anomalies_found": [
                {"uid": f"entity_{i}", "score": 0.85, "type": "statistical"}
                for i in range(int(req.n * 0.05))
            ],
            "scenario": req.scenario,
        }

        return ok_response(data=result, engine="anomaly")

    except Exception as e:
        log.error(f"Anomaly scan error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Scan failed: {str(e)}", engine="anomaly").dict(),
        )


@app.post("/api/anomaly/analyze", response_model=APIResponse)
async def analyze_anomalies(req: AnomalyAnalyzeRequest):
    """Analyze specific entities for anomalies."""
    if anomaly_engine is None:
        raise HTTPException(
            status_code=503,
            detail=error_response(
                "Anomaly engine not available", engine="anomaly"
            ).dict(),
        )

    try:
        # Placeholder implementation
        results = []
        for entity in req.entities:
            results.append({
                "uid": entity.get("uid"),
                "anomaly_score": 0.45,
                "flags": ["unusual_behavior"],
            })

        return ok_response(data={"results": results}, engine="anomaly")

    except Exception as e:
        log.error(f"Anomaly analysis error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Analysis failed: {str(e)}", engine="anomaly").dict(),
        )


# ── Threat Analysis Endpoints ────────────────────────────────────────────────

@app.post("/api/threat/rank", response_model=APIResponse)
async def rank_threats(req: ThreatRankRequest):
    """Rank entities by threat score."""
    if threat_engine is None:
        raise HTTPException(
            status_code=503,
            detail=error_response(
                "Threat engine not available", engine="threat"
            ).dict(),
        )

    try:
        # Placeholder implementation
        ranked = []
        for entity in req.entities:
            score = 0.5  # Calculate actual score in production
            if score >= req.min_score:
                ranked.append({
                    "uid": entity.get("uid"),
                    "threat_score": score,
                    "risk_level": "medium",
                })

        ranked.sort(key=lambda x: x["threat_score"], reverse=True)
        return ok_response(data={"threats": ranked}, engine="threat")

    except Exception as e:
        log.error(f"Threat ranking error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Ranking failed: {str(e)}", engine="threat").dict(),
        )


# ── Clustering Endpoints ─────────────────────────────────────────────────────

@app.post("/api/clustering/dbscan", response_model=APIResponse)
async def cluster_dbscan(req: ClusteringRequest):
    """Cluster entities using DBSCAN."""
    if clustering_engine is None:
        raise HTTPException(
            status_code=503,
            detail=error_response(
                "Clustering engine not available", engine="clustering"
            ).dict(),
        )

    try:
        # Placeholder implementation
        result = {
            "n_clusters": 3,
            "n_noise": 2,
            "clusters": {
                "0": ["entity_0", "entity_1"],
                "1": ["entity_2", "entity_3"],
                "2": ["entity_4"],
            },
        }

        return ok_response(data=result, engine="clustering")

    except Exception as e:
        log.error(f"Clustering error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Clustering failed: {str(e)}", engine="clustering").dict(),
        )


# ── Link Analysis Endpoints ──────────────────────────────────────────────────

@app.post("/api/links/graph", response_model=APIResponse)
async def build_graph(req: LinksGraphRequest):
    """Build entity relationship graph."""
    if link_analysis_engine is None:
        raise HTTPException(
            status_code=503,
            detail=error_response(
                "Link analysis engine not available", engine="link_analysis"
            ).dict(),
        )

    try:
        # Placeholder implementation
        result = {
            "nodes": [{"id": e.get("uid"), "label": "entity"} for e in req.entities],
            "edges": [
                {"source": "entity_0", "target": "entity_1", "weight": 0.8},
            ],
            "metrics": {
                "density": 0.45,
                "centrality": {"entity_0": 0.9, "entity_1": 0.7},
            },
        }

        return ok_response(data=result, engine="link_analysis")

    except Exception as e:
        log.error(f"Link analysis error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Graph build failed: {str(e)}", engine="link_analysis").dict(),
        )


# ── Kalman Filtering Endpoints ───────────────────────────────────────────────

@app.post("/api/kalman/track", response_model=APIResponse)
async def track_kalman(req: KalmanTrackRequest):
    """Run Kalman filtering on track data."""
    if kalman_engine is None:
        raise HTTPException(
            status_code=503,
            detail=error_response(
                "Kalman engine not available", engine="kalman"
            ).dict(),
        )

    try:
        # Placeholder implementation
        result = {
            "smoothed_tracks": req.tracks,
            "rmse": 0.15,
        }

        return ok_response(data=result, engine="kalman")

    except Exception as e:
        log.error(f"Kalman filtering error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Filtering failed: {str(e)}", engine="kalman").dict(),
        )


# ── Explainability Endpoints ────────────────────────────────────────────────

@app.post("/api/explain/threat", response_model=APIResponse)
async def explain_threat(req: ExplainThreatRequest):
    """Explain threat score attribution."""
    if explain_engine is None:
        raise HTTPException(
            status_code=503,
            detail=error_response(
                "Explain engine not available", engine="explain"
            ).dict(),
        )

    try:
        # Placeholder implementation
        result = {
            "entity_uid": req.entity.get("uid"),
            "threat_score": req.threat_result.get("score", 0.5),
            "attributions": {
                "anomaly_score": 0.3,
                "behavioral_flags": 0.4,
                "network_position": 0.3,
            },
            "explanation": "High threat due to anomalous behavior pattern.",
        }

        return ok_response(data=result, engine="explain")

    except Exception as e:
        log.error(f"Explainability error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Explanation failed: {str(e)}", engine="explain").dict(),
        )


# ── Market Intelligence Endpoints ────────────────────────────────────────────

@app.get("/api/predictions/scan", response_model=APIResponse)
async def scan_predictions():
    """Scan for cross-market opportunities using live odds."""
    try:
        # Scan top leagues for value bets as "predictions"
        leagues_to_scan = ["epl", "nba", "laliga", "champions-league"]
        all_bets = []
        for league in leagues_to_scan:
            bets = await data_feeds.find_value_bets(league, min_edge=0.03)
            all_bets.extend(bets)

        all_bets.sort(key=lambda x: x.get("edge", 0), reverse=True)

        ds = "live"
        if not ODDS_API_KEY:
            ds = "degraded"
        elif not all_bets:
            ds = "empty"

        result = {
            "leagues_scanned": len(leagues_to_scan),
            "opportunities_found": len(all_bets),
            "top_opportunities": all_bets[:10],
            "scan_time": datetime.now(timezone.utc).isoformat(),
        }

        return ok_response(data=result, engine="odds_scanner", data_status=ds)

    except Exception as e:
        log.error(f"Prediction market scan error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(
                f"Market scan failed: {str(e)}", engine="odds_scanner"
            ).dict(),
        )


@app.get("/api/sports/scores/{league}", response_model=APIResponse)
async def get_sports_scores(league: str):
    """Get live sports scores from ESPN."""
    try:
        result = await data_feeds.get_live_scores(league)
        if "error" in result:
            ds = "empty" if "No scoreboard" in result["error"] else "unavailable"
            return ok_response(data=result, engine="espn", message=result["error"], data_status=ds)
        if not result.get("games"):
            return ok_response(data=result, engine="espn", data_status="empty")
        return ok_response(data=result, engine="espn")

    except Exception as e:
        log.error(f"Sports scores error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Scores fetch failed: {str(e)}").dict(),
        )


@app.get("/api/sports/odds/{league}", response_model=APIResponse)
async def get_sports_odds(league: str, markets: str = "h2h"):
    """Get live betting odds from The Odds API."""
    try:
        result = await data_feeds.get_odds(league, markets=markets)
        if "error" in result:
            # Distinguish why there's no data
            err = result["error"]
            if "API key" in err or "401" in err:
                ds = "degraded"
            elif "Rate limited" in err or "429" in err:
                ds = "degraded"
            elif "No events" in err or "422" in err:
                ds = "empty"
            else:
                ds = "unavailable"
            return ok_response(data=result, engine="odds_api", message=err, data_status=ds)
        if not result.get("events"):
            return ok_response(data=result, engine="odds_api", data_status="empty")
        return ok_response(data=result, engine="odds_api")

    except Exception as e:
        log.error(f"Odds fetch error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Odds fetch failed: {str(e)}").dict(),
        )


@app.get("/api/sports/value-bets/{league}", response_model=APIResponse)
async def get_value_bets(league: str, min_edge: float = 0.05):
    """Find value bets where bookmaker odds diverge."""
    try:
        bets = await data_feeds.find_value_bets(league, min_edge=min_edge)
        ds = "live" if bets else "empty"
        if not ODDS_API_KEY:
            ds = "degraded"
        return ok_response(
            data={"league": league, "min_edge_pct": min_edge * 100, "value_bets": bets, "count": len(bets)},
            engine="odds_api",
            data_status=ds,
        )

    except Exception as e:
        log.error(f"Value bet scan error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Value bet scan failed: {str(e)}").dict(),
        )


# ── Sentinel Configuration Endpoints ─────────────────────────────────────────

sentinel_config = {
    "threat_threshold": 0.7,
    "anomaly_threshold": 0.6,
    "check_interval_sec": 60,
    "enabled": True,
    "bankroll_eur": 5000,
    "min_edge_pct": 8,
    "max_kelly_pct": 5,
}

# Alert cache to avoid spamming exhausted APIs on every dashboard refresh
_sentinel_alert_cache = []
_sentinel_cache_ts = 0
_SENTINEL_CACHE_TTL = 300  # 5 minutes


@app.post("/api/sentinel/config", response_model=APIResponse)
async def update_sentinel_config(config: Dict[str, Any]):
    """Update sentinel configuration."""
    try:
        global sentinel_config
        sentinel_config.update(config)
        log.info(f"Sentinel config updated: {config}")

        return ok_response(
            data={"new_config": sentinel_config}, engine="sentinel"
        )

    except Exception as e:
        log.error(f"Sentinel config error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Config update failed: {str(e)}", engine="sentinel").dict(),
        )


@app.get("/api/sentinel/status", response_model=APIResponse)
async def get_sentinel_status():
    """Get sentinel operational status."""
    try:
        result = {
            "running": True,
            "enabled": sentinel_config.get("enabled", True),
            "config": {
                **sentinel_config,
                "bankroll_eur": sentinel_config.get("bankroll_eur", 5000),
                "min_edge_pct": sentinel_config.get("min_edge_pct", 8),
                "max_kelly_pct": sentinel_config.get("max_kelly_pct", 5),
            },
            "scanners": {
                "forecast": {"status": "active", "interval": "5m", "last_run": datetime.now(timezone.utc).isoformat()},
                "portfolio": {"status": "active", "interval": "15m", "last_run": datetime.now(timezone.utc).isoformat()},
                "prediction": {"status": "active", "interval": "10m", "last_run": datetime.now(timezone.utc).isoformat()},
                "sports": {"status": "degraded" if not os.environ.get("ODDS_API_KEY") else "active", "interval": "15m", "last_run": datetime.now(timezone.utc).isoformat()},
                "macro": {"status": "active" if os.environ.get("FRED_API_KEY") else "degraded", "interval": "60m", "last_run": datetime.now(timezone.utc).isoformat()},
            },
            "last_check": datetime.now(timezone.utc).isoformat(),
            "alerts_pending": len(_sentinel_alert_cache),
        }

        return ok_response(data=result, engine="sentinel")

    except Exception as e:
        log.error(f"Sentinel status error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Status fetch failed: {str(e)}", engine="sentinel").dict(),
        )


@app.get("/api/sentinel/alerts", response_model=APIResponse)
async def get_sentinel_alerts(type: str = None):
    """Get sentinel alerts — pulls live value bets as betting alerts with caching."""
    import time as _time

    global _sentinel_alert_cache, _sentinel_cache_ts

    try:
        now_ts = _time.time()

        # Use cache if still fresh (avoids spamming exhausted Odds API on every refresh)
        if _sentinel_cache_ts > 0 and now_ts - _sentinel_cache_ts < _SENTINEL_CACHE_TTL:
            alerts = list(_sentinel_alert_cache)
        else:
            alerts = []
            now = datetime.now(timezone.utc).isoformat()

            # Scan for value bet alerts across leagues
            for league in ["epl", "laliga", "nba", "champions-league"]:
                try:
                    bets = await data_feeds.find_value_bets(league, min_edge=0.05)
                except Exception as scan_err:
                    log.debug(f"Value bet scan skipped for {league}: {scan_err}")
                    continue
                for i, bet in enumerate(bets):
                    severity = "critical" if bet.get("edge", 0) > 15 else "high" if bet.get("edge", 0) > 10 else "medium"
                    alerts.append({
                        "id": f"vb_{league}_{i}",
                        "type": "value_bet",
                        "severity": severity,
                        "league": league,
                        "match": bet.get("match"),
                        "outcome": bet.get("outcome"),
                        "best_odds": bet.get("best_odds"),
                        "bookmaker": bet.get("bookmaker"),
                        "edge_pct": bet.get("edge"),
                        "commence": bet.get("commence"),
                        "timestamp": now,
                        "message": f"Value bet: {bet.get('outcome')} in {bet.get('match')} @ {bet.get('best_odds')} ({bet.get('edge')}% edge)",
                    })

            _sentinel_alert_cache = alerts
            _sentinel_cache_ts = now_ts

        # Filter by type if requested
        if type:
            alerts = [a for a in alerts if a["type"] == type]

        alerts.sort(key=lambda x: x.get("edge_pct", 0), reverse=True)

        result = {
            "total_alerts": len(alerts),
            "recent": alerts[:20],
        }

        return ok_response(data=result, engine="sentinel")

    except Exception as e:
        log.error(f"Sentinel alerts error: {e}")
        raise HTTPException(
            status_code=500,
            detail=error_response(f"Alerts fetch failed: {str(e)}", engine="sentinel").dict(),
        )


# ── Polygon.io Endpoints ────────────────────────────────────────────────────

@app.get("/api/polygon/bars/{symbol}", response_model=APIResponse)
async def polygon_bars(
    symbol: str, multiplier: int = 1, timespan: str = "day",
    from_date: str = None, to_date: str = None, limit: int = 200,
):
    """Real-time OHLCV bars from Polygon.io."""
    try:
        result = await polygon_feed.get_bars(symbol, multiplier, timespan, from_date, to_date, limit)
        return ok_response(data=result, engine="polygon")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Polygon bars failed: {e}").dict())


@app.get("/api/polygon/snapshot/{symbol}", response_model=APIResponse)
async def polygon_snapshot(symbol: str):
    """Real-time stock snapshot (last trade, bid/ask, daily stats)."""
    try:
        result = await polygon_feed.get_snapshot(symbol)
        return ok_response(data=result, engine="polygon")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Snapshot failed: {e}").dict())


@app.get("/api/polygon/snapshots", response_model=APIResponse)
async def polygon_multi_snapshot(tickers: str = "AAPL,MSFT,GOOGL,TSLA,NVDA"):
    """Multi-ticker snapshots for watchlist."""
    try:
        symbols = [s.strip() for s in tickers.split(",")]
        result = await polygon_feed.get_multi_snapshot(symbols)
        return ok_response(data=result, engine="polygon")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Multi-snapshot failed: {e}").dict())


@app.get("/api/polygon/options/{symbol}", response_model=APIResponse)
async def polygon_options(symbol: str, expiration_date: str = None, contract_type: str = None):
    """Options chain for a symbol."""
    try:
        result = await polygon_feed.get_options_chain(symbol, expiration_date, contract_type)
        return ok_response(data=result, engine="polygon")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Options chain failed: {e}").dict())


@app.get("/api/polygon/options/snapshot/{symbol}", response_model=APIResponse)
async def polygon_option_snapshot(symbol: str):
    """Options snapshot with greeks."""
    try:
        result = await polygon_feed.get_option_snapshot(symbol)
        return ok_response(data=result, engine="polygon")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Option snapshot failed: {e}").dict())


@app.get("/api/polygon/financials/{symbol}", response_model=APIResponse)
async def polygon_financials(symbol: str, timeframe: str = "annual", limit: int = 4):
    """Company financials (income statement, balance sheet, cash flow)."""
    try:
        result = await polygon_feed.get_financials(symbol, timeframe, limit)
        return ok_response(data=result, engine="polygon")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Financials failed: {e}").dict())


@app.get("/api/polygon/details/{symbol}", response_model=APIResponse)
async def polygon_details(symbol: str):
    """Ticker details (sector, market cap, description, branding)."""
    try:
        result = await polygon_feed.get_ticker_details(symbol)
        return ok_response(data=result, engine="polygon")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Details failed: {e}").dict())


@app.get("/api/polygon/news/{symbol}", response_model=APIResponse)
async def polygon_news(symbol: str, limit: int = 10):
    """Ticker-specific news articles."""
    try:
        result = await polygon_feed.get_ticker_news(symbol, limit)
        return ok_response(data=result, engine="polygon")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"News failed: {e}").dict())


@app.get("/api/polygon/crypto/{symbol}", response_model=APIResponse)
async def polygon_crypto(symbol: str = "X:BTCUSD"):
    """Crypto snapshot."""
    try:
        result = await polygon_feed.get_crypto_snapshot(symbol)
        return ok_response(data=result, engine="polygon")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Crypto failed: {e}").dict())


@app.get("/api/polygon/forex/{pair}", response_model=APIResponse)
async def polygon_forex(pair: str = "C:EURUSD"):
    """Forex pair snapshot."""
    try:
        result = await polygon_feed.get_forex_snapshot(pair)
        return ok_response(data=result, engine="polygon")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Forex failed: {e}").dict())


# ── News & Sentiment Endpoints ──────────────────────────────────────────────

@app.get("/api/news/headlines", response_model=APIResponse)
async def news_headlines(query: str = None, category: str = "business", limit: int = 20):
    """Top news headlines, optionally filtered by query."""
    try:
        result = await news_feed.get_headlines(query=query, category=category, limit=limit)
        ds = "live"
        if not os.environ.get("NEWSAPI_KEY"):
            ds = "degraded"
        elif not result.get("articles"):
            ds = "empty"
        return ok_response(data=result, engine="newsapi", data_status=ds)
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Headlines failed: {e}").dict())


@app.get("/api/news/sentiment/{symbol}", response_model=APIResponse)
async def ticker_sentiment(symbol: str, days: int = 7, limit: int = 15):
    """Per-article FinBERT sentiment for a ticker's recent news."""
    try:
        result = await news_feed.get_ticker_sentiment(symbol, days=days, limit=limit)
        # Update FinBERT status on first successful call
        if result.get("sentiment_summary", {}).get("method"):
            ENGINE_STATUS["finbert"] = result["sentiment_summary"]["method"]
        return ok_response(data=result, engine="finbert")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Sentiment failed: {e}").dict())


@app.get("/api/news/market-mood", response_model=APIResponse)
async def market_mood(tickers: str = None):
    """Cross-ticker sentiment for market mood gauge."""
    try:
        watchlist = [s.strip() for s in tickers.split(",")] if tickers else None
        result = await news_feed.get_market_mood(watchlist=watchlist)
        return ok_response(data=result, engine="finbert")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Market mood failed: {e}").dict())


@app.get("/api/news/geopolitical", response_model=APIResponse)
async def geopolitical_news(limit: int = 15):
    """Geopolitical news feed for intelligence engine."""
    try:
        result = await news_feed.get_geopolitical_news(limit=limit)
        return ok_response(data=result, engine="newsapi+finbert")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Geopolitical news failed: {e}").dict())


@app.post("/api/sentiment/score", response_model=APIResponse)
async def score_text_sentiment(text: str):
    """Score arbitrary text with FinBERT."""
    try:
        result = await news_feed.score_sentiment(text)
        return ok_response(data=result, engine="finbert")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Sentiment scoring failed: {e}").dict())


# ── FRED Macro Endpoints ────────────────────────────────────────────────────

@app.get("/api/macro/dashboard", response_model=APIResponse)
async def macro_dashboard():
    """Full macro dashboard — all key indicators + regime detection."""
    try:
        result = await fred_feed.get_macro_dashboard()
        ds = "live" if os.environ.get("FRED_API_KEY") else "degraded"
        return ok_response(data=result, engine="fred", data_status=ds)
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Macro dashboard failed: {e}").dict())


@app.get("/api/macro/series/{series_id}", response_model=APIResponse)
async def macro_series(series_id: str, limit: int = 60, frequency: str = None):
    """Fetch any FRED series by ID."""
    try:
        result = await fred_feed.get_series(series_id, limit=limit, frequency=frequency)
        return ok_response(data=result, engine="fred")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"FRED series failed: {e}").dict())


@app.get("/api/macro/rates", response_model=APIResponse)
async def macro_rates():
    """Interest rates bundle (Fed rate, treasuries, yield spread)."""
    try:
        result = await fred_feed.get_rates_bundle()
        return ok_response(data=result, engine="fred")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Rates bundle failed: {e}").dict())


@app.get("/api/macro/inflation", response_model=APIResponse)
async def macro_inflation():
    """Inflation indicators (CPI, Core CPI, PCE)."""
    try:
        result = await fred_feed.get_inflation_bundle()
        return ok_response(data=result, engine="fred")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Inflation bundle failed: {e}").dict())


@app.get("/api/macro/labor", response_model=APIResponse)
async def macro_labor():
    """Labor market indicators (unemployment, payrolls, claims)."""
    try:
        result = await fred_feed.get_labor_bundle()
        return ok_response(data=result, engine="fred")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Labor bundle failed: {e}").dict())


@app.get("/api/macro/risk", response_model=APIResponse)
async def macro_risk():
    """Risk indicators (VIX, credit spreads, USD index)."""
    try:
        result = await fred_feed.get_risk_indicators()
        return ok_response(data=result, engine="fred")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Risk indicators failed: {e}").dict())


@app.get("/api/macro/regime", response_model=APIResponse)
async def macro_regime():
    """Current macro regime detection (risk_on / cautious / risk_off)."""
    try:
        dashboard = await fred_feed.get_macro_dashboard()
        regime = dashboard.get("regime", {})
        return ok_response(data=regime, engine="fred")
    except Exception as e:
        raise HTTPException(status_code=500, detail=error_response(f"Regime detection failed: {e}").dict())


# ── Error Handlers ───────────────────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    log.error(f"HTTP {exc.status_code}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail if isinstance(exc.detail, dict) else {"error": str(exc.detail)},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions."""
    log.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=error_response(
            f"Internal server error: {str(exc)}", include_traceback=True
        ).dict(),
    )


# ── Lifespan Events ──────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """Log startup information."""
    log.info("=" * 80)
    log.info("Quadratic API Server Starting")
    log.info(f"Port: {PORT}")
    log.info(f"Log Level: {LOG_LEVEL}")
    log.info(f"Auth: {'API key required' if API_KEY else 'OPEN (set QUADRATIC_API_KEY to secure)'}")
    log.info(f"Engines Available: {sum(1 for v in ENGINE_STATUS.values() if v == 'available')}")
    log.info(f"Engine Status: {ENGINE_STATUS}")
    log.info("=" * 80)


@app.on_event("shutdown")
async def shutdown_event():
    """Log shutdown."""
    log.info("Quadratic API Server Shutting Down")


# ── Main Entry Point ────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    log.info(f"Starting Quadratic API on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
