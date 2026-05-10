"""
Behavioral Anomaly Detection Engine — PyOD-enhanced.

Two-tier architecture:
  TIER 1 (rule-based, instant):
    1. SPEED_ANOMALY     — speed Z-score vs entity-type historical baseline
    2. HEADING_THRASH    — heading change rate > 30°/min (erratic maneuvering)
    3. DARK_SHIP         — AIS vessel silent > 4 hours (possible AIS spoofing)
    4. IMPOSSIBLE_SPEED  — exceeds physical maximum for entity type
    5. LOITERING         — aircraft moving < 80 kts (stall or hovering)

  TIER 2 (ML-based, PyOD ensemble):
    6. MULTIVARIATE_ANOMALY — Isolation Forest + ECOD + LOF ensemble
       Catches patterns invisible to single-feature rules:
       - Unusual speed+heading+altitude combinations
       - Contextual anomalies (normal speed but abnormal for location)
       - Collective anomalies (entity behaving unlike its cluster)

Each entity gets an AnomalyResult with:
  - score: float  0.0 (normal) → 1.0+ (highly anomalous, can exceed 1)
  - flags: list of anomaly class names detected
  - details: human-readable description
  - ml_score: float  PyOD ensemble score (0–1, NaN if insufficient data)
"""
from __future__ import annotations

import logging
import math
import time
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

# ── PyOD imports (graceful fallback if not installed) ──────────────────────────
try:
    from pyod.models.iforest import IForest
    from pyod.models.ecod import ECOD
    from pyod.models.lof import LOF
    _HAS_PYOD = True
except ImportError:
    _HAS_PYOD = False

log = logging.getLogger("mss.anomaly")

# ── Baseline statistics per entity type ────────────────────────────────────────
# (mean_kts, std_kts, max_kts)
_TYPE_SPEED_BASELINE: dict[str, tuple[float, float, float]] = {
    "aircraft": (350.0,  120.0,  700.0),
    "vessel":   (12.0,   8.0,    45.0),
    "ground":   (30.0,   20.0,   150.0),
    "person":   (4.0,    3.0,    35.0),
    "location": (0.0,    0.01,   1.0),
    "event":    (0.0,    0.01,   1.0),
}

DARK_SHIP_THRESHOLD_SEC  = 4 * 3600
HEADING_THRASH_DEG_MIN   = 30.0
LOITERING_SPEED_AIRCRAFT = 80.0

# ── PyOD ensemble config ──────────────────────────────────────────────────────
_PYOD_MIN_SAMPLES       = 20     # minimum entities to run ML ensemble
_PYOD_CONTAMINATION     = 0.08   # expected fraction of anomalies
_PYOD_ENSEMBLE_WEIGHTS  = [0.4, 0.35, 0.25]  # IForest, ECOD, LOF


@dataclass
class AnomalyResult:
    entity_uid:  str
    score:       float          = 0.0
    flags:       list[str]      = field(default_factory=list)
    details:     list[str]      = field(default_factory=list)
    ml_score:    float          = float('nan')  # PyOD ensemble score

    def as_dict(self) -> dict:
        result = {
            "entityUid": self.entity_uid,
            "score":     round(self.score, 3),
            "flags":     self.flags,
            "details":   self.details,
            "severity":  self._severity(),
        }
        if not math.isnan(self.ml_score):
            result["mlScore"] = round(self.ml_score, 3)
        return result

    def _severity(self) -> str:
        if self.score >= 0.8:
            return "critical"
        if self.score >= 0.4:
            return "warning"
        return "info"


# ── Track history buffer (uid → list of (lat, lon, heading, speed, ts)) ────────
_track_history: dict[str, list[tuple[float, float, float, float, float]]] = {}
_MAX_HISTORY = 20


def record_sighting(uid: str, lat: float, lon: float,
                    heading: float, speed: float) -> None:
    """Append a sighting to the entity's track history."""
    buf = _track_history.setdefault(uid, [])
    buf.append((lat, lon, heading, speed, time.monotonic()))
    if len(buf) > _MAX_HISTORY:
        del buf[0]


def _heading_delta(a: float, b: float) -> float:
    """Smallest angular difference between two headings (0–360)."""
    d = abs(a - b) % 360
    return d if d <= 180 else 360 - d


# ═══════════════════════════════════════════════════════════════════════════════
# TIER 1: Rule-Based Anomaly Detection (unchanged — fast, single-entity)
# ═══════════════════════════════════════════════════════════════════════════════

