"""
Threat Scoring Engine — pure Python rule-based model.

Threat score 0–100 per entity:

  Base (affiliation):
    hostile  → 65
    unknown  → 25
    neutral  → 8
    friendly → 0

  Modifiers:
    Anomaly score > 0.5  → +20
    Anomaly score > 0.2  → +10
    Within 50nm of hostile → +15
    Aircraft (high reach) → +5
    AIS dark ship flag    → +12
    OSINT source only     → -5 (less reliable)
    Stale > 2h            → -15 (data quality penalty)
    Speed impossible      → +8

Final score clamped 0–100, with confidence 0.0–1.0 (how much data we have).
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

from .anomaly import AnomalyResult

# Haversine distance (returns nautical miles)
def _nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R   = 3440.065   # earth radius in nm
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ  = math.radians(lat2 - lat1)
    Δλ  = math.radians(lon2 - lon1)
    a   = math.sin(Δφ/2)**2 + math.cos(φ1) * math.cos(φ2) * math.sin(Δλ/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@dataclass
class ThreatResult:
    entity_id:    str
    uid:          str
    callsign:     str | None
    entity_type:  str
    score:        int           # 0–100
    confidence:   float         # 0–1
    level:        str           # Low / Medium / High / Critical
    reasons:      list[str]     = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "entityId":   self.entity_id,
            "uid":        self.uid,
            "callsign":   self.callsign,
            "entityType": self.entity_type,
            "score":      self.score,
            "confidence": round(self.confidence, 2),
            "level":      self.level,
            "reasons":    self.reasons,
        }


def _level(score: int) -> str:
    if score >= 80: return "Critical"
    if score >= 55: return "High"
    if score >= 30: return "Medium"
    return "Low"


def score_entity(
    entity:         dict,
    all_entities:   list[dict],
    anomaly:        AnomalyResult | None = None,
) -> ThreatResult:
    """Compute threat score for a single entity in context of all others."""
    uid          = entity.get("uid", "")
    affiliation  = entity.get("affiliation", "unknown")
    etype        = entity.get("entityType", "ground")
    source       = entity.get("source", "MANUAL")
    last_seen    = entity.get("lastSeen", "")
    lat          = entity.get("lat")
    lon          = entity.get("lon")

    score   = 0
    reasons = []
    data_points = 0

    # ── Base score (affiliation) ───────────────────────────────────────────────
    base_map = {"hostile": 65, "unknown": 25, "neutral": 8, "friendly": 0}
    base     = base_map.get(affiliation, 25)
    score   += base
    if base > 0:
        reasons.append(f"Affiliation={affiliation} (+{base})")
    data_points += 1

    # ── Anomaly modifier ───────────────────────────────────────────────────────
    if anomaly:
        if anomaly.score >= 0.5:
            score   += 20
            reasons.append(f"High anomaly score {anomaly.score:.2f} (+20)")
        elif anomaly.score >= 0.2:
            score   += 10
            reasons.append(f"Anomaly score {anomaly.score:.2f} (+10)")

        if "DARK_SHIP" in anomaly.flags:
            score   += 12
            reasons.append("AIS dark ship detected (+12)")

        if "IMPOSSIBLE_SPEED" in anomaly.flags:
            score   += 8
            reasons.append("Impossible speed (+8)")

    # ── Type modifier ──────────────────────────────────────────────────────────
    if etype == "aircraft":
        score   += 5
        reasons.append("Aircraft (high reach) (+5)")
    data_points += 1

    # ── Proximity to known hostiles ────────────────────────────────────────────
    if lat is not None and lon is not None:
        hostiles_nearby = [
            e for e in all_entities
            if e.get("affiliation") == "hostile"
            and e.get("uid") != uid
            and e.get("lat") is not None
            and _nm(lat, lon, e["lat"], e["lon"]) <= 50
        ]
        if hostiles_nearby:
            score   += 15
            nearest_nm = min(_nm(lat, lon, h["lat"], h["lon"]) for h in hostiles_nearby)
            reasons.append(
                f"{len(hostiles_nearby)} hostile(s) within 50nm "
                f"(nearest {nearest_nm:.1f}nm) (+15)"
            )
        data_points += 1

    # ── Source reliability penalty ─────────────────────────────────────────────
    if source == "OSINT":
        score   -= 5
        reasons.append("OSINT source only — reduced reliability (-5)")

    # ── Staleness penalty ─────────────────────────────────────────────────────
    if last_seen:
        try:
            from datetime import datetime, timezone
            ls  = datetime.fromisoformat(last_seen.rstrip("Z")).replace(tzinfo=timezone.utc)
            age = (datetime.now(timezone.utc) - ls).total_seconds()
            if age > 7200:  # 2h
                score   -= 15
                reasons.append(f"Data stale {age/3600:.1f}h (-15)")
        except Exception:
            pass

    score = max(0, min(100, score))
    confidence = min(1.0, data_points / 3.0)

    return ThreatResult(
        entity_id   = entity.get("id", uid),
        uid         = uid,
        callsign    = entity.get("callsign"),
        entity_type = etype,
        score       = score,
        confidence  = confidence,
        level       = _level(score),
        reasons     = reasons,
    )


def rank_threats(
    entities:  list[dict],
    anomalies: dict[str, AnomalyResult] | None = None,
    min_score: int = 0,
) -> list[ThreatResult]:
    """
    Score all entities and return ranked threat list (highest first).
    anomalies: uid → AnomalyResult lookup.
    """
    if anomalies is None:
        anomalies = {}

    results = [
        score_entity(e, entities, anomalies.get(e.get("uid", "")))
        for e in entities
        if e.get("lat") is not None
    ]
    return sorted(
        [r for r in results if r.score >= min_score],
        key=lambda r: -r.score,
    )
