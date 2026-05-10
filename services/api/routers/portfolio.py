"""
Portfolio Optimization Router — convex portfolio construction via Riskfolio-Lib.

Endpoints:
    POST /api/v1/portfolio/optimize              — optimize from symbol list (fetches data)
    POST /api/v1/portfolio/optimize/raw           — optimize from raw returns matrix
    POST /api/v1/portfolio/frontier               — efficient frontier generation
    POST /api/v1/portfolio/hrp                    — Hierarchical Risk Parity
    POST /api/v1/portfolio/compare                — compare multiple methods side by side
    GET  /api/v1/portfolio/methods                — list available methods
    GET  /api/v1/portfolio/status                 — infrastructure health check
"""
from __future__ import annotations

import logging
from typing import Optional

import numpy as np

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from engines import portfolio as port_engine

log = logging.getLogger("mss.api.routers.portfolio")

router = APIRouter(prefix="/api/v1/portfolio", tags=["portfolio"])


# ── Request models ───────────────────────────────────────────────────────────

class OptimizeRequest(BaseModel):
    """Optimize from a list of symbols (fetches OHLCV automatically)."""
    symbols: list[str] = Field(..., min_length=2, max_length=100, description="Tickers to include")
    method: str = Field(default="CVaR", description="MV, CVaR, WR, MAD, MSV, CDaR, UCI, EVaR")
    objective: str = Field(default="MaxSharpe", description="MinRisk, MaxRet, Utility, MaxSharpe")
    risk_measure: str = Field(default="CVaR", description="Risk measure to optimize")
    period: str = Field(default="2y", description="Lookback period for returns")
    risk_free_rate: float = Field(default=0.04, description="Annual risk-free rate")
    max_weight: float = Field(default=0.15, ge=0.01, le=1.0, description="Max weight per asset")
    alpha: float = Field(default=0.05, gt=0.0, lt=0.5, description="CVaR tail probability")


class RawOptimizeRequest(BaseModel):
    """Optimize from raw returns data (no yfinance needed)."""
    returns: dict[str, list[float]] = Field(
        ..., description="Dict of symbol → list of daily returns (oldest first)",
    )
    method: str = Field(default="CVaR")
    objective: str = Field(default="MaxSharpe")
    risk_measure: str = Field(default="CVaR")
    risk_free_rate: float = Field(default=0.04)
    max_weight: float = Field(default=0.15, ge=0.01, le=1.0)
    alpha: float = Field(default=0.05, gt=0.0, lt=0.5)


class FrontierRequest(BaseModel):
    """Generate efficient frontier."""
    symbols: list[str] = Field(..., min_length=2, max_length=100)
    risk_measure: str = Field(default="CVaR")
    points: int = Field(default=50, ge=5, le=200)
    period: str = Field(default="2y")
    risk_free_rate: float = Field(default=0.04)
    max_weight: float = Field(default=0.15, ge=0.01, le=1.0)


class HRPRequest(BaseModel):
    """Hierarchical Risk Parity optimization."""
    symbols: list[str] = Field(..., min_length=2, max_length=100)
    codependence: str = Field(default="pearson", description="pearson, spearman, kendall, gerber1, gerber2")
    risk_measure: str = Field(default="MV", description="MV, CVaR, MAD, MSV, CDaR")
    linkage: str = Field(default="ward", description="ward, single, complete, average")
    period: str = Field(default="2y")
    max_weight: float = Field(default=0.15, ge=0.01, le=1.0)


class CompareRequest(BaseModel):
    """Compare multiple optimization methods on the same universe."""
    symbols: list[str] = Field(..., min_length=2, max_length=100)
    methods: list[str] = Field(default=["MV", "CVaR", "MAD", "MSV"])
    objective: str = Field(default="MaxSharpe")
    period: str = Field(default="2y")
    risk_free_rate: float = Field(default=0.04)
    max_weight: float = Field(default=0.15, ge=0.01, le=1.0)


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _fetch_returns(symbols: list[str], period: str):
    """Fetch close prices and compute returns DataFrame."""
    import pandas as pd
    from normalizers_bridge import get_ohlcv_prices

    prices_dict: dict[str, list[float]] = {}
    errors: list[str] = []

    for sym in symbols:
        prices = await get_ohlcv_prices(sym, period=period)
        if prices and len(prices) >= 20:
            prices_dict[sym] = prices
        else:
            errors.append(sym)

    if len(prices_dict) < 2:
        raise HTTPException(
            status_code=404,
            detail=f"Need >= 2 assets with sufficient data. Failed: {errors}",
        )

    returns_df = port_engine.returns_from_prices(prices_dict)
    if returns_df is None or returns_df.shape[0] < 20:
        raise HTTPException(status_code=400, detail="Insufficient overlapping data for optimization")

    return returns_df, errors


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/optimize")
async def optimize_portfolio(req: OptimizeRequest):
    """
    Optimize portfolio weights for a set of symbols.

    Fetches OHLCV data, computes log returns, runs convex optimization
    via Riskfolio-Lib (or scipy fallback). Returns optimal weights with
    expected return, risk, and Sharpe ratio.
    """
    returns_df, errors = await _fetch_returns(req.symbols, req.period)

    result = port_engine.optimize(
        returns=returns_df,
        method=req.method,
        risk_measure=req.risk_measure,
        objective=req.objective,
        risk_free_rate=req.risk_free_rate,
        max_weight=req.max_weight,
        alpha=req.alpha,
    )

    response = result.as_dict()
    if errors:
        response["skippedSymbols"] = errors

    return response