def _rule_based_analyze(entity: dict) -> AnomalyResult:
    """
    Run all rule-based anomaly checks on a single entity dict.
    This is the original detection logic — kept as tier 1 fast path.
    """
    uid         = entity.get("uid", "")
    etype       = entity.get("entityType", "ground")
    speed       = entity.get("speed") or 0.0
    heading     = entity.get("heading") or 0.0
    source      = entity.get("source", "MANUAL")
    last_seen_s = entity.get("lastSeen")

    result = AnomalyResult(entity_uid=uid)
    baseline = _TYPE_SPEED_BASELINE.get(etype, _TYPE_SPEED_BASELINE["ground"])
    mean_spd, std_spd, max_spd = baseline

    # 1. Impossible speed
    if speed > max_spd:
        result.flags.append("IMPOSSIBLE_SPEED")
        result.details.append(
            f"Speed {speed:.1f} kts exceeds physical max {max_spd:.0f} kts for {etype}"
        )
        result.score += 0.6

    # 2. Speed Z-score
    elif std_spd > 0:
        z = abs(speed - mean_spd) / std_spd
        if z > 3.0:
            result.flags.append("SPEED_ANOMALY")
            result.details.append(
                f"Speed {speed:.1f} kts is {z:.1f}σ from {etype} baseline "
                f"({mean_spd:.0f}±{std_spd:.0f} kts)"
            )
            result.score += min(0.4, (z - 3.0) * 0.15)

    # 3. Loitering aircraft
    if etype == "aircraft" and 0 < speed < LOITERING_SPEED_AIRCRAFT:
        result.flags.append("LOITERING")
        result.details.append(
            f"Aircraft {speed:.1f} kts is below stall speed — possible hovering/loiter"
        )
        result.score += 0.3

    # 4. Dark ship (AIS only)
    if source == "AIS" and last_seen_s:
        try:
            from datetime import datetime, timezone
            last = datetime.fromisoformat(last_seen_s.rstrip("Z")).replace(tzinfo=timezone.utc)
            now  = datetime.now(timezone.utc)
            silent_sec = (now - last).total_seconds()
            if silent_sec > DARK_SHIP_THRESHOLD_SEC:
                hours = silent_sec / 3600
                result.flags.append("DARK_SHIP")
                result.details.append(
                    f"AIS vessel silent for {hours:.1f}h — possible dark ship (AIS off)"
                )
                result.score += min(0.5, hours / 8.0)
        except Exception:
            pass

    # 5. Heading thrash (from track history)
    history = _track_history.get(uid, [])
    if len(history) >= 4:
        deltas = []
        for i in range(1, len(history)):
            dh   = _heading_delta(history[i][2], history[i-1][2])
            dt   = max(history[i][4] - history[i-1][4], 0.01)
            rate = dh / (dt / 60.0)
            deltas.append(rate)
        mean_rate = sum(deltas) / len(deltas)
        if mean_rate > HEADING_THRASH_DEG_MIN:
            result.flags.append("HEADING_THRASH")
            result.details.append(
                f"Mean heading change {mean_rate:.1f}°/min — erratic maneuvering"
            )
            result.score += min(0.4, (mean_rate - HEADING_THRASH_DEG_MIN) / 50.0)

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# TIER 2: PyOD ML Ensemble (batch — needs multiple entities for context)
# ═══════════════════════════════════════════════════════════════════════════════

def _build_feature_matrix(entities: list[dict]) -> tuple[np.ndarray, list[str]]:
    """
    Extract numeric feature matrix from entity list.
    Features: speed, heading (sin/cos), altitude, lat, lon
    Returns (feature_matrix, uid_list) for entities with valid data.
    """
    features = []
    uids = []

    for e in entities:
        speed   = e.get("speed")
        heading = e.get("heading")
        alt     = e.get("altitude") or 0.0
        lat     = e.get("lat")
        lon     = e.get("lon")

        if speed is None or lat is None or lon is None:
            continue

        heading_rad = math.radians(heading or 0.0)
        features.append([
            speed,
            math.sin(heading_rad),   # heading decomposed to avoid 0/360 wrap
            math.cos(heading_rad),
            alt,
            lat,
            lon,
        ])
        uids.append(e.get("uid", ""))

    return np.array(features, dtype=np.float64) if features else np.empty((0, 6)), uids


