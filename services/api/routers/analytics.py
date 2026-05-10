"""
GET /api/v1/analytics/threats              — entity threat ranking
GET /api/v1/analytics/anomalies            — behavioral anomaly detection
GET /api/v1/analytics/geofence             — named AOI alerts
POST /api/v1/analytics/geofence            — custom geofence check
GET /api/v1/analytics/clusters             — DBSCAN spatial clustering
GET /api/v1/analytics/formations           — tactical formation detection
GET /api/v1/analytics/density              — hexbin density grid
GET /api/v1/analytics/predict/{id}         — Kalman position prediction
GET /api/v1/analytics/hover-intel/{id}     — AI hover assessment
GET /api/v1/analytics/macro-overlay        — country capital macro markers
GET /api/v1/analytics/explain/{id}         — SHAP explainability for entity scores
"""
from __future__ import annotations

import time
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from core.db import pool
from engines import anomaly as anomaly_engine
from engines import clustering as cluster_engine
from engines import explain as explain_engine
from engines import geofence as geofence_engine
from engines import kalman as kalman_engine
from engines import threat as threat_engine
from engines import intelligence as intel_engine

log = logging.getLogger("mss.analytics")

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

# ── TTL cache for hover-intel (avoids spamming LLM on every mouse move) ────────
_hover_cache: dict[str, tuple[float, dict]] = {}   # entity_id → (expiry_ts, result)
HOVER_CACHE_TTL = 300  # 5 minutes

def _get_hover_cached(entity_id: str) -> dict | None:
    entry = _hover_cache.get(entity_id)
    if entry and entry[0] > time.monotonic():
        return entry[1]
    return None

def _set_hover_cached(entity_id: str, result: dict) -> None:
    _hover_cache[entity_id] = (time.monotonic() + HOVER_CACHE_TTL, result)

# ── Country capital coordinates for macro overlay ──────────────────────────────
COUNTRY_CAPITALS = {
    "USA": {"name": "United States",  "lat": 38.90, "lon": -77.04},
    "CHN": {"name": "China",         "lat": 39.91, "lon": 116.39},
    "RUS": {"name": "Russia",        "lat": 55.76, "lon": 37.62},
    "GBR": {"name": "United Kingdom", "lat": 51.51, "lon": -0.13},
    "SAU": {"name": "Saudi Arabia",  "lat": 24.69, "lon": 46.72},
    "IRN": {"name": "Iran",          "lat": 35.69, "lon": 51.39},
    "ISR": {"name": "Israel",        "lat": 31.77, "lon": 35.22},
    "UKR": {"name": "Ukraine",       "lat": 50.45, "lon": 30.52},
    "IND": {"name": "India",         "lat": 28.61, "lon": 77.21},
    "TUR": {"name": "Turkey",        "lat": 39.93, "lon": 32.86},
    "DEU": {"name": "Germany",       "lat": 52.52, "lon": 13.41},
    "FRA": {"name": "France",        "lat": 48.86, "lon": 2.35},
    "JPN": {"name": "Japan",         "lat": 35.68, "lon": 139.69},
    "BRA": {"name": "Brazil",        "lat": -15.79, "lon": -47.88},
    "ARE": {"name": "UAE",           "lat": 24.45, "lon": 54.65},
    "EGY": {"name": "Egypt",         "lat": 30.04, "lon": 31.24},
    "KOR": {"name": "South Korea",   "lat": 37.57, "lon": 126.98},
    "AUS": {"name": "Australia",     "lat": -35.28, "lon": 149.13},
    "PAK": {"name": "Pakistan",      "lat": 33.69, "lon": 73.04},
    "ZAF": {"name": "South Africa",  "lat": -25.75, "lon": 28.19},
}


# ── Helper: load all entities from DB ─────────────────────────────────────────