@router.post("/optimize/raw")
async def optimize_raw(req: RawOptimizeRequest):
    """Optimize from user-provided returns (no data fetch needed)."""
    import pandas as pd

    # Validate equal lengths
    lengths = {sym: len(vals) for sym, vals in req.returns.items()}
    if len(set(lengths.values())) != 1:
        raise HTTPException(status_code=400, detail=f"All return series must be same length. Got: {lengths}")

    returns_df = pd.DataFrame(req.returns)

    result = port_engine.optimize(
        returns=returns_df,
        method=req.method,
        risk_measure=req.risk_measure,
        objective=req.objective,
        risk_free_rate=req.risk_free_rate,
        max_weight=req.max_weight,
        alpha=req.alpha,
    )

    return result.as_dict()


@router.post("/frontier")
async def compute_frontier(req: FrontierRequest):
    """
    Generate the efficient frontier — full Pareto curve of risk vs return.

    Returns N portfolio allocations ranging from minimum-risk to maximum-return.
    Useful for visualization and understanding the risk-return tradeoff space.
    """
    returns_df, errors = await _fetch_returns(req.symbols, req.period)

    result = port_engine.efficient_frontier(
        returns=returns_df,
        risk_measure=req.risk_measure,
        points=req.points,
        risk_free_rate=req.risk_free_rate,
        max_weight=req.max_weight,
    )

    response = result.as_dict()
    if errors:
        response["skippedSymbols"] = errors

    return response


@router.post("/hrp")
async def optimize_hrp(req: HRPRequest):
    """
    Hierarchical Risk Parity optimization via Riskfolio-Lib.

    Benchmark/comparison against the JS hrpEngine.js implementation.
    Riskfolio's HRP supports Gerber codependence and additional risk measures.
    """
    returns_df, errors = await _fetch_returns(req.symbols, req.period)

    result = port_engine.optimize_hrp(
        returns=returns_df,
        codependence=req.codependence,
        risk_measure=req.risk_measure,
        linkage=req.linkage,
        max_weight=req.max_weight,
    )

    response = result.as_dict()
    if errors:
        response["skippedSymbols"] = errors

    return response


@router.post("/compare")
async def compare_methods(req: CompareRequest):
    """
    Compare multiple optimization methods on the same asset universe.

    Returns side-by-side results for each method: weights, risk, return, Sharpe.
    Useful for understanding how different risk measures affect allocation.
    """
    returns_df, errors = await _fetch_returns(req.symbols, req.period)

    results = {}
    for method in req.methods:
        result = port_engine.optimize(
            returns=returns_df,
            method=method,
            risk_measure=method,  # use same risk measure as method
            objective=req.objective,
            risk_free_rate=req.risk_free_rate,
            max_weight=req.max_weight,
        )
        results[method] = result.as_dict()

    # Summary table
    summary = []
    for method, res in results.items():
        summary.append({
            "method": method,
            "expectedReturn": res["expectedReturn"],
            "expectedRisk": res["expectedRisk"],
            "sharpe": res["sharpe"],
            "numAssets": res["numAssets"],
            "computationTimeMs": res["computationTimeMs"],
        })

    return {
        "results": results,
        "summary": summary,
        "skippedSymbols": errors if errors else None,
    }


@router.get("/methods")
async def list_methods():
    """List available optimization methods and risk measures."""
    return {
        "methods": port_engine.METHODS,
        "riskMeasures": port_engine.RISK_MEASURES,
        "objectives": {
            "MinRisk": "Minimize risk for a target return",
            "MaxRet": "Maximize return for a risk budget",
            "Utility": "Maximize utility (return - λ·risk)",
            "MaxSharpe": "Maximize Sharpe ratio",
        },
        "hrpCodepedence": ["pearson", "spearman", "kendall", "gerber1", "gerber2"],
        "hrpLinkage": ["ward", "single", "complete", "average"],
    }


@router.get("/status")
async def portfolio_status():
    """Portfolio optimization infrastructure health check."""
    return port_engine.get_status()
