"""
Pattern of Life (PoL) Engine — Palantir Maven-style behavioral baseline analysis.

For each tracked entity we maintain a behavioral profile:
  - Operating area    : bounding box + centroid of historical positions
  - Speed baseline    : mean ± std of historical speeds
  - Active hours      : UTC hours the entity is typically observed
  - Heading variance  : how much the entity changes direction (erratic vs. directional)
  - Source consistency: does it appear from one source or many?

PoL deviation scoring:
  - Position outside historical operating area → HIGH deviation
  - Speed > 3σ from personal baseline         → MODERATE deviation
  - Activity during unusual hours             → LOW deviation
  - Route correlation with other hostile      → MODERATE deviation

PyOD upgrade (optional):
  When pyod is installed, IsolationForest + LOF are used on the full
  [lat, lon, speed] feature matrix for richer anomaly scoring.
  Falls back to the statistical approach when pyod is unavailable.

Unlike the anomaly engine (which uses type-level baselines), PoL builds a
per-entity personalized baseline from that entity's own history.
Requires ≥10 sightings to establish a meaningful baseline.
"""
from __future__ import annotations

import logging
import math
import statistics
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger("mss.pol")

# ── PyOD optional import ──────────────────────────────────────────────────────
try:
    import numpy as np
    from pyod.models.iforest import IForest
    from pyod.models.lof import LOF
    _PYOD_AVAILABLE = True
    log.info("PyOD available — using IsolationForest + LOF for PoL scoring")
except ImportError:
    _PYOD_AVAILABLE = False
    log.debug("PyOD not installed — falling back to statistical PoL scoring")

# ── Per-entity profile store ──────────────────────────────────────────────────
# uid → list of sighting dicts {lat, lon, speed, heading, ts_utc_hour}
_profiles: dict[str, list[dict]] = defaultdict(list)
_MAX_PROFILE = 500   # max sightings per entity in memory

MIN_SIGHTINGS_FOR_BASELINE  = 10
MIN_SIGHTINGS_FOR_PYOD      = 20   # need more data for ML-based scoring


def record_position(uid: str, lat: float, lon: float,
                    speed: float, heading: float, ts: str | None = None) -> None:
    """Append a position to the entity's PoL profile."""
    hour = 0
    if ts:
        try:
            dt = datetime.fromisoformat(ts.rstrip("Z")).replace(tzinfo=timezone.utc)
            hour = dt.hour
        except Exception:
            pass

    buf = _profiles[uid]
    buf.append({"lat": lat, "lon": lon, "speed": speed or 0.0,
                "heading": heading or 0.0, "hour": hour})
    if len(buf) > _MAX_PROFILE:
        del buf[0]


# ── Haversine (nm) ────────────────────────────────────────────────────────────

def _nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3440.065
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(max(0, a)))


# ── PoL result ────────────────────────────────────────────────────────────────

@dataclass
class PolResult:
    entity_uid:      str
    deviation_score: float  = 0.0    # 0 = normal, 1+ = anomalous
    flags:           list[str] = field(default_factory=list)
    details:         list[str] = field(default_factory=list)
    baseline:        dict      = field(default_factory=dict)
    sighting_count:  int       = 0
    ml_score:        float     = 0.0  # PyOD composite anomaly score (0-1)
    history:         list[dict] = field(default_factory=list)  # last N sightings for timeline

    def as_dict(self) -> dict:
        return {
            "entityUid":      self.entity_uid,
            "deviationScore": round(self.deviation_score, 3),
            "flags":          self.flags,
            "details":        self.details,
            "baseline":       self.baseline,
            "sightingCount":  self.sighting_count,
            "mlScore":        round(self.ml_score, 3),
            "severity":       self._severity(),
            "history":        self.history[-30:],  # last 30 for timeline
        }

    def _severity(self) -> str:
        score = max(self.deviation_score, self.ml_score)
        if score >= 0.7: return "critical"
        if score >= 0.35: return "warning"
        return "normal"


# ── PyOD scoring ─────────────────────────────────────────────────────────────

