"""
Training Router — trigger, monitor, and export DRL agent training runs.

Endpoints:
    POST /api/v1/training/train/{symbol}   — start training run for a symbol
    POST /api/v1/training/train/custom      — train on custom OHLCV data
    GET  /api/v1/training/models            — list saved models
    GET  /api/v1/training/weights/{name}    — download TFJS-compatible weights
    GET  /api/v1/training/status            — training infrastructure health check
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import numpy as np

from engines import drl_training

log = logging.getLogger("mss.api.routers.training")

router = APIRouter(prefix="/api/v1/training", tags=["training"])


# ── Request models ───────────────────────────────────────────────────────────

class TrainRequest(BaseModel):
    """Request body for training with custom data."""
    closes: list[float] = Field(..., min_length=100, description="Close prices (oldest first)")
    highs: list[float] = Field(..., min_length=100, description="High prices")
    lows: list[float] = Field(..., min_length=100, description="Low prices")
    opens: list[float] = Field(..., min_length=100, description="Open prices")
    volumes: list[float] = Field(..., min_length=100, description="Volumes")
    symbol: str = Field(default="CUSTOM", description="Symbol label")
    algorithm: str = Field(default="PPO", description="PPO, A2C, or SAC")
    timesteps: int = Field(default=50000, ge=1000, le=1_000_000)
    learning_rate: float = Field(default=3e-4, gt=0, lt=1)


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/train/{symbol}")
async def train_symbol(
    symbol: str,
    algorithm: str = Query(default="PPO", description="PPO, A2C, or SAC"),
    timesteps: int = Query(default=50000, ge=1000, le=1_000_000),
    period: str = Query(default="2y", description="OHLCV lookback period"),
    learning_rate: float = Query(default=3e-4, gt=0, lt=1),
):
    """
    Train a DRL agent on a symbol's OHLCV data.

    Fetches data from the market pipeline, trains the agent,
    and auto-exports TFJS-compatible weights.
    """
    # Fetch OHLCV data
    from normalizers_bridge import get_ohlcv_prices

    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval="1d", auto_adjust=False)

        if df.empty or len(df) < 100:
            raise HTTPException(
                status_code=404,
                detail=f"Insufficient data for {symbol} (got {len(df)} bars, need >= 100)",
            )

        ohlcv_data = {
            "closes": df["Close"].values.astype(np.float64),
            "highs": df["High"].values.astype(np.float64),
            "lows": df["Low"].values.astype(np.float64),
            "opens": df["Open"].values.astype(np.float64),
            "volumes": df["Volume"].values.astype(np.float64),
        }

    except ImportError:
        raise HTTPException(status_code=503, detail="yfinance not installed")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Data fetch failed: {str(exc)}")

    # Train
    result = await drl_training.train_agent(
        ohlcv_data=ohlcv_data,
        symbol=symbol,
        algorithm=algorithm,
        timesteps=timesteps,
        learning_rate=learning_rate,
    )

    if "error" in result.metrics:
        raise HTTPException(status_code=503, detail=result.metrics["error"])

    return result.as_dict()


@router.post("/train/custom")
async def train_custom(req: TrainRequest):
    """Train on user-provided OHLCV data (no yfinance needed)."""
    # Validate equal lengths
    lengths = [len(req.closes), len(req.highs), len(req.lows), len(req.opens), len(req.volumes)]
    if len(set(lengths)) != 1:
        raise HTTPException(status_code=400, detail=f"All arrays must be same length. Got: {lengths}")

    ohlcv_data = {
        "closes": np.array(req.closes, dtype=np.float64),
        "highs": np.array(req.highs, dtype=np.float64),
        "lows": np.array(req.lows, dtype=np.float64),
        "opens": np.array(req.opens, dtype=np.float64),
        "volumes": np.array(req.volumes, dtype=np.float64),
    }

    result = await drl_training.train_agent(
        ohlcv_data=ohlcv_data,
        symbol=req.symbol,
        algorithm=req.algorithm,
        timesteps=req.timesteps,
        learning_rate=req.learning_rate,
    )

    if "error" in result.metrics:
        raise HTTPException(status_code=503, detail=result.metrics["error"])

    return result.as_dict()


@router.get("/models")
async def list_models():
    """List all saved models and their exported weights."""
    models_dir = drl_training.MODELS_DIR
    models = []

    if models_dir.exists():
        # SB3 models (.zip files)
        for f in sorted(models_dir.iterdir()):
            if f.suffix == ".zip":
                name = f.stem
                tfjs_path = models_dir / f"{name}_tfjs.json"
                models.append({
                    "name": name,
                    "modelPath": str(f),
                    "hasTfjsWeights": tfjs_path.exists(),
                    "sizeMB": round(f.stat().st_size / (1024 * 1024), 2),
                })

    return {"models": models, "count": len(models)}


@router.get("/weights/{name}")
async def get_weights(name: str):
    """
    Download TFJS-compatible weights for a trained model.
    Returns JSON that can be loaded directly by tfjsEngine.mjs.
    """
    weights_path = drl_training.MODELS_DIR / f"{name}_tfjs.json"

    if not weights_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Weights not found for '{name}'. Train a model first via POST /train/{{symbol}}",
        )

    with open(weights_path) as f:
        weights = json.load(f)

    return JSONResponse(content=weights)


@router.get("/status")
async def training_status():
    """Training infrastructure health check."""
    return drl_training.get_training_status()
