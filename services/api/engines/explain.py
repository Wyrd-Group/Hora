"""
Explainability Engine — SHAP-powered model interpretability.

Replaces hand-rolled Kernel SHAP in the JS mlEngine.js with the real
SHAP library (Lundberg & Lee, 2017).

Provides:
  1. Threat score explanation — why did this entity get score X?
  2. Anomaly explanation — which features drove the anomaly detection?
  3. Generic model explanation — SHAP values for any sklearn-compatible model

Uses TreeExplainer for tree models (IForest, LightGBM) and
KernelExplainer as fallback for any model.

References:
  Lundberg & Lee (2017) "A Unified Approach to Interpreting Model Predictions"
  SHAP library: github.com/shap/shap
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Any, Optional

import numpy as np

# ── SHAP import (graceful fallback) ───────────────────────────────────────────
try:
    import shap
    _HAS_SHAP = True
except ImportError:
    _HAS_SHAP = False

# ── PyOD for accessing fitted models ─────────────────────────────────────────
try:
    from pyod.models.iforest import IForest
    _HAS_PYOD = True
except ImportError:
    _HAS_PYOD = False

log = logging.getLogger("mss.explain")

# Feature names for the anomaly detection feature matrix
ANOMALY_FEATURES = ["speed", "heading_sin", "heading_cos", "altitude", "lat", "lon"]

# Feature names for threat scoring
THREAT_FEATURES = [
    "affiliation_score", "anomaly_score", "is_dark_ship", "is_impossible_speed",
    "is_aircraft", "hostile_proximity", "is_osint", "staleness_hours",
]


@dataclass
class FeatureContribution:
    feature:      str
    value:        float       # actual feature value
    shap_value:   float       # SHAP contribution to prediction
    direction:    str         # "increases" or "decreases" risk/anomaly

    def as_dict(self) -> dict:
        return {
            "feature":    self.feature,
            "value":      round(self.value, 4) if not math.isnan(self.value) else None,
            "shapValue":  round(self.shap_value, 4),
            "direction":  self.direction,
        }


@dataclass
class Explanation:
    entity_uid:     str
    model_type:     str              # "anomaly", "threat", "custom"
    base_value:     float            # expected model output (mean prediction)
    predicted:      float            # actual model output for this entity
    contributions:  list[FeatureContribution] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "entityUid":     self.entity_uid,
            "modelType":     self.model_type,
            "baseValue":     round(self.base_value, 4),
            "predicted":     round(self.predicted, 4),
            "contributions": [c.as_dict() for c in self.contributions],
            "topDrivers":    [c.as_dict() for c in sorted(
                self.contributions, key=lambda c: abs(c.shap_value), reverse=True
            )[:5]],
        }


def explain_anomaly_scores(
    X: np.ndarray,
    model: Any,
    uids: list[str],
    feature_names: list[str] = ANOMALY_FEATURES,
    target_uid: Optional[str] = None,
) -> list[Explanation]:
    """
    Explain anomaly detection scores using SHAP.

    Args:
        X: feature matrix (n_samples × n_features), normalized
        model: fitted PyOD model (IForest, ECOD, etc.)
        uids: entity UIDs corresponding to rows in X
        feature_names: human-readable feature names
        target_uid: if set, only explain this entity

    Returns:
        List of Explanation objects with per-feature SHAP contributions.
    """
    if not _HAS_SHAP:
        log.warning("SHAP not installed — returning empty explanations")
        return []

    if len(X) == 0:
        return []

    try:
        # For tree-based models (IForest), use TreeExplainer (exact, fast)
        if hasattr(model, 'estimators_') or hasattr(model, 'detector_'):
            # IForest wraps sklearn IsolationForest — extract it
            inner = getattr(model, 'detector_', model)
            if hasattr(inner, 'estimators_'):
                explainer = shap.TreeExplainer(inner)
            else:
                # Fallback to KernelExplainer
                background = shap.sample(X, min(50, len(X)))
                explainer = shap.KernelExplainer(model.decision_function, background)
        else:
            # Generic KernelExplainer for any model
            background = shap.sample(X, min(50, len(X)))
            explainer = shap.KernelExplainer(model.decision_function, background)

        shap_values = explainer.shap_values(X)

        # Handle different SHAP output shapes
        if isinstance(shap_values, list):
            shap_values = shap_values[0]

        base_value = float(explainer.expected_value)
        if isinstance(base_value, np.ndarray):
            base_value = float(base_value[0])

    except Exception as e:
        log.error("SHAP computation failed: %s", e)
        return []

    explanations = []
    scores = model.decision_scores_ if hasattr(model, 'decision_scores_') else np.zeros(len(X))

    for i, uid in enumerate(uids):
        if target_uid and uid != target_uid:
            continue

        contributions = []
        for j, fname in enumerate(feature_names):
            sv = float(shap_values[i, j])
            contributions.append(FeatureContribution(
                feature=fname,
                value=float(X[i, j]),
                shap_value=sv,
                direction="increases" if sv > 0 else "decreases",
            ))

        explanations.append(Explanation(
            entity_uid=uid,
            model_type="anomaly",
            base_value=base_value,
            predicted=float(scores[i]),
            contributions=contributions,
        ))

    return explanations


def explain_threat_score(entity: dict, threat_result: dict) -> Explanation:
    """
    Explain a rule-based threat score using feature attribution.

    Since threat scoring is rule-based (not ML), we use the rule contributions
    directly as pseudo-SHAP values. This gives the same explainability interface
    whether the model is ML or rules.
    """
    uid = entity.get("uid", "")
    score = threat_result.get("score", 0)
    reasons = threat_result.get("reasons", [])

    # Parse reasons into feature contributions
    contributions = []
    for reason in reasons:
        # Extract the (+N) or (-N) from reason strings
        import re
        match = re.search(r'\(([+-]\d+)\)', reason)
        if match:
            delta = int(match.group(1))
            # Extract feature name (text before the score)
            feature = reason.split("(")[0].strip()
            contributions.append(FeatureContribution(
                feature=feature,
                value=delta,
                shap_value=float(delta) / 100.0,  # normalize to 0–1 scale
                direction="increases" if delta > 0 else "decreases",
            ))

    return Explanation(
        entity_uid=uid,
        model_type="threat",
        base_value=0.0,  # threat score starts at 0
        predicted=float(score) / 100.0,
        contributions=contributions,
    )