async def _load_entities(limit: int = 2000) -> list[dict]:
    db   = pool()
    rows = await db.fetch(
        "SELECT id, uid, entity_type, callsign, lat, lon, altitude, heading, "
        "       speed, affiliation, source, stale_at, last_seen "
        "FROM entities WHERE lat IS NOT NULL ORDER BY last_seen DESC LIMIT $1",
        limit,
    )
    return [
        {
            "id":          str(r["id"]),
            "uid":         r["uid"],
            "entityType":  r["entity_type"],
            "callsign":    r.get("callsign"),
            "lat":         r.get("lat"),
            "lon":         r.get("lon"),
            "altitude":    r.get("altitude"),
            "heading":     r.get("heading"),
            "speed":       r.get("speed"),
            "affiliation": r.get("affiliation", "unknown"),
            "source":      r["source"],
            "staleAt":     r["stale_at"].isoformat() + "Z" if r.get("stale_at") else None,
            "lastSeen":    r["last_seen"].isoformat() + "Z",
        }
        for r in rows
    ]


# ── Threat ranking ─────────────────────────────────────────────────────────────

@router.get("/threats")
async def get_threats(
    limit:     int           = Query(50, ge=1, le=500),
    min_score: int           = Query(0,  ge=0, le=100),
    level:     Optional[str] = Query(None, description="Low|Medium|High|Critical"),
) -> dict:
    entities  = await _load_entities()
    anomalies_raw = anomaly_engine.analyze_batch(entities)
    anom_map  = {a.entity_uid: a for a in anomalies_raw}

    threats   = threat_engine.rank_threats(entities, anom_map, min_score=min_score)

    if level:
        threats = [t for t in threats if t.level.lower() == level.lower()]

    return {
        "threats":     [t.as_dict() for t in threats[:limit]],
        "total":       len(threats),
        "entityCount": len(entities),
    }


# ── Anomaly detection ──────────────────────────────────────────────────────────

@router.get("/anomalies")
async def get_anomalies(
    limit:     int           = Query(50, ge=1, le=500),
    min_score: float         = Query(0.1, ge=0.0, le=2.0),
) -> dict:
    entities  = await _load_entities()
    anomalies = anomaly_engine.analyze_batch(entities)

    filtered  = [a for a in anomalies if a.score >= min_score]

    return {
        "anomalies": [a.as_dict() for a in filtered[:limit]],
        "total":     len(filtered),
    }


# ── Named AOI geofence alerts ──────────────────────────────────────────────────

@router.get("/geofence")
async def get_geofence_alerts() -> dict:
    entities = await _load_entities()
    alerts   = geofence_engine.check_all(entities)
    return {
        "alerts": [a.as_dict() for a in alerts],
        "total":  len(alerts),
        "aois":   [{"name": aoi.name, "severity": aoi.severity}
                   for aoi in geofence_engine.NAMED_AOIS],
    }


# ── Custom geofence check ──────────────────────────────────────────────────────

@router.post("/geofence")
async def custom_geofence(body: dict) -> dict:
    """
    Body: {"type": "circle"|"bbox"|"polygon", ...}
    Circle:  {"type":"circle","lat":26.5,"lon":56.3,"radiusNm":30}
    BBox:    {"type":"bbox","minLat":24,"minLon":50,"maxLat":28,"maxLon":57}
    Polygon: {"type":"polygon","vertices":[{"lat":...,"lon":...},...]}
    """
    entities   = await _load_entities()
    entity_ids = geofence_engine.custom_geofence_check(entities, body)
    matched    = [e for e in entities if e.get("id") in entity_ids]

    return {"entityIds": entity_ids, "matched": matched, "count": len(entity_ids)}


# ── Spatial clustering ─────────────────────────────────────────────────────────

@router.get("/clusters")
async def get_clusters(
    eps_nm:  float = Query(30.0, ge=1.0, le=500.0),
    min_pts: int   = Query(3,    ge=2,   le=20),
) -> dict:
    entities             = await _load_entities()
    assignments, clusters = cluster_engine.dbscan(entities, eps_nm=eps_nm, min_pts=min_pts)

    noise_count = sum(1 for v in assignments.values() if v == -1)

    return {
        "clusters":   [c.as_dict() for c in clusters],
        "clusterCount": len(clusters),
        "noiseCount": noise_count,
        "totalEntities": len(entities),
    }