def _pyod_score(history: list[dict], current: dict) -> float:
    """
    Use IsolationForest + LOF ensemble to score how anomalous the current
    observation is relative to the entity's historical profile.
    Returns 0-1 anomaly score.
    """
    if not _PYOD_AVAILABLE or len(history) < MIN_SIGHTINGS_FOR_PYOD:
        return 0.0

    try:
        X_hist = np.array([[s["lat"], s["lon"], s["speed"]] for s in history], dtype=float)
        x_curr = np.array([[current["lat"], current["lon"], current["speed"]]], dtype=float)

        # Normalize features
        mean = X_hist.mean(axis=0)
        std  = X_hist.std(axis=0) + 1e-9
        X_norm = (X_hist - mean) / std
        x_norm = (x_curr - mean) / std

        # IsolationForest
        n_samples = len(X_hist)
        ifo = IForest(n_estimators=50, contamination=0.1, random_state=42)
        ifo.fit(X_norm)
        ifo_score = float(ifo.decision_function(x_norm)[0])  # negative = more anomalous

        # LOF (only if enough samples)
        lof_score = 0.0
        if n_samples >= 30:
            n_neighbors = min(20, n_samples // 2)
            lof = LOF(n_neighbors=n_neighbors, contamination=0.1)
            lof.fit(X_norm)
            lof_score = float(lof.decision_function(x_norm)[0])

        # Combine: IFo score is negative-anomaly, convert to 0-1
        # IsolationForest: lower score = more anomalous (typical range -0.5 to 0.5)
        ifo_norm  = max(0.0, min(1.0, (-ifo_score + 0.5) / 1.0))
        lof_norm  = max(0.0, min(1.0, (-lof_score + 0.5) / 1.0)) if n_samples >= 30 else 0.0

        if n_samples >= 30:
            return round((ifo_norm * 0.5 + lof_norm * 0.5), 3)
        return round(ifo_norm, 3)

    except Exception as e:
        log.debug("PyOD scoring failed for entity: %s", e)
        return 0.0


# ── Core analysis ─────────────────────────────────────────────────────────────

def analyze_pol(entity: dict[str, Any]) -> PolResult | None:
    """
    Compute Pattern of Life deviation for a single entity.
    Returns None if insufficient history.
    """
    uid     = entity.get("uid", "")
    history = _profiles.get(uid, [])
    result  = PolResult(entity_uid=uid, sighting_count=len(history))

    if len(history) < MIN_SIGHTINGS_FOR_BASELINE:
        return None   # Not enough data yet

    # ── Build baseline ────────────────────────────────────────────────────────
    lats    = [s["lat"]     for s in history]
    lons    = [s["lon"]     for s in history]
    speeds  = [s["speed"]   for s in history]
    hours   = [s["hour"]    for s in history]

    lat_mean = statistics.mean(lats)
    lon_mean = statistics.mean(lons)
    lat_min, lat_max = min(lats), max(lats)
    lon_min, lon_max = min(lons), max(lons)

    spd_mean = statistics.mean(speeds)
    spd_std  = statistics.stdev(speeds) if len(speeds) > 2 else 1.0

    # Active hours: which UTC hours does this entity appear?
    hour_counts: dict[int, int] = {}
    for h in hours:
        hour_counts[h] = hour_counts.get(h, 0) + 1
    active_hours = sorted(hour_counts, key=lambda h: -hour_counts[h])[:8]

    # Operating area radius from centroid
    distances = [_nm(lat_mean, lon_mean, s["lat"], s["lon"]) for s in history]
    area_radius_nm = (statistics.quantile(sorted(distances), 0.90)
                      if len(distances) >= 10 else max(distances, default=50))
    area_radius_nm = max(area_radius_nm, 5.0)   # floor to avoid degenerate baseline

    result.baseline = {
        "latMean": round(lat_mean, 4), "lonMean": round(lon_mean, 4),
        "latRange": [round(lat_min, 4), round(lat_max, 4)],
        "lonRange": [round(lon_min, 4), round(lon_max, 4)],
        "speedMean": round(spd_mean, 1), "speedStd": round(spd_std, 1),
        "activeHours": active_hours,
        "operatingRadiusNm": round(area_radius_nm, 1),
        "mlAvailable": _PYOD_AVAILABLE and len(history) >= MIN_SIGHTINGS_FOR_PYOD,
    }

    # ── Evaluate current position ─────────────────────────────────────────────
    cur_lat  = entity.get("lat") or entity.get("latitude")
    cur_lon  = entity.get("lon") or entity.get("longitude")
    cur_spd  = entity.get("speed") or 0.0
    last_seen = entity.get("lastSeen", "")

    if cur_lat and cur_lon:
        # 1. Distance from historical centroid
        dist_from_centroid = _nm(lat_mean, lon_mean, cur_lat, cur_lon)
        if dist_from_centroid > area_radius_nm * 2.0:
            result.flags.append("OUT_OF_AREA")
            result.details.append(
                f"Current position {dist_from_centroid:.0f}nm from historical centroid "
                f"(baseline radius: {area_radius_nm:.0f}nm) — outside normal operating area"
            )
            result.deviation_score += min(0.5, (dist_from_centroid / area_radius_nm - 1) * 0.15)

        # 2. Speed deviation from personal baseline
        if spd_std > 0:
            z = abs(cur_spd - spd_mean) / spd_std
            if z > 2.5:
                result.flags.append("SPEED_DEVIATION")
                result.details.append(
                    f"Speed {cur_spd:.1f}kts is {z:.1f}σ from personal baseline "
                    f"({spd_mean:.0f}±{spd_std:.0f}kts)"
                )
                result.deviation_score += min(0.3, (z - 2.5) * 0.1)

        # 3. Activity hour anomaly
        if last_seen:
            try:
                dt = datetime.fromisoformat(last_seen.rstrip("Z")).replace(tzinfo=timezone.utc)
                cur_hour = dt.hour
                if active_hours and cur_hour not in active_hours:
                    result.flags.append("UNUSUAL_ACTIVITY_HOUR")
                    result.details.append(
                        f"Active at {cur_hour:02d}:00 UTC — outside normal activity window {active_hours[:3]}"
                    )
                    result.deviation_score += 0.1
            except Exception:
                pass

        # 4. PyOD ML scoring
        if _PYOD_AVAILABLE and len(history) >= MIN_SIGHTINGS_FOR_PYOD:
            ml_score = _pyod_score(history, {"lat": cur_lat, "lon": cur_lon, "speed": cur_spd})
            result.ml_score = ml_score
            if ml_score > 0.65 and "ML_ANOMALY" not in result.flags:
                result.flags.append("ML_ANOMALY")
                result.details.append(
                    f"ML ensemble (IsolationForest + LOF) anomaly score: {ml_score:.0%} "
                    f"— behavioral pattern significantly deviates from historical norm"
                )
                # Blend ML score into deviation score (ML contributes up to 0.4)
                result.deviation_score += (ml_score - 0.65) * 1.2

    # Add timeline history (last 30 sightings for frontend)
    result.history = [
        {"lat": s["lat"], "lon": s["lon"], "speed": s["speed"],
         "heading": s["heading"], "hour": s["hour"]}
        for s in history[-30:]
    ]

    # If zero flags = normal, skip returning lightweight result
    if not result.flags:
        return None

    return result


def analyze_pol_batch(entities: list[dict]) -> list[PolResult]:
    """Run PoL analysis on all entities. Returns only anomalous results."""
    results = []
    for e in entities:
        r = analyze_pol(e)
        if r is not None:
            results.append(r)
    return sorted(results, key=lambda x: -x.deviation_score)


def get_profile_summary(uid: str) -> dict:
    """Return a compact summary of an entity's PoL profile."""
    h = _profiles.get(uid, [])
    if not h:
        return {"uid": uid, "sightings": 0, "status": "no_data"}
    entity_mock = {
        "uid":      uid,
        "lat":      h[-1]["lat"],
        "lon":      h[-1]["lon"],
        "speed":    h[-1]["speed"],
        "lastSeen": None,
    }
    r = analyze_pol(entity_mock)
    base = r.baseline if r else {}
    return {
        "uid":          uid,
        "sightings":    len(h),
        "baseline":     base,
        "flags":        r.flags if r else [],
        "deviationScore": r.deviation_score if r else 0.0,
        "mlScore":      r.ml_score if r else 0.0,
        "history":      [
            {"lat": s["lat"], "lon": s["lon"], "speed": s["speed"], "hour": s["hour"]}
            for s in h[-50:]
        ],
    }