def _pyod_ensemble(entities: list[dict]) -> dict[str, float]:
    """
    Run PyOD Isolation Forest + ECOD + LOF ensemble on entity batch.
    Returns uid → anomaly score (0–1) mapping.

    Why these three:
    - IForest: best all-rounder, handles high-dimensional data well
    - ECOD: parameter-free, empirical CDF-based, very fast
    - LOF: catches local density anomalies IForest misses

    The weighted average of all three is more robust than any single model.
    """
    if not _HAS_PYOD:
        log.debug("PyOD not installed — skipping ML anomaly detection")
        return {}

    X, uids = _build_feature_matrix(entities)

    if len(X) < _PYOD_MIN_SAMPLES:
        log.debug("Only %d valid entities — need %d for ML ensemble", len(X), _PYOD_MIN_SAMPLES)
        return {}

    # Normalize features (z-score) to put speed/lat/lon on same scale
    means = X.mean(axis=0)
    stds  = X.std(axis=0)
    stds[stds == 0] = 1.0  # avoid division by zero
    X_norm = (X - means) / stds

    contamination = min(_PYOD_CONTAMINATION, 0.5)
    scores = np.zeros(len(X))

    try:
        # Model 1: Isolation Forest — random partitioning detects global outliers
        iforest = IForest(
            n_estimators=100,
            contamination=contamination,
            random_state=42,
            behaviour="new",  # use newer scoring convention
        )
        iforest.fit(X_norm)
        # decision_scores_ are raw anomaly scores (higher = more anomalous)
        s1 = iforest.decision_scores_
        # Normalize to 0–1 range
        s1 = (s1 - s1.min()) / (s1.max() - s1.min() + 1e-10)
        scores += _PYOD_ENSEMBLE_WEIGHTS[0] * s1
    except Exception as e:
        log.warning("IForest failed: %s", e)

    try:
        # Model 2: ECOD — empirical cumulative distribution, no hyperparameters
        ecod = ECOD(contamination=contamination)
        ecod.fit(X_norm)
        s2 = ecod.decision_scores_
        s2 = (s2 - s2.min()) / (s2.max() - s2.min() + 1e-10)
        scores += _PYOD_ENSEMBLE_WEIGHTS[1] * s2
    except Exception as e:
        log.warning("ECOD failed: %s", e)

    try:
        # Model 3: LOF — local density anomalies (entity acting unlike its neighbors)
        n_neighbors = min(20, len(X) - 1)
        lof = LOF(
            n_neighbors=n_neighbors,
            contamination=contamination,
        )
        lof.fit(X_norm)
        s3 = lof.decision_scores_
        s3 = (s3 - s3.min()) / (s3.max() - s3.min() + 1e-10)
        scores += _PYOD_ENSEMBLE_WEIGHTS[2] * s3
    except Exception as e:
        log.warning("LOF failed: %s", e)

    return {uids[i]: float(scores[i]) for i in range(len(uids))}


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC API (backward-compatible)
# ═══════════════════════════════════════════════════════════════════════════════

def analyze(entity: dict) -> AnomalyResult:
    """
    Run rule-based anomaly checks on a single entity.
    For ML-based detection, use analyze_batch() instead.
    """
    return _rule_based_analyze(entity)


def analyze_batch(entities: list[dict]) -> list[AnomalyResult]:
    """
    Run full two-tier anomaly analysis on a list of entities.

    Tier 1: Rule-based checks on each entity individually (instant).
    Tier 2: PyOD ensemble on the full batch (catches multivariate patterns).

    Returns only anomalous results, sorted by score descending.
    """
    # Tier 1: rule-based
    results_map: dict[str, AnomalyResult] = {}
    for e in entities:
        r = _rule_based_analyze(e)
        results_map[r.entity_uid] = r

    # Tier 2: PyOD ML ensemble
    ml_scores = _pyod_ensemble(entities)

    for uid, ml_score in ml_scores.items():
        if uid in results_map:
            result = results_map[uid]
            result.ml_score = ml_score

            # If ML says anomalous (top 10% of scores) but rules missed it
            if ml_score > 0.7 and not result.flags:
                result.flags.append("MULTIVARIATE_ANOMALY")
                result.details.append(
                    f"ML ensemble detected multivariate anomaly (score {ml_score:.2f}) "
                    "— unusual combination of speed/heading/position"
                )
                result.score += ml_score * 0.5

            # If both tiers flag it, boost confidence
            elif ml_score > 0.5 and result.flags:
                result.score += ml_score * 0.2
                result.details.append(
                    f"ML ensemble confirms rule-based detection (ml_score={ml_score:.2f})"
                )
        else:
            # Entity had no rule-based result but ML flagged it
            if ml_score > 0.7:
                r = AnomalyResult(
                    entity_uid=uid,
                    score=ml_score * 0.5,
                    ml_score=ml_score,
                    flags=["MULTIVARIATE_ANOMALY"],
                    details=[
                        f"ML ensemble detected multivariate anomaly (score {ml_score:.2f}) "
                        "— no rule-based flags but behavioral pattern is outlying"
                    ],
                )
                results_map[uid] = r

    # Filter and sort
    results = [
        r for r in results_map.values()
        if r.score > 0.1 or r.flags
    ]
    return sorted(results, key=lambda x: -x.score)