# ── Formation detection ────────────────────────────────────────────────────────

@router.get("/formations")
async def get_formations(
    eps_nm:   float = Query(15.0, ge=1.0, le=100.0),
    min_size: int   = Query(3,    ge=2,   le=20),
) -> dict:
    entities   = await _load_entities()
    formations = cluster_engine.detect_formations(entities, eps_nm=eps_nm, min_size=min_size)

    return {
        "formations": [f.as_dict() for f in formations],
        "total":      len(formations),
    }


# ── Hexbin density grid ────────────────────────────────────────────────────────

@router.get("/density")
async def get_density(
    resolution: int           = Query(4, ge=1, le=8),
    source:     Optional[str] = Query(None),
    affiliation: Optional[str] = Query(None),
) -> dict:
    entities = await _load_entities()

    if source:
        entities = [e for e in entities if e.get("source") == source]
    if affiliation:
        entities = [e for e in entities if e.get("affiliation") == affiliation]

    grid = cluster_engine.hexbin_density(entities, resolution=resolution)

    return {
        "grid":       grid,
        "cellCount":  len(grid),
        "resolution": resolution,
    }


# ── Position prediction ────────────────────────────────────────────────────────

@router.get("/predict/{entity_id}")
async def predict_position(
    entity_id: str,
    horizon:   int = Query(300, ge=30, le=3600, description="Seconds ahead"),
) -> dict:
    db  = pool()
    row = await db.fetchrow("SELECT uid FROM entities WHERE id = $1 OR uid = $1", entity_id)
    if not row:
        raise HTTPException(404, "Entity not found")

    uid = row["uid"]

    # Feed recent sightings into the Kalman filter
    sights = await db.fetch(
        """
        SELECT s.lat, s.lon, s.source,
               extract(epoch FROM s.observed_at) AS ts
        FROM sightings s
        JOIN entities e ON e.id = s.entity_id
        WHERE e.uid = $1
        ORDER BY s.observed_at ASC
        LIMIT 100
        """,
        uid,
    )

    if not sights:
        raise HTTPException(422, "Not enough track data for prediction")

    # Reset filter for this entity
    if uid in kalman_engine._filters:
        del kalman_engine._filters[uid]

    for s in sights:
        noise = kalman_engine.SOURCE_NOISE.get(s.get("source", "MANUAL"), 1e-4)
        kalman_engine.smooth_entity(uid, s["lat"], s["lon"], t=s["ts"], meas_noise=noise)

    pred = kalman_engine.predict_entity(uid, horizon_sec=float(horizon))
    if pred is None:
        raise HTTPException(422, "Insufficient track data")

    kf = kalman_engine._filters[uid]

    return {
        "uid":           uid,
        "horizonSec":    horizon,
        "predictedLat":  pred[0],
        "predictedLon":  pred[1],
        "estimatedSpeed": round(kf.velocity_kts(), 2),
        "trackPoints":   len(sights),
    }


# ── Hover intelligence (AI assessment on map hover) ────────────────────────────

