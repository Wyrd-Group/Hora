"""
POST /api/v1/shap/explain  — SHAP KernelExplainer for arbitrary model explanations
POST /api/v1/shap/anomaly  — Explain PyOD anomaly scores for a batch of entities
GET  /api/v1/shap/status   — Library availability check
"""
from __future__ import annotations

import logging
from typing import Optional

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from engines import explain as explain_engine

log = logging.getLogger("mss.shap")

router = APIRouter(prefix="/api/v1/shap", tags=["shap"])


# ── Request / Response models ─────────────────────────────────────────────────

class ExplainRequest(BaseModel):
    """Generic KernelSHAP explanation request."""
    features: list[float] = Field(..., description="Feature vector for the target instance")
    baseline: list[float] = Field(..., description="Background/baseline feature vector")
    feature_names: list[str] = Field(..., description="Human-readable feature names")
    entity_uid: str = Field(default="unknown", description="Entity identifier")


class AnomalyExplainRequest(BaseModel):
    """Explain anomaly detection scores for a batch of entities."""
    entities: list[dict] = Field(
        ...,
        min_length=20,
        description="Entity dicts with speed/heading/altitude/lat/lon/uid fields",
    )
    target_uid: Optional[str] = Field(
        default=None,
        description="If set, return explanation only for this entity",
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/explain")
async def explain_features(req: ExplainRequest) -> dict:
    """
    Compute SHAP values for a single feature vector relative to a baseline.

    Uses KernelExplainer with the baseline as the background distribution.
    Returns feature contributions sorted by absolute SHAP value (top drivers first).
    """
    if not explain_engine._HAS_SHAP:
        raise HTTPException(
            status_code=503,
            detail="SHAP library not installed. Run: pip install shap>=0.45.0",
        )

    if len(req.features) != len(req.baseline):
        raise HTTPException(
            status_code=422,
            detail=f"features ({len(req.features)}) and baseline ({len(req.baseline)}) must have equal length",
        )
    if len(req.features) != len(req.feature_names):
        raise HTTPException(
            status_code=422,
            detail=f"features ({len(req.features)}) and feature_names ({len(req.feature_names)}) must have equal length",
        )

    import shap  # only imported after _HAS_SHAP guard

    x        = np.array(req.features, dtype=np.float64).reshape(1, -1)
    baseline = np.array(req.baseline, dtype=np.float64).reshape(1, -1)

    try:
        # Identity model — KernelExplainer treats x as model output directly.
        # For real model explanations, clients should send pre-computed model output.
        def _passthrough(X: np.ndarray) -> np.ndarray:
            # Linear interpolation between baseline and x for coalition scoring
            return X @ np.ones(X.shape[1])

        explainer = shap.KernelExplainer(_passthrough, baseline)
        shap_values = explainer.shap_values(x, nsamples=512)

        if isinstance(shap_values, list):
            shap_values = shap_values[0]

        base_val = float(explainer.expected_value)
        if hasattr(base_val, '__iter__'):
            base_val = float(list(base_val)[0])

        contributions = []
        for j, fname in enumerate(req.feature_names):
            sv = float(shap_values[0, j])
            contributions.append({
                "feature":   fname,
                "value":     round(float(x[0, j]), 6),
                "shapValue": round(sv, 6),
                "direction": "increases" if sv > 0 else "decreases",
            })

        top_drivers = sorted(contributions, key=lambda c: abs(c["shapValue"]), reverse=True)

        return {
            "entityUid":     req.entity_uid,
            "modelType":     "generic",
            "baseValue":     round(base_val, 6),
            "predicted":     round(float(x[0].sum()), 6),
            "contributions": contributions,
            "topDrivers":    top_drivers[:5],
        }

    except Exception as e:
        log.error("KernelSHAP explain failed: %s", e)
        raise HTTPException(status_code=500, detail=f"SHAP computation failed: {e}")


@router.post("/anomaly")
async def explain_anomaly(req: AnomalyExplainRequest) -> dict:
    """
    Explain PyOD anomaly detection scores for a batch of entities.

    Builds a feature matrix (speed, heading_sin/cos, altitude, lat, lon),
    fits an Isolation Forest, and runs SHAP TreeExplainer to identify which
    features drove the anomaly score for each entity.
    """
    if not explain_engine._HAS_SHAP:
        raise HTTPException(
            status_code=503,
            detail="SHAP library not installed. Run: pip install shap>=0.45.0",
        )
    if not explain_engine._HAS_PYOD:
        raise HTTPException(
            status_code=503,
            detail="PyOD not installed. Run: pip install pyod",
        )

    import math
    from pyod.models.iforest import IForest

    # Build feature matrix (reuse anomaly engine helper)
    from engines.anomaly import _build_feature_matrix
    X, uids = _build_feature_matrix(req.entities)

    if len(X) < 20:
        raise HTTPException(
            status_code=422,
            detail=f"Need at least 20 entities with valid speed/lat/lon data, got {len(X)}",
        )

    # Normalize
    means = X.mean(axis=0)
    stds  = X.std(axis=0)
    stds[stds == 0] = 1.0
    X_norm = (X - means) / stds

    # Fit IForest
    model = IForest(n_estimators=100, contamination=0.08, random_state=42)
    model.fit(X_norm)

    explanations = explain_engine.explain_anomaly_scores(
        X       = X_norm,
        model   = model,
        uids    = uids,
        target_uid = req.target_uid,
    )

    return {
        "explanations": [e.as_dict() for e in explanations],
        "count":        len(explanations),
        "features":     explain_engine.ANOMALY_FEATURES,
    }


@router.get("/status")
async def shap_status() -> dict:
    """Check SHAP and PyOD library availability."""
    return {
        "shap":    explain_engine._HAS_SHAP,
        "pyod":    explain_engine._HAS_PYOD,
        "ready":   explain_engine._HAS_SHAP and explain_engine._HAS_PYOD,
    }
