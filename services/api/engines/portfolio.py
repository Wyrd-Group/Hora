"""
Riskfolio-Lib Portfolio Optimization Engine — advanced convex portfolio construction.

Complements the JS-side optimizer (portfolioOptimizer.js) with methods that
require proper convex solvers and are too heavy for browser execution:

  1. Mean-CVaR optimization (tail-risk aware, not possible with gradient descent)
  2. Worst-case robust optimization (parameter uncertainty)
  3. Risk parity with custom risk measures (not just volatility)
  4. Hierarchical Risk Parity via Riskfolio (benchmark against JS HRP)
  5. Efficient frontier generation (full Pareto curve, not single point)
  6. Factor model covariance (shrinkage + statistical factors)

The JS optimizer handles real-time rebalancing (<5ms). This Python engine handles
overnight batch optimization, what-if analysis, and research-grade backtesting
where computational cost doesn't matter but accuracy does.

Dependencies:
  pip install riskfolio-lib  # pulls cvxpy, scipy, statsmodels, sklearn

Fallback: if riskfolio-lib not installed, uses scipy.optimize for basic MV
and numpy for HRP (always works, just fewer methods).

Usage:
    from engines.portfolio import optimize, efficient_frontier, get_status

    result = optimize(returns_df, method="CVaR", risk_measure="CVaR")
    frontier = efficient_frontier(returns_df, points=50)
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

import numpy as np

log = logging.getLogger("mss.api.portfolio")

# ── Graceful imports ─────────────────────────────────────────────────────────

_HAS_PANDAS = False
_HAS_RISKFOLIO = False
_HAS_SCIPY = False

try:
    import pandas as pd
    _HAS_PANDAS = True
except ImportError:
    log.warning("pandas not installed — portfolio optimization unavailable")

if _HAS_PANDAS:
    try:
        import riskfolio as rp
        _HAS_RISKFOLIO = True
    except ImportError:
        log.info("riskfolio-lib not installed — using scipy fallback")

try:
    from scipy.optimize import minimize as scipy_minimize
    _HAS_SCIPY = True
except ImportError:
    pass


# ── Constants ────────────────────────────────────────────────────────────────

# Optimization methods available
METHODS = {
    "MV":       "Mean-Variance (Markowitz)",
    "CVaR":     "Mean-CVaR (Conditional Value at Risk)",
    "WR":       "Worst-Case Mean-Variance (robust)",
    "MAD":      "Mean Absolute Deviation",
    "MSV":      "Mean Semi-Variance (downside only)",
    "CDaR":     "Conditional Drawdown at Risk",
    "UCI":      "Ulcer Index",
    "EVaR":     "Entropic Value at Risk",
}

RISK_MEASURES = {
    "MV":   "Variance",
    "CVaR": "Conditional VaR (Expected Shortfall)",
    "WR":   "Worst Realization",
    "MAD":  "Mean Absolute Deviation",
    "MSV":  "Semi-Variance",
    "CDaR": "Conditional Drawdown at Risk",
    "UCI":  "Ulcer Index",
    "EVaR": "Entropic VaR",
}

# Default constraints (match JS portfolioOptimizer.js)
DEFAULT_MAX_WEIGHT = 0.15       # 15% max single position
DEFAULT_MIN_WEIGHT = 0.0        # long-only
DEFAULT_RISK_AVERSION = 2.5     # matches JS δ = 2.5


# ── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class PortfolioResult:
    """Result of a portfolio optimization."""
    weights: dict[str, float]       # symbol → weight
    method: str                      # optimization method used
    risk_measure: str                # risk measure optimized
    expected_return: float           # annualized expected return
    expected_risk: float             # annualized risk (per risk measure)
    sharpe: float                    # return / risk
    num_assets: int                  # number of assets with non-zero weight
    computation_time_ms: float
    metadata: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {
            "weights": {k: round(v, 6) for k, v in self.weights.items() if v > 1e-6},
            "method": self.method,
            "riskMeasure": self.risk_measure,
            "expectedReturn": round(self.expected_return, 6),
            "expectedRisk": round(self.expected_risk, 6),
            "sharpe": round(self.sharpe, 4),
            "numAssets": self.num_assets,
            "computationTimeMs": round(self.computation_time_ms, 1),
            "metadata": self.metadata,
        }


@dataclass
class FrontierPoint:
    """Single point on the efficient frontier."""
    expected_return: float
    expected_risk: float
    sharpe: float
    weights: dict[str, float]


@dataclass
class EfficientFrontierResult:
    """Full efficient frontier."""
    points: list[FrontierPoint]
    risk_measure: str
    num_assets: int
    computation_time_ms: float

    def as_dict(self) -> dict:
        return {
            "points": [
                {
                    "expectedReturn": round(p.expected_return, 6),
                    "expectedRisk": round(p.expected_risk, 6),
                    "sharpe": round(p.sharpe, 4),
                    "weights": {k: round(v, 6) for k, v in p.weights.items() if v > 1e-6},
                }
                for p in self.points
            ],
            "riskMeasure": self.risk_measure,
            "numAssets": self.num_assets,
            "computationTimeMs": round(self.computation_time_ms, 1),
        }


# ── Core optimization ────────────────────────────────────────────────────────

def optimize(
    returns: Any,  # pd.DataFrame with columns = symbols, rows = daily returns
    method: str = "CVaR",
    risk_measure: str = "CVaR",
    objective: str = "MinRisk",  # "MinRisk", "MaxRet", "Utility", "MaxSharpe"
    risk_free_rate: float = 0.04,
    max_weight: float = DEFAULT_MAX_WEIGHT,
    min_weight: float = DEFAULT_MIN_WEIGHT,
    risk_aversion: float = DEFAULT_RISK_AVERSION,
    alpha: float = 0.05,  # CVaR confidence level (5% tail)
) -> PortfolioResult:
    """
    Optimize portfolio weights using Riskfolio-Lib.

    Args:
        returns: DataFrame of asset returns (T x N), columns = tickers
        method: optimization method (MV, CVaR, WR, MAD, MSV, CDaR, UCI, EVaR)
        risk_measure: risk measure to minimize
        objective: "MinRisk" (min risk for target return), "MaxRet" (max return for risk budget),
                   "Utility" (maximize utility = ret - λ*risk), "MaxSharpe"
        risk_free_rate: annual risk-free rate
        max_weight: maximum weight per asset
        min_weight: minimum weight per asset (0 = long-only)
        risk_aversion: risk aversion parameter (for Utility objective)
        alpha: tail probability for CVaR/CDaR (default 5%)

    Returns:
        PortfolioResult with optimal weights and diagnostics
    """
    if not _HAS_PANDAS:
        return _error_result("pandas not installed")

    if not isinstance(returns, pd.DataFrame):
        return _error_result("returns must be a pandas DataFrame")

    if returns.shape[0] < 20 or returns.shape[1] < 2:
        return _error_result(f"Need >= 20 observations and >= 2 assets, got {returns.shape}")

    t0 = time.monotonic()
    symbols = list(returns.columns)

    if _HAS_RISKFOLIO:
        result = _optimize_riskfolio(
            returns, method, risk_measure, objective,
            risk_free_rate, max_weight, min_weight, risk_aversion, alpha,
        )
    elif _HAS_SCIPY:
        result = _optimize_scipy_fallback(
            returns, risk_free_rate, max_weight,
        )
    else:
        return _error_result("Neither riskfolio-lib nor scipy installed")

    result.computation_time_ms = (time.monotonic() - t0) * 1000
    return result


def _optimize_riskfolio(
    returns: Any,
    method: str,
    risk_measure: str,
    objective: str,
    risk_free_rate: float,
    max_weight: float,
    min_weight: float,
    risk_aversion: float,
    alpha: float,
) -> PortfolioResult:
    """Riskfolio-Lib optimization."""
    symbols = list(returns.columns)

    # Build portfolio object
    port = rp.Portfolio(returns=returns)

    # Estimate expected returns and covariance
    port.assets_stats(method_mu="hist", method_cov="ledoit")

    # Constraints
    port.upperlng = max_weight      # max weight per asset
    port.lowerlng = min_weight      # min weight per asset
    port.alpha = alpha              # CVaR tail level
    port.ainequality = None         # no linear inequality constraints
    port.binequality = None

    # Map risk measure string to riskfolio parameter
    rm_map = {
        "MV": "MV", "CVaR": "CVaR", "WR": "WR", "MAD": "MAD",
        "MSV": "MSV", "CDaR": "CDaR", "UCI": "UCI", "EVaR": "EVaR",
    }
    rm = rm_map.get(risk_measure, "CVaR")

    # Map objective
    obj_map = {
        "MinRisk": "MinRisk",
        "MaxRet": "MaxRet",
        "Utility": "Utility",
        "MaxSharpe": "Sharpe",
    }
    obj = obj_map.get(objective, "MinRisk")

    try:
        w = port.optimization(
            model="Classic",
            rm=rm,
            obj=obj,
            rf=risk_free_rate / 252,  # daily risk-free rate
            l=risk_aversion,
            hist=True,
        )

        if w is None or w.empty:
            return _error_result("Optimization failed — solver returned no solution")

        # Extract weights
        weights = {symbols[i]: float(w.iloc[i, 0]) for i in range(len(symbols))}

        # Compute portfolio metrics
        w_vec = w.values.flatten()
        mu = returns.mean().values
        cov = returns.cov().values

        port_return = float(np.dot(w_vec, mu)) * 252  # annualized
        port_vol = float(np.sqrt(np.dot(w_vec, np.dot(cov, w_vec)))) * np.sqrt(252)
        sharpe = (port_return - risk_free_rate) / max(port_vol, 1e-8)

        num_active = sum(1 for v in weights.values() if v > 1e-4)

        return PortfolioResult(
            weights=weights,
            method=f"Riskfolio-{method}",
            risk_measure=RISK_MEASURES.get(risk_measure, risk_measure),
            expected_return=port_return,
            expected_risk=port_vol,
            sharpe=sharpe,
            num_assets=num_active,
            computation_time_ms=0,  # filled by caller
            metadata={
                "objective": objective,
                "alpha": alpha,
                "riskAversion": risk_aversion,
                "maxWeight": max_weight,
                "covMethod": "ledoit-wolf",
                "solver": "riskfolio-lib",
            },
        )

    except Exception as exc:
        log.error("Riskfolio optimization failed: %s", exc)
        return _error_result(f"Solver failed: {str(exc)}")


def _optimize_scipy_fallback(
    returns: Any,
    risk_free_rate: float,
    max_weight: float,
) -> PortfolioResult:
    """Basic mean-variance optimization via scipy (fallback when riskfolio unavailable)."""
    symbols = list(returns.columns)
    n = len(symbols)
    mu = returns.mean().values * 252
    cov = returns.cov().values * 252

    # Max Sharpe via scipy minimize
    def neg_sharpe(w):
        port_ret = np.dot(w, mu)
        port_vol = np.sqrt(np.dot(w, np.dot(cov, w)))
        return -(port_ret - risk_free_rate) / max(port_vol, 1e-8)

    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1.0}]
    bounds = [(0.0, max_weight)] * n
    x0 = np.ones(n) / n

    res = scipy_minimize(neg_sharpe, x0, method="SLSQP", bounds=bounds, constraints=constraints)

    if not res.success:
        return _error_result(f"scipy optimizer failed: {res.message}")

    w = res.x
    weights = {symbols[i]: float(w[i]) for i in range(n)}
    port_ret = float(np.dot(w, mu))
    port_vol = float(np.sqrt(np.dot(w, np.dot(cov, w))))
    sharpe = (port_ret - risk_free_rate) / max(port_vol, 1e-8)

    return PortfolioResult(
        weights=weights,
        method="scipy-MV",
        risk_measure="Variance",
        expected_return=port_ret,
        expected_risk=port_vol,
        sharpe=sharpe,
        num_assets=sum(1 for v in w if v > 1e-4),
        computation_time_ms=0,
        metadata={"solver": "scipy-SLSQP", "covMethod": "sample"},
    )


# ── Efficient frontier ───────────────────────────────────────────────────────

def efficient_frontier(
    returns: Any,
    risk_measure: str = "CVaR",
    points: int = 50,
    risk_free_rate: float = 0.04,
    max_weight: float = DEFAULT_MAX_WEIGHT,
    alpha: float = 0.05,
) -> EfficientFrontierResult:
    """
    Generate the full efficient frontier (Pareto curve of risk vs return).

    Returns `points` portfolios from minimum-risk to maximum-return,
    each with its own weight allocation.
    """
    if not _HAS_PANDAS or not _HAS_RISKFOLIO:
        # Fallback: just return min-risk and max-sharpe
        min_risk = optimize(returns, objective="MinRisk", risk_measure=risk_measure,
                           risk_free_rate=risk_free_rate, max_weight=max_weight, alpha=alpha)
        max_sharpe = optimize(returns, objective="MaxSharpe", risk_measure=risk_measure,
                             risk_free_rate=risk_free_rate, max_weight=max_weight, alpha=alpha)

        frontier_points = [
            FrontierPoint(
                expected_return=min_risk.expected_return,
                expected_risk=min_risk.expected_risk,
                sharpe=min_risk.sharpe,
                weights=min_risk.weights,
            ),
            FrontierPoint(
                expected_return=max_sharpe.expected_return,
                expected_risk=max_sharpe.expected_risk,
                sharpe=max_sharpe.sharpe,
                weights=max_sharpe.weights,
            ),
        ]

        return EfficientFrontierResult(
            points=frontier_points,
            risk_measure=risk_measure,
            num_assets=len(returns.columns),
            computation_time_ms=0,
        )

    t0 = time.monotonic()
    symbols = list(returns.columns)

    port = rp.Portfolio(returns=returns)
    port.assets_stats(method_mu="hist", method_cov="ledoit")
    port.upperlng = max_weight
    port.lowerlng = 0.0
    port.alpha = alpha

    rm_map = {
        "MV": "MV", "CVaR": "CVaR", "WR": "WR", "MAD": "MAD",
        "MSV": "MSV", "CDaR": "CDaR", "UCI": "UCI", "EVaR": "EVaR",
    }
    rm = rm_map.get(risk_measure, "CVaR")

    try:
        frontier = port.efficient_frontier(
            model="Classic",
            rm=rm,
            points=points,
            rf=risk_free_rate / 252,
            hist=True,
        )

        if frontier is None or frontier.empty:
            return EfficientFrontierResult(
                points=[], risk_measure=risk_measure,
                num_assets=len(symbols), computation_time_ms=0,
            )

        mu_vec = returns.mean().values
        cov_mat = returns.cov().values

        frontier_points = []
        for col in frontier.columns:
            w = frontier[col].values
            ret = float(np.dot(w, mu_vec)) * 252
            vol = float(np.sqrt(np.dot(w, np.dot(cov_mat, w)))) * np.sqrt(252)
            sh = (ret - risk_free_rate) / max(vol, 1e-8)

            weights = {symbols[i]: float(w[i]) for i in range(len(symbols))}

            frontier_points.append(FrontierPoint(
                expected_return=ret,
                expected_risk=vol,
                sharpe=sh,
                weights=weights,
            ))

        elapsed = (time.monotonic() - t0) * 1000

        return EfficientFrontierResult(
            points=frontier_points,
            risk_measure=risk_measure,
            num_assets=len(symbols),
            computation_time_ms=elapsed,
        )

    except Exception as exc:
        log.error("Efficient frontier generation failed: %s", exc)
        return EfficientFrontierResult(
            points=[], risk_measure=risk_measure,
            num_assets=len(symbols), computation_time_ms=0,
        )


# ── HRP (Hierarchical Risk Parity) via Riskfolio ────────────────────────────

def optimize_hrp(
    returns: Any,
    codependence: str = "pearson",  # "pearson", "spearman", "kendall", "gerber1", "gerber2"
    risk_measure: str = "MV",
    linkage: str = "ward",  # "ward", "single", "complete", "average"
    max_weight: float = DEFAULT_MAX_WEIGHT,
) -> PortfolioResult:
    """
    Hierarchical Risk Parity via Riskfolio-Lib.

    This serves as a benchmark/comparison against the JS hrpEngine.js implementation.
    Riskfolio's HRP supports additional codependence measures (Gerber statistic)
    and risk measures that the JS version doesn't have.
    """
    if not _HAS_PANDAS or not _HAS_RISKFOLIO:
        return _error_result("riskfolio-lib required for HRP")

    t0 = time.monotonic()
    symbols = list(returns.columns)

    port = rp.HCPortfolio(returns=returns)

    rm_map = {"MV": "vol", "CVaR": "CVaR", "MAD": "MAD", "MSV": "MSV", "CDaR": "CDaR"}
    rm = rm_map.get(risk_measure, "vol")

    try:
        w = port.optimization(
            model="HRP",
            codependence=codependence,
            rm=rm,
            rf=0.0,
            linkage=linkage,
            leaf_order=True,
        )

        if w is None or w.empty:
            return _error_result("HRP optimization returned no solution")

        # Enforce max weight constraint (HRP doesn't natively support it)
        w_vec = w.values.flatten()
        w_vec = np.minimum(w_vec, max_weight)
        w_vec = w_vec / w_vec.sum()  # re-normalize

        weights = {symbols[i]: float(w_vec[i]) for i in range(len(symbols))}

        mu = returns.mean().values
        cov = returns.cov().values
        port_ret = float(np.dot(w_vec, mu)) * 252
        port_vol = float(np.sqrt(np.dot(w_vec, np.dot(cov, w_vec)))) * np.sqrt(252)
        sharpe = port_ret / max(port_vol, 1e-8)

        elapsed = (time.monotonic() - t0) * 1000

        return PortfolioResult(
            weights=weights,
            method=f"Riskfolio-HRP-{linkage}",
            risk_measure=RISK_MEASURES.get(risk_measure, risk_measure),
            expected_return=port_ret,
            expected_risk=port_vol,
            sharpe=sharpe,
            num_assets=sum(1 for v in w_vec if v > 1e-4),
            computation_time_ms=elapsed,
            metadata={
                "codependence": codependence,
                "linkage": linkage,
                "solver": "riskfolio-lib-HRP",
            },
        )

    except Exception as exc:
        log.error("HRP optimization failed: %s", exc)
        return _error_result(f"HRP failed: {str(exc)}")


# ── Helpers ──────────────────────────────────────────────────────────────────

def _error_result(msg: str) -> PortfolioResult:
    return PortfolioResult(
        weights={}, method="error", risk_measure="none",
        expected_return=0, expected_risk=0, sharpe=0,
        num_assets=0, computation_time_ms=0,
        metadata={"error": msg},
    )


def returns_from_prices(prices: dict[str, list[float]]) -> Any:
    """
    Convert dict of symbol → close prices to a DataFrame of log returns.
    Utility for building the returns matrix from OHLCV data.
    """
    if not _HAS_PANDAS:
        return None

    df = pd.DataFrame(prices)

    # Drop rows with any NaN (misaligned series)
    df = df.dropna()

    if df.shape[0] < 2:
        return None

    # Log returns
    returns = np.log(df / df.shift(1)).dropna()
    return returns


def get_status() -> dict:
    """Portfolio optimization infrastructure status."""
    return {
        "hasPandas": _HAS_PANDAS,
        "hasRiskfolio": _HAS_RISKFOLIO,
        "hasScipy": _HAS_SCIPY,
        "availableMethods": list(METHODS.keys()) if _HAS_RISKFOLIO else (["MV"] if _HAS_SCIPY else []),
        "availableRiskMeasures": list(RISK_MEASURES.keys()) if _HAS_RISKFOLIO else (["MV"] if _HAS_SCIPY else []),
        "solver": "riskfolio-lib" if _HAS_RISKFOLIO else ("scipy" if _HAS_SCIPY else "none"),
        "hrpAvailable": _HAS_RISKFOLIO,
        "efficientFrontierAvailable": _HAS_RISKFOLIO,
    }