@router.get("/hover-intel/{entity_id}")
async def get_hover_intel(entity_id: str) -> dict:
    """
    Returns a compact AI-analyzed assessment for a hovered entity.
    Uses TTL cache to avoid redundant LLM calls.
    Falls back to template-based analysis when LLM is offline.
    """
    # Check cache first
    cached = _get_hover_cached(entity_id)
    if cached:
        return cached

    db = pool()

    # Load entity
    row = await db.fetchrow(
        "SELECT id, uid, entity_type, callsign, lat, lon, altitude, heading, "
        "       speed, affiliation, source, last_seen "
        "FROM entities WHERE id::text = $1 OR uid = $1 LIMIT 1",
        entity_id,
    )
    if not row:
        raise HTTPException(404, "Entity not found")

    entity = {
        "id":          str(row["id"]),
        "uid":         row["uid"],
        "entityType":  row["entity_type"],
        "callsign":    row.get("callsign"),
        "lat":         row.get("lat"),
        "lon":         row.get("lon"),
        "altitude":    row.get("altitude"),
        "heading":     row.get("heading"),
        "speed":       row.get("speed"),
        "affiliation": row.get("affiliation", "unknown"),
        "source":      row["source"],
        "lastSeen":    row["last_seen"].isoformat() + "Z",
    }

    uid = row["uid"]

    # Load sightings history
    sightings_rows = await db.fetch(
        "SELECT s.lat, s.lon, s.speed, s.heading, s.source, s.observed_at "
        "FROM sightings s JOIN entities e ON e.id = s.entity_id "
        "WHERE e.uid = $1 ORDER BY s.observed_at DESC LIMIT 30",
        uid,
    )
    sightings = [
        {"lat": s["lat"], "lon": s["lon"], "speed": s.get("speed"),
         "heading": s.get("heading"), "source": s.get("source"),
         "observedAt": s["observed_at"].isoformat() + "Z"}
        for s in sightings_rows
    ]

    # Run threat + anomaly engines for this entity
    all_entities = await _load_entities(limit=500)
    anomalies_raw = anomaly_engine.analyze_batch(all_entities)
    anom_map = {a.entity_uid: a for a in anomalies_raw}
    threats_raw = threat_engine.rank_threats(all_entities, anom_map, min_score=0)

    threat_for_entity = next(
        (t.as_dict() for t in threats_raw if t.uid == uid), None
    )
    anomaly_for_entity = anom_map.get(uid)
    anomaly_dict = anomaly_for_entity.as_dict() if anomaly_for_entity else None

    # Generate template-based intelligence assessment
    intel = intel_engine.build_entity_assessment(
        entity=entity,
        threat=threat_for_entity,
        anomaly=anomaly_dict,
        sightings=sightings,
    )

    # Try LLM enhancement
    try:
        intel = await intel_engine.enhance_with_llm(
            intel,
            f"Entity: {entity.get('callsign', uid)} ({entity.get('entityType')}/{entity.get('affiliation')}) "
            f"at {entity.get('lat'):.4f}N {entity.get('lon'):.4f}E, speed {entity.get('speed', 0)} kts. "
            f"Threat score: {intel.threatScore}/100. Sightings: {len(sightings)}."
        )
    except Exception as e:
        log.warning("LLM enhancement failed for hover-intel: %s", e)

    # Build compact response
    result = {
        "entityId":     entity["id"],
        "uid":          uid,
        "callsign":     entity.get("callsign") or uid[:8],
        "entityType":   entity["entityType"],
        "affiliation":  entity["affiliation"],
        "source":       entity["source"],
        "lat":          entity.get("lat"),
        "lon":          entity.get("lon"),
        "speed":        entity.get("speed"),
        "heading":      entity.get("heading"),
        # AI assessment
        "title":        intel.title,
        "summary":      intel.summary,
        "keyFindings":  intel.keyFindings[:5],
        "threatScore":  intel.threatScore,
        "confidence":   intel.confidence,
        "indicators":   intel.indicators[:3],
        "hypotheses":   intel.hypotheses[:2],
        "collectionGaps": intel.collectionGaps[:3],
        "llmNarrative": intel.llmNarrative,
        "sources":      intel.sources,
        "sightingCount": len(sightings),
        "cachedAt":     time.time(),
    }

    _set_hover_cached(entity_id, result)
    return result


# ── Macro overlay (country capital markers for map) ────────────────────────────

@router.get("/macro-overlay")
async def get_macro_overlay() -> dict:
    """
    Returns macro economic indicators plotted at country capital coordinates
    for the DeckGL map overlay. Includes GDP growth, FX stress, and risk tier.
    """
    import httpx
    from engines.macro import _cached, _set_cache, FRANKFURTER_URL, parse_fx_rates

    cache_key = "macro_overlay"
    cached_data = _cached(cache_key)
    if cached_data:
        return cached_data

    markers = []
    fx_rates = {}

    # Fetch FX rates
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(FRANKFURTER_URL, params={"base": "USD"})
            if resp.status_code == 200:
                fx_data = parse_fx_rates(resp.json())
                fx_rates = fx_data.get("rates", {})
    except Exception:
        pass

    # Map currency codes to countries
    COUNTRY_CCY = {
        "USA": "USD", "CHN": "CNY", "RUS": "RUB", "GBR": "GBP",
        "SAU": "SAR", "IRN": "IRR", "ISR": "ILS", "UKR": "UAH",
        "IND": "INR", "TUR": "TRY", "DEU": "EUR", "FRA": "EUR",
        "JPN": "JPY", "BRA": "BRL", "ARE": "AED", "EGY": "EGP",
        "KOR": "KRW", "AUS": "AUD", "PAK": "PKR", "ZAF": "ZAR",
    }

    # Risk tiers (geopolitical classification)
    RISK_TIER = {
        "USA": "allied", "GBR": "allied", "DEU": "allied", "FRA": "allied",
        "JPN": "allied", "KOR": "allied", "AUS": "allied",
        "IRN": "adversary", "RUS": "adversary",
        "CHN": "competitor", "TUR": "neutral", "IND": "neutral",
        "SAU": "neutral", "ARE": "neutral", "EGY": "neutral",
        "BRA": "neutral", "PAK": "neutral", "ZAF": "neutral",
        "ISR": "allied", "UKR": "partner",
    }

    for iso, coords in COUNTRY_CAPITALS.items():
        ccy = COUNTRY_CCY.get(iso, "")
        fx_val = fx_rates.get(ccy)
        risk = RISK_TIER.get(iso, "unknown")

        markers.append({
            "iso":      iso,
            "name":     coords["name"],
            "lat":      coords["lat"],
            "lon":      coords["lon"],
            "position": [coords["lon"], coords["lat"]],
            "currency": ccy,
            "fxRate":   fx_val,
            "riskTier": risk,
        })

    result = {"markers": markers, "count": len(markers)}
    _set_cache(cache_key, result)
    return result


# ── SHAP Explainability ────────────────────────────────────────────────────────

@router.get("/explain/{entity_id}")
async def explain_entity(entity_id: str) -> dict:
    """
    Explain why an entity received its threat score and/or anomaly score.
    Uses SHAP (Lundberg & Lee 2017) for ML models, rule decomposition for
    rule-based threat scoring.

    Returns per-feature contributions so the analyst can understand:
    - Which features drove the anomaly/threat score
    - The direction and magnitude of each feature's impact
    - The top 5 most influential features
    """
    entities = await _load_entities()

    # Find target entity
    target = next((e for e in entities if e.get("id") == entity_id or e.get("uid") == entity_id), None)
    if not target:
        raise HTTPException(404, "Entity not found")

    uid = target.get("uid", "")

    # Run anomaly + threat engines
    anomalies_raw = anomaly_engine.analyze_batch(entities)
    anom_map = {a.entity_uid: a for a in anomalies_raw}
    threats = threat_engine.rank_threats(entities, anom_map, min_score=0)

    threat_for_entity = next((t.as_dict() for t in threats if t.uid == uid), None)

    result = {"entityUid": uid, "explanations": []}

    # Explain threat score (rule-based decomposition)
    if threat_for_entity:
        threat_explanation = explain_engine.explain_threat_score(target, threat_for_entity)
        result["explanations"].append(threat_explanation.as_dict())

    # Note: SHAP explanation for ML anomaly model requires the fitted model
    # which is ephemeral in the current analyze_batch flow. In production,
    # you'd cache the fitted model and pass it here.
    # For now, include the ml_score if available.
    anomaly_for_entity = anom_map.get(uid)
    if anomaly_for_entity:
        result["anomaly"] = anomaly_for_entity.as_dict()

    return result
