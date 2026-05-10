"""
MSS Dev Server — zero-dependency mode.
Runs entirely in-memory (no PostgreSQL, no Redis, no Ollama required).
Pulls live data from free public APIs (adsb.fi, USGS, NOAA, NASA FIRMS)
and runs all intelligence engines (threat scoring, anomaly detection,
Kalman filter, geofence, DBSCAN clustering) in-process.

Usage:
    python dev_main.py
    # → http://localhost:8000/health
    # → ws://localhost:8000/ws/entities
    # → ws://localhost:8000/ws/events
    # → GET http://localhost:8000/api/v1/entities
    # → GET http://localhost:8000/api/v1/analytics/threats
    # → GET http://localhost:8000/api/v1/analytics/anomalies
    # → GET http://localhost:8000/api/v1/analytics/geofence
    # → GET http://localhost:8000/api/v1/analytics/clusters
    # → GET http://localhost:8000/api/v1/analytics/density
    # → GET http://localhost:8000/api/v1/analytics/formations
    # → GET http://localhost:8000/api/v1/analytics/predict/{uid}
"""
from __future__ import annotations

import asyncio
import json
import logging
import math
import os
import random
import sys
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

# Load .env from project root (two levels up from services/api/)
load_dotenv(Path(__file__).parent.parent.parent / ".env")

# Add parent to path so engines are importable
sys.path.insert(0, str(Path(__file__).parent))
# Add ingestor to path so normalizers are importable
sys.path.insert(0, str(Path(__file__).parent.parent / "ingestor"))

from engines import anomaly as anomaly_engine
from engines import clustering as cluster_engine
from engines import geofence as geofence_engine
from engines import kalman as kalman_engine
from engines import threat as threat_engine
from engines import intelligence as intel_engine
from engines import pol as pol_engine
from engines import link_analysis as link_engine
from engines import actions as actions_engine
from engines import ontology as ontology_engine
from engines import market_intel as market_engine
from normalizers.adsbfi      import parse_adsbfi_response
from normalizers.usgs        import parse_usgs_geojson, USGS_URL, USGS_PARAMS
from normalizers.noaa_marine import parse_noaa_alerts, NOAA_ALERTS_URL, NOAA_PARAMS
from normalizers.firms       import parse_firms_csv, FIRMS_URL
from normalizers.gdelt       import parse_gdelt_artlist, build_conflict_query, gdelt_params, GDELT_DOC_URL
from normalizers.fred        import FRED_BASE, FRED_SERIES, fred_params, parse_fred_observations, build_economic_summary
from normalizers.acled       import parse_acled_response, ACLED_URL

logging.basicConfig(level="INFO", format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("mss.dev")

APP_VERSION = "0.1.0-dev"
_start = time.monotonic()

# ── In-memory store ───────────────────────────────────────────────────────────

_entities:      dict[str, dict[str, Any]] = {}      # uid → entity dict
_sightings:     dict[str, list]           = defaultdict(list)
_econ_data:     list[dict[str, Any]]      = []      # FRED economic indicators (latest)
_gdelt_events:  list[dict[str, Any]]      = []      # Recent GDELT conflict events (for market intel)

# ── WebSocket connection registry ─────────────────────────────────────────────

_entity_sockets: list[WebSocket] = []
_event_sockets:  list[WebSocket] = []


async def _broadcast(sockets: list[WebSocket], msg: str) -> None:
    dead = []
    for ws in sockets:
        try:
            await ws.send_text(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        try:
            sockets.remove(ws)
        except ValueError:
            pass


async def publish_entity(entity: dict[str, Any], op: str = "upsert") -> None:
    msg = json.dumps({
        "op":        op,
        "entity":    entity,
        "timestamp": _now(),
    })
    await _broadcast(_entity_sockets, msg)


async def publish_event(severity: str, message: str, entity_id: str | None = None) -> None:
    msg = json.dumps({
        "severity":  severity,
        "message":   message,
        "entityId":  entity_id,
        "timestamp": _now(),
    })
    await _broadcast(_event_sockets, msg)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat() + "Z"


# ── Synthetic data ────────────────────────────────────────────────────────────

AOI_GULF = {"lat": (24.0, 28.0), "lon": (50.0, 57.0)}

TEMPLATES = [
    {"entityType": "vessel",   "source": "AIS",   "affiliation": "neutral",  "speed": (5, 18),    "alt": 0.0},
    {"entityType": "vessel",   "source": "AIS",   "affiliation": "unknown",  "speed": (0, 8),     "alt": 0.0},
    {"entityType": "aircraft", "source": "ADS-B", "affiliation": "friendly", "speed": (250, 480), "alt": None},
    {"entityType": "aircraft", "source": "ADS-B", "affiliation": "unknown",  "speed": (180, 350), "alt": None},
    {"entityType": "ground",   "source": "CoT",   "affiliation": "friendly", "speed": (0, 25),    "alt": 0.0},
    {"entityType": "ground",   "source": "CoT",   "affiliation": "hostile",  "speed": (0, 40),    "alt": 0.0},
]

PREFIXES = {"vessel": "MV", "aircraft": "FL", "ground": "GND"}


def _make_entity(aoi: dict = AOI_GULF) -> dict[str, Any]:
    t      = random.choice(TEMPLATES)
    spd    = random.uniform(*t["speed"])
    hdg    = random.uniform(0, 360)
    pfx    = PREFIXES[t["entityType"]]
    prefix = f"{pfx}-{random.randint(100,999)}"
    alt    = random.uniform(1000, 35000) if t["entityType"] == "aircraft" else t["alt"]
    uid    = f"SIM-{uuid.uuid4().hex[:8].upper()}"

    return {
        "id":          str(uuid.uuid4()),
        "uid":         uid,
        "entityType":  t["entityType"],
        "callsign":    prefix,
        "lat":         round(random.uniform(*aoi["lat"]), 5),
        "lon":         round(random.uniform(*aoi["lon"]), 5),
        "altitude":    round(alt, 1) if alt is not None else None,
        "heading":     round(hdg, 1),
        "speed":       round(spd, 2),
        "affiliation": t["affiliation"],
        "source":      t["source"],
        "staleAt":     None,
        "lastSeen":    _now(),
    }


def _move(e: dict[str, Any], dt: float) -> dict[str, Any]:
    if e.get("heading") is None or e.get("speed") is None:
        return e
    dist_nm  = e["speed"] * (dt / 3600.0)
    dist_deg = dist_nm / 60.0
    heading  = math.radians(e["heading"])
    lat_rad  = math.radians(e["lat"])

    e["lat"]      = round(e["lat"] + dist_deg * math.cos(heading), 5)
    e["lon"]      = round(e["lon"] + dist_deg * math.sin(heading) / max(math.cos(lat_rad), 1e-9), 5)
    e["heading"]  = round((e["heading"] + random.uniform(-3, 3)) % 360, 1)
    e["lastSeen"] = _now()
    return e


def _seed(count: int = 40) -> None:
    for _ in range(count):
        e = _make_entity()
        _entities[e["uid"]] = e
    log.info("Seeded %d synthetic entities", len(_entities))


# ── Background simulation loop ────────────────────────────────────────────────

async def _sim_loop(interval: float = 2.0) -> None:
    """Move entities and publish deltas every `interval` seconds."""
    hostile_alert_cooldown = 0
    while True:
        await asyncio.sleep(interval)
        for uid, e in list(_entities.items()):
            _move(e, interval)
            sight = {"lat": e["lat"], "lon": e["lon"], "observedAt": _now()}
            _sightings[uid].append(sight)
            if len(_sightings[uid]) > 200:
                _sightings[uid] = _sightings[uid][-200:]

            # Feed engines
            anomaly_engine.record_sighting(
                uid, e["lat"], e["lon"],
                e.get("heading", 0) or 0,
                e.get("speed", 0) or 0,
            )
            pol_engine.record_position(
                uid, e["lat"], e["lon"],
                e.get("speed", 0) or 0,
                e.get("heading", 0) or 0,
                e.get("lastSeen"),
            )
            noise = kalman_engine.SOURCE_NOISE.get(e.get("source", "MANUAL"), 1e-4)
            kalman_engine.smooth_entity(uid, e["lat"], e["lon"],
                                        t=time.monotonic(), meas_noise=noise)

            await publish_entity(e)

        # Occasionally fire system events to feed the ticker
        hostile_alert_cooldown -= 1
        if hostile_alert_cooldown <= 0 and random.random() < 0.15:
            hostiles = [e for e in _entities.values() if e["affiliation"] == "hostile"]
            if hostiles:
                h = random.choice(hostiles)
                await publish_event(
                    "critical",
                    f"Hostile contact {h['callsign']} detected — "
                    f"lat={h['lat']:.2f} lon={h['lon']:.2f}",
                    h["id"],
                )
                hostile_alert_cooldown = 15
            else:
                e = random.choice(list(_entities.values()))
                await publish_event(
                    "info",
                    f"Contact {e['callsign']} updated via {e['source']}",
                    e["id"],
                )


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title   = "MSS Dev API",
    version = APP_VERSION,
    description = "In-memory dev mode — no external services required",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# ── Mount MAVEN AI router ────────────────────────────────────────────────────
from routers.maven import router as maven_router
app.include_router(maven_router)


_http_client: Optional[httpx.AsyncClient] = None


@app.on_event("startup")
async def startup() -> None:
    global _http_client
    _http_client = httpx.AsyncClient(
        headers={"User-Agent": "MSS-Dev/0.1", "Accept": "application/json"},
        follow_redirects=True,
        timeout=15.0,
    )
    _seed(40)
    asyncio.create_task(_sim_loop())
    asyncio.create_task(_live_data_loop())
    asyncio.create_task(_actions_loop())
    log.info("MSS Dev Server ready — %d entities loaded", len(_entities))


# ── Live data fetcher (free APIs, best-effort) ────────────────────────────────

async def _live_data_loop() -> None:
    """Pull from free public APIs every 30s. Never crashes the server."""
    await asyncio.sleep(5)   # let startup settle
    # FRED runs every 15 min; GDELT every 15 min; others every 30s
    fred_tick = 0
    while True:
        await asyncio.gather(
            _fetch_adsbfi(),
            _fetch_usgs(),
            _fetch_noaa(),
            _fetch_gdelt(),
            return_exceptions=True,
        )
        fred_tick += 1
        if fred_tick % 30 == 1:   # every ~15 min (30 × 30s)
            await _fetch_fred()
        if fred_tick % 60 == 1:   # every ~30 min — ACLED (rate-limited 500/month)
            await _fetch_acled()
        await asyncio.sleep(30)


async def _fetch_adsbfi() -> None:
    """Pull live ADS-B from adsb.fi (free, no auth). Gulf AOI."""
    try:
        resp = await _http_client.get(
            "https://api.adsb.fi/v1/aircraft",
            params={"bounds": "23.5,29.0,49.0,58.0"},   # Gulf bbox
            timeout=10.0,
        )
        if resp.status_code == 200:
            new_ents = parse_adsbfi_response(resp.json())
            ingested = 0
            for e in new_ents:
                uid = e.get("uid")
                if uid and e.get("lat"):
                    e.setdefault("id", str(uuid.uuid4()))
                    _entities[uid] = e
                    anomaly_engine.record_sighting(uid, e["lat"], e["lon"],
                                                   e.get("heading", 0), e.get("speed", 0))
                    await publish_entity(e)
                    ingested += 1
            if ingested:
                log.info("adsb.fi: ingested %d aircraft", ingested)
    except Exception as exc:
        log.debug("adsb.fi fetch failed: %s", exc)


async def _fetch_usgs() -> None:
    """Pull recent M≥4 earthquakes from USGS (free, no auth)."""
    try:
        from datetime import timedelta
        since = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
        resp  = await _http_client.get(
            USGS_URL,
            params={**USGS_PARAMS, "starttime": since},
            timeout=10.0,
        )
        if resp.status_code == 200:
            new_ents = parse_usgs_geojson(resp.json())
            for e in new_ents:
                uid = e.get("uid")
                if uid:
                    e.setdefault("id", str(uuid.uuid4()))
                    _entities[uid] = e
            if new_ents:
                log.info("USGS: ingested %d seismic events", len(new_ents))
    except Exception as exc:
        log.debug("USGS fetch failed: %s", exc)


async def _fetch_noaa() -> None:
    """Pull active marine weather alerts from NOAA NWS (free, no auth)."""
    try:
        resp = await _http_client.get(
            NOAA_ALERTS_URL,
            params=NOAA_PARAMS,
            headers={"Accept": "application/geo+json"},
            timeout=10.0,
        )
        if resp.status_code == 200:
            new_ents = parse_noaa_alerts(resp.json())
            for e in new_ents:
                uid = e.get("uid")
                if uid:
                    e.setdefault("id", str(uuid.uuid4()))
                    _entities[uid] = e
                    await publish_event(
                        e["raw"].get("severity", "info"),
                        f"NOAA MARINE ALERT: {e['raw'].get('headline', e['callsign'])}",
                        e["id"],
                    )
            if new_ents:
                log.info("NOAA: ingested %d marine alerts", len(new_ents))
    except Exception as exc:
        log.debug("NOAA fetch failed: %s", exc)


async def _actions_loop() -> None:
    """Regenerate intelligence actions every 60 seconds."""
    await asyncio.sleep(15)   # let sim_loop seed some history first
    while True:
        try:
            entities  = _entities_list()
            anom_raw  = anomaly_engine.analyze_batch(entities)
            anom_map  = {a.entity_uid: a for a in anom_raw}
            threats   = threat_engine.rank_threats(entities, anom_map)
            pol_raw   = pol_engine.analyze_pol_batch(entities)
            new_acts  = actions_engine.generate_actions(
                entities        = entities,
                threats         = [t.as_dict() for t in threats],
                anomalies       = [a.as_dict() for a in anom_raw],
                pol_deviations  = [p.as_dict() for p in pol_raw],
            )
            if new_acts:
                summary = actions_engine.get_action_summary()
                for act in new_acts:
                    if act.priority in ("CRITICAL", "HIGH"):
                        await publish_event(
                            "critical" if act.priority == "CRITICAL" else "warning",
                            f"ACTION [{act.priority}]: {act.title}",
                            act.target_uid,
                        )
                log.info("Actions generated: %d new (pending=%d, critical=%d)",
                         len(new_acts), summary["pending"], summary["critical"])
        except Exception as exc:
            log.debug("Actions loop error: %s", exc)
        await asyncio.sleep(60)


async def _fetch_gdelt() -> None:
    """Pull live conflict events from GDELT DOC API (free, no key). Gulf focus."""
    global _gdelt_events
    try:
        query  = build_conflict_query("Gulf")
        params = gdelt_params(query, hours_back=4, max_records=50)
        resp   = await _http_client.get(GDELT_DOC_URL, params=params, timeout=12.0)
        if resp.status_code == 200:
            new_ents = parse_gdelt_artlist(resp.json())
            ingested = 0
            for e in new_ents:
                uid = e.get("uid")
                if uid:
                    e.setdefault("id", str(uuid.uuid4()))
                    _entities[uid] = e
                    ingested += 1
            if ingested:
                log.info("GDELT: ingested %d conflict events", ingested)
                # Keep a rolling window of raw events for market intel analysis
                _gdelt_events = new_ents[-100:]
    except Exception as exc:
        log.debug("GDELT fetch failed: %s", exc)


async def _fetch_acled() -> None:
    """
    Pull live conflict events from ACLED (Armed Conflict Location & Event Data).
    Free with registration at https://acleddata.com — set MSS_ACLED_KEY + MSS_ACLED_EMAIL.
    Falls back gracefully if key not set.
    Rate limit: 500 requests/month on free tier.
    """
    acled_key   = os.getenv("MSS_ACLED_KEY", "")
    acled_email = os.getenv("MSS_ACLED_EMAIL", "")
    if not acled_key or not acled_email:
        log.debug("ACLED: no credentials set (MSS_ACLED_KEY + MSS_ACLED_EMAIL) — skipping")
        return
    try:
        from datetime import date, timedelta as td
        since = (date.today() - td(days=7)).strftime("%Y-%m-%d")
        params = {
            "key":        acled_key,
            "email":      acled_email,
            "event_date": since,
            "event_date_where": ">=",
            "limit":      200,
            "format":     "json",
        }
        resp = await _http_client.get(ACLED_URL, params=params, timeout=15.0)
        if resp.status_code == 200:
            new_ents = parse_acled_response(resp.json())
            ingested = 0
            for e in new_ents:
                uid = e.get("uid")
                if uid:
                    e.setdefault("id", str(uuid.uuid4()))
                    _entities[uid] = e
                    ingested += 1
            if ingested:
                log.info("ACLED: ingested %d conflict events (last 7d)", ingested)
    except Exception as exc:
        log.debug("ACLED fetch failed: %s", exc)


async def _fetch_fred() -> None:
    """Pull FRED economic indicators (requires free API key via MSS_FRED_API_KEY)."""
    global _econ_data
    from normalizers.fred import FRED_API_KEY
    if not FRED_API_KEY:
        log.debug("FRED: no API key set (MSS_FRED_API_KEY) — skipping")
        return
    try:
        results = []
        for series_id, label, unit, relevance in FRED_SERIES:
            params = fred_params(series_id, limit=5)
            resp   = await _http_client.get(FRED_BASE, params=params, timeout=8.0)
            if resp.status_code == 200:
                ind = parse_fred_observations(series_id, label, unit, relevance, resp.json())
                if ind:
                    results.append(ind)
        if results:
            _econ_data = results
            summary    = build_economic_summary(results)
            log.info("FRED: fetched %d indicators, stress=%d (%s)",
                     len(results), summary["stressScore"], summary["status"])
            if summary["stressScore"] >= 30 and summary["signals"]:
                await publish_event(
                    "warning",
                    f"ECONOMIC STRESS ELEVATED ({summary['stressScore']}/100): {summary['signals'][0]}",
                    None,
                )
    except Exception as exc:
        log.debug("FRED fetch failed: %s", exc)


# ── REST endpoints ────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": APP_VERSION, "uptime": round(time.monotonic() - _start, 2)}


@app.get("/api/v1/entities")
async def list_entities(
    page:        int           = Query(1, ge=1),
    per_page:    int           = Query(100, ge=1, le=1000),
    source:      str | None    = None,
    affiliation: str | None    = None,
    bbox:        str | None    = None,
) -> dict:
    items = list(_entities.values())
    if source:
        items = [e for e in items if e["source"] == source]
    if affiliation:
        items = [e for e in items if e["affiliation"] == affiliation]
    if bbox:
        try:
            lon_min, lat_min, lon_max, lat_max = map(float, bbox.split(","))
            items = [e for e in items
                     if e["lon"] is not None and lon_min <= e["lon"] <= lon_max
                     and e["lat"] is not None and lat_min <= e["lat"] <= lat_max]
        except ValueError:
            pass

    total  = len(items)
    offset = (page - 1) * per_page
    page_items = items[offset:offset + per_page]

    return {"items": page_items, "total": total, "page": page, "perPage": per_page}


@app.get("/api/v1/entities/{entity_id}")
async def get_entity(entity_id: str) -> dict:
    # Accept both UUID (id) and uid
    match = next(
        (e for e in _entities.values() if e["id"] == entity_id or e["uid"] == entity_id),
        None,
    )
    if not match:
        from fastapi import HTTPException
        raise HTTPException(404, "Entity not found")

    return {
        **match,
        "relationships":   [],
        "recentSightings": _sightings.get(match["uid"], [])[-20:],
    }


@app.get("/api/v1/entities/{entity_id}/dossier")
async def get_dossier(entity_id: str) -> dict:
    match = next(
        (e for e in _entities.values() if e["id"] == entity_id or e["uid"] == entity_id),
        None,
    )
    if not match:
        from fastapi import HTTPException
        raise HTTPException(404, "Entity not found")

    md = f"""# Dossier: {match.get('callsign', match['uid'])}

**Entity ID:** `{match['id']}`
**Type:** {match['entityType']}
**Source:** {match['source']}
**Affiliation:** {match['affiliation']}

## Last Known Position
- Lat: {match.get('lat')}, Lon: {match.get('lon')}
- Altitude: {match.get('altitude')} m
- Speed: {match.get('speed')} kts / Heading: {match.get('heading')}°

## Assessment
"""
    entities = _entities_list()
    threat   = threat_engine.score_entity(match, entities)
    anom     = anomaly_engine.analyze(match)
    md += f"""Threat level: **{threat.level}** (score {threat.score}/100)

### Threat Factors
{chr(10).join('- ' + r for r in threat.reasons) or '- None detected'}

### Behavioral Anomalies
{chr(10).join('- ' + d for d in anom.details) or '- None detected'}

> ⚠ Dev mode — LLM narrative requires Ollama. Algorithmic assessment shown.
"""
    return {"markdown": md, "generatedAt": _now()}


@app.get("/api/v1/entities/{entity_id}/track")
async def get_track(entity_id: str) -> dict:
    match = next(
        (e for e in _entities.values() if e["id"] == entity_id or e["uid"] == entity_id),
        None,
    )
    if not match:
        from fastapi import HTTPException
        raise HTTPException(404, "Entity not found")

    return {"uid": match["uid"], "sightings": _sightings.get(match["uid"], [])}


@app.post("/api/v1/entities/ingest")
async def ingest(body: dict) -> dict:
    payload = body.get("payload", "")
    if isinstance(payload, str):
        try:
            items = json.loads(payload)
            if not isinstance(items, list):
                items = [items]
        except Exception:
            return {"accepted": 0, "failed": 1}
    elif isinstance(payload, list):
        items = payload
    else:
        items = [payload]

    accepted = 0
    for item in items:
        uid = item.get("uid")
        if uid:
            if uid not in _entities:
                item["id"] = item.get("id") or str(uuid.uuid4())
            _entities[uid] = item
            await publish_entity(item)
            accepted += 1

    return {"accepted": accepted, "failed": 0}


@app.get("/api/v1/reports/similar")
async def similar_reports(query: str = Query(...), limit: int = Query(10)) -> dict:
    # Dev mode: return empty — no vector store
    return {"reports": []}


# ── Analytics endpoints ───────────────────────────────────────────────────────

def _entities_list() -> list[dict]:
    return list(_entities.values())


@app.get("/api/v1/analytics/threats")
async def analytics_threats(
    limit:     int           = Query(50, ge=1, le=500),
    min_score: int           = Query(0,  ge=0, le=100),
    level:     Optional[str] = Query(None),
) -> dict:
    entities  = _entities_list()
    anom_raw  = anomaly_engine.analyze_batch(entities)
    anom_map  = {a.entity_uid: a for a in anom_raw}
    threats   = threat_engine.rank_threats(entities, anom_map, min_score=min_score)

    if level:
        threats = [t for t in threats if t.level.lower() == level.lower()]

    return {
        "threats":     [t.as_dict() for t in threats[:limit]],
        "total":       len(threats),
        "entityCount": len(entities),
    }


@app.get("/api/v1/analytics/anomalies")
async def analytics_anomalies(
    limit:     int   = Query(50, ge=1, le=500),
    min_score: float = Query(0.1, ge=0.0, le=2.0),
) -> dict:
    entities  = _entities_list()
    anomalies = anomaly_engine.analyze_batch(entities)
    filtered  = [a for a in anomalies if a.score >= min_score]
    return {"anomalies": [a.as_dict() for a in filtered[:limit]], "total": len(filtered)}


@app.get("/api/v1/analytics/geofence")
async def analytics_geofence() -> dict:
    entities = _entities_list()
    alerts   = geofence_engine.check_all(entities)
    return {
        "alerts": [a.as_dict() for a in alerts],
        "total":  len(alerts),
        "aois":   [{"name": aoi.name, "severity": aoi.severity}
                   for aoi in geofence_engine.NAMED_AOIS],
    }


@app.post("/api/v1/analytics/geofence")
async def analytics_custom_geofence(body: dict) -> dict:
    entities   = _entities_list()
    entity_ids = geofence_engine.custom_geofence_check(entities, body)
    matched    = [e for e in entities if e.get("id") in entity_ids]
    return {"entityIds": entity_ids, "matched": matched, "count": len(entity_ids)}


@app.get("/api/v1/analytics/clusters")
async def analytics_clusters(
    eps_nm:  float = Query(30.0, ge=1.0, le=500.0),
    min_pts: int   = Query(3,    ge=2,   le=20),
) -> dict:
    entities             = _entities_list()
    assignments, clusters = cluster_engine.dbscan(entities, eps_nm=eps_nm, min_pts=min_pts)
    noise_count          = sum(1 for v in assignments.values() if v == -1)
    return {
        "clusters":      [c.as_dict() for c in clusters],
        "clusterCount":  len(clusters),
        "noiseCount":    noise_count,
        "totalEntities": len(entities),
    }


@app.get("/api/v1/analytics/formations")
async def analytics_formations(
    eps_nm:   float = Query(15.0, ge=1.0, le=100.0),
    min_size: int   = Query(3,    ge=2,   le=20),
) -> dict:
    entities   = _entities_list()
    formations = cluster_engine.detect_formations(entities, eps_nm=eps_nm, min_size=min_size)
    return {"formations": [f.as_dict() for f in formations], "total": len(formations)}


@app.get("/api/v1/analytics/density")
async def analytics_density(
    resolution:  int           = Query(4,    ge=1, le=8),
    source:      Optional[str] = Query(None),
    affiliation: Optional[str] = Query(None),
) -> dict:
    entities = _entities_list()
    if source:
        entities = [e for e in entities if e.get("source") == source]
    if affiliation:
        entities = [e for e in entities if e.get("affiliation") == affiliation]
    grid = cluster_engine.hexbin_density(entities, resolution=resolution)
    return {"grid": grid, "cellCount": len(grid), "resolution": resolution}


@app.get("/api/v1/analytics/predict/{entity_id}")
async def analytics_predict(
    entity_id: str,
    horizon:   int = Query(300, ge=30, le=3600),
) -> dict:
    from fastapi import HTTPException
    match = next(
        (e for e in _entities.values() if e["id"] == entity_id or e["uid"] == entity_id),
        None,
    )
    if not match:
        raise HTTPException(404, "Entity not found")

    uid = match["uid"]

    # Feed track history into Kalman filter
    history = _sightings.get(uid, [])
    if len(history) < 3:
        raise HTTPException(422, "Need at least 3 sightings for prediction")

    if uid in kalman_engine._filters:
        del kalman_engine._filters[uid]

    source = match.get("source", "MANUAL")
    noise  = kalman_engine.SOURCE_NOISE.get(source, 1e-4)
    for s in history:
        kalman_engine.smooth_entity(uid, s["lat"], s["lon"],
                                    t=time.monotonic(), meas_noise=noise)

    pred = kalman_engine.predict_entity(uid, horizon_sec=float(horizon))
    if not pred:
        raise HTTPException(422, "Insufficient data")

    kf = kalman_engine._filters[uid]
    return {
        "uid":            uid,
        "horizonSec":     horizon,
        "predictedLat":   pred[0],
        "predictedLon":   pred[1],
        "estimatedSpeed": round(kf.velocity_kts(), 2),
        "trackPoints":    len(history),
    }


# ── AI / MAVEN Intelligence endpoints ────────────────────────────────────────

@app.get("/api/v1/ai/status")
async def ai_status() -> dict:
    """Returns LLM availability and configuration."""
    return {"maven": intel_engine.get_llm_status(), "version": APP_VERSION}


@app.get("/api/v1/ai/brief")
async def ai_brief() -> dict:
    """Generate a full geopolitical SITREP with LLM narrative."""
    entities  = _entities_list()
    ent_dict  = {e["uid"]: e for e in entities}

    # Gather analytics
    anom_raw  = anomaly_engine.analyze_batch(entities)
    anom_map  = {a.entity_uid: a for a in anom_raw}
    threats   = threat_engine.rank_threats(entities, anom_map)
    _, clusters = cluster_engine.dbscan(entities, eps_nm=30.0, min_pts=3)

    threat_dicts  = [t.as_dict() for t in threats]
    anomaly_dicts = [a.as_dict() for a in anom_raw]
    cluster_dicts = [c.as_dict() for c in clusters]

    intel = await intel_engine.generate_geopolitical_brief(
        entities  = ent_dict,
        threats   = threat_dicts,
        anomalies = anomaly_dicts,
        clusters  = cluster_dicts,
        macro     = None,
    )
    return intel.as_dict()


@app.get("/api/v1/ai/assess/{entity_id}")
async def ai_assess(entity_id: str) -> dict:
    """Deep AI assessment of a single entity."""
    from fastapi import HTTPException
    match = next(
        (e for e in _entities.values() if e["id"] == entity_id or e["uid"] == entity_id),
        None,
    )
    if not match:
        raise HTTPException(404, "Entity not found")

    uid      = match["uid"]
    entities = _entities_list()
    anom_raw = anomaly_engine.analyze_batch([match])
    anom_map = {a.entity_uid: a for a in anom_raw}
    threat   = threat_engine.score_entity(match, entities)
    sightings = _sightings.get(uid, [])

    threat_d = threat.as_dict() if threat else None
    anom_d   = anom_raw[0].as_dict() if anom_raw else None

    intel = intel_engine.build_entity_assessment(
        entity    = match,
        threat    = threat_d,
        anomaly   = anom_d,
        sightings = sightings,
    )

    # Async LLM enhancement
    context = {
        "entity": {k: match.get(k) for k in ("callsign", "entityType", "affiliation", "source", "speed", "heading", "lat", "lon")},
        "threat_score": threat_d.get("score") if threat_d else 0,
        "anomaly_flags": anom_d.get("flags", []) if anom_d else [],
        "sighting_count": len(sightings),
    }
    intel = await intel_engine.enhance_with_llm(intel, json.dumps(context))
    return intel.as_dict()


@app.post("/api/v1/ai/query")
async def ai_query(body: dict) -> dict:
    """Answer a natural language intelligence question."""
    question = body.get("question", "")
    if not question:
        from fastapi import HTTPException
        raise HTTPException(400, "question field required")

    entities  = _entities_list()
    ent_dict  = {e["uid"]: e for e in entities}
    anom_raw  = anomaly_engine.analyze_batch(entities)
    anom_map  = {a.entity_uid: a for a in anom_raw}
    threats   = threat_engine.rank_threats(entities, anom_map)

    threat_dicts  = [t.as_dict() for t in threats]
    anomaly_dicts = [a.as_dict() for a in anom_raw]

    context = {
        # Summarised stats (used by simple fallback)
        "entity_count":     len(entities),
        "hostile_count":    sum(1 for e in entities if e.get("affiliation") == "hostile"),
        "critical_threats": sum(1 for t in threats if t.level in ("Critical", "High")),
        "anomaly_count":    len(anom_raw),
        "top_threats":      [{"callsign": t.callsign, "score": t.score, "level": t.level, "reasons": t.reasons} for t in threats[:5]],
        # Raw data for tool-use (prefixed with _ so MAVEN tools can access them)
        "_entities":  {e["uid"]: e for e in entities},
        "_threats":   threat_dicts,
        "_anomalies": anomaly_dicts,
        "_clusters":  [],
    }

    answer = await intel_engine.llm_query(question, context)
    return {"question": question, "answer": answer, "generatedAt": _now()}


@app.get("/api/v1/ai/economic")
async def ai_economic() -> dict:
    """Returns latest FRED economic indicators and composite stress score."""
    from normalizers.fred import build_economic_summary
    summary = build_economic_summary(_econ_data)
    return {
        "indicators":  _econ_data,
        "summary":     summary,
        "count":       len(_econ_data),
        "note":        "Set MSS_FRED_API_KEY env var to enable live FRED data" if not _econ_data else None,
        "generatedAt": _now(),
    }


@app.get("/api/v1/ai/markets")
async def ai_markets() -> dict:
    """
    Market opportunity detection from geopolitical/military/economic signals.
    Translates MAVEN live data into directional trade ideas.
    Also exposes a /api/v1/ai/markets/signals endpoint for quadratic-ip bridge.
    """
    from normalizers.fred import build_economic_summary
    from dataclasses import asdict

    entities = _entities_list()
    anom_raw = anomaly_engine.analyze_batch(entities)
    anom_map = {a.entity_uid: a for a in anom_raw}
    threats  = threat_engine.rank_threats(entities, anom_map)

    fred_payload = {
        "indicators": {ind.get("seriesId", ""): ind for ind in _econ_data},
        "summary":    build_economic_summary(_econ_data),
    }

    report = market_engine.generate_market_intel(
        entities     = entities,
        threats      = [t.as_dict() for t in threats],
        fred_data    = fred_payload,
        gdelt_events = _gdelt_events,
    )

    return {
        "opportunities":  [asdict(o) for o in report.opportunities],
        "triggers":       [asdict(t) for t in report.triggers],
        "macro_regime":   report.macro_regime,
        "regime_signals": report.regime_signals,
        "geopol_score":   report.geopol_score,
        "summary":        report.summary,
        "count":          len(report.opportunities),
        "generatedAt":    _now(),
    }


@app.get("/api/v1/ai/markets/signals")
async def ai_markets_signals() -> dict:
    """
    Bridge endpoint for quadratic-ip signalEngine.js.
    Returns compact per-symbol directional signals from geopolitical intelligence.
    Format: { regime, score, signals: { [symbol]: { direction, strength, sector } } }
    """
    from normalizers.fred import build_economic_summary
    from dataclasses import asdict

    entities = _entities_list()
    anom_raw = anomaly_engine.analyze_batch(entities)
    anom_map = {a.entity_uid: a for a in anom_raw}
    threats  = threat_engine.rank_threats(entities, anom_map)

    fred_payload = {
        "indicators": {ind.get("seriesId", ""): ind for ind in _econ_data},
        "summary":    build_economic_summary(_econ_data),
    }

    report = market_engine.generate_market_intel(
        entities     = entities,
        threats      = [t.as_dict() for t in threats],
        fred_data    = fred_payload,
        gdelt_events = _gdelt_events,
    )

    return market_engine.to_quadratic_signals(report)


# ── Map overlay: Hover Intel + Macro ─────────────────────────────────────────

# Country capital database — position [lon, lat], ISO-3, currency, GDP (billion USD 2023)
_COUNTRY_CAPS = [
    {"iso":"USA","name":"United States","capital":"Washington D.C.","position":[-77.04,38.91],"currency":"USD","gdpBn":25462,"riskTier":"allied"},
    {"iso":"GBR","name":"United Kingdom","capital":"London","position":[-0.12,51.50],"currency":"GBP","gdpBn":3070,"riskTier":"allied"},
    {"iso":"FRA","name":"France","capital":"Paris","position":[2.35,48.87],"currency":"EUR","gdpBn":2924,"riskTier":"allied"},
    {"iso":"DEU","name":"Germany","capital":"Berlin","position":[13.39,52.52],"currency":"EUR","gdpBn":4072,"riskTier":"allied"},
    {"iso":"JPN","name":"Japan","capital":"Tokyo","position":[139.69,35.69],"currency":"JPY","gdpBn":4231,"riskTier":"allied"},
    {"iso":"KOR","name":"South Korea","capital":"Seoul","position":[126.98,37.57],"currency":"KRW","gdpBn":1665,"riskTier":"allied"},
    {"iso":"AUS","name":"Australia","capital":"Canberra","position":[149.13,-35.28],"currency":"AUD","gdpBn":1676,"riskTier":"allied"},
    {"iso":"CAN","name":"Canada","capital":"Ottawa","position":[-75.70,45.42],"currency":"CAD","gdpBn":2140,"riskTier":"allied"},
    {"iso":"ISR","name":"Israel","capital":"Jerusalem","position":[35.22,31.77],"currency":"ILS","gdpBn":527,"riskTier":"allied"},
    {"iso":"CHN","name":"China","capital":"Beijing","position":[116.39,39.91],"currency":"CNY","gdpBn":17963,"riskTier":"adversary"},
    {"iso":"RUS","name":"Russia","capital":"Moscow","position":[37.62,55.75],"currency":"RUB","gdpBn":2240,"riskTier":"adversary"},
    {"iso":"IRN","name":"Iran","capital":"Tehran","position":[51.42,35.69],"currency":"IRR","gdpBn":367,"riskTier":"adversary"},
    {"iso":"PRK","name":"North Korea","capital":"Pyongyang","position":[125.74,39.02],"currency":"KPW","gdpBn":18,"riskTier":"adversary"},
    {"iso":"SAU","name":"Saudi Arabia","capital":"Riyadh","position":[46.69,24.69],"currency":"SAR","gdpBn":1069,"riskTier":"neutral"},
    {"iso":"ARE","name":"UAE","capital":"Abu Dhabi","position":[54.37,24.45],"currency":"AED","gdpBn":498,"riskTier":"neutral"},
    {"iso":"TUR","name":"Turkey","capital":"Ankara","position":[32.86,39.93],"currency":"TRY","gdpBn":905,"riskTier":"neutral"},
    {"iso":"IND","name":"India","capital":"New Delhi","position":[77.20,28.61],"currency":"INR","gdpBn":3385,"riskTier":"neutral"},
    {"iso":"BRA","name":"Brazil","capital":"Brasília","position":[-47.93,-15.78],"currency":"BRL","gdpBn":2081,"riskTier":"neutral"},
    {"iso":"EGY","name":"Egypt","capital":"Cairo","position":[31.25,30.06],"currency":"EGP","gdpBn":396,"riskTier":"neutral"},
    {"iso":"PAK","name":"Pakistan","capital":"Islamabad","position":[73.04,33.72],"currency":"PKR","gdpBn":341,"riskTier":"neutral"},
    {"iso":"QAT","name":"Qatar","capital":"Doha","position":[51.53,25.29],"currency":"QAR","gdpBn":235,"riskTier":"partner"},
    {"iso":"NLD","name":"Netherlands","capital":"Amsterdam","position":[4.90,52.37],"currency":"EUR","gdpBn":1093,"riskTier":"allied"},
    {"iso":"POL","name":"Poland","capital":"Warsaw","position":[21.01,52.23],"currency":"PLN","gdpBn":688,"riskTier":"allied"},
    {"iso":"NOR","name":"Norway","capital":"Oslo","position":[10.75,59.91],"currency":"NOK","gdpBn":546,"riskTier":"allied"},
]

# 15-minute cache for macro overlay
_macro_overlay_cache: dict = {"data": None, "ts": 0}
_MACRO_CACHE_TTL = 900  # seconds


async def _build_macro_overlay() -> list[dict]:
    """Build country markers enriched with live FX rates and FRED stress context."""
    from normalizers.fred import build_economic_summary

    fred_summary = build_economic_summary(_econ_data)
    stress_score = fred_summary.get("stressScore", 0) if isinstance(fred_summary, dict) else 0

    # Fetch live FX vs USD
    fx_rates: dict[str, float] = {}
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            r = await client.get("https://open.er-api.com/v6/latest/USD")
            if r.status_code == 200:
                data = r.json()
                fx_rates = data.get("rates", {})
    except Exception:
        pass

    # Fetch threat context to colour hostile-adjacent countries
    entities = _entities_list()
    anom_raw = anomaly_engine.analyze_batch(entities)
    anom_map = {a.entity_uid: a for a in anom_raw}
    threats  = threat_engine.rank_threats(entities, anom_map)
    critical_count = sum(1 for t in threats if t.level in ("Critical", "High"))

    markers = []
    for c in _COUNTRY_CAPS:
        currency = c["currency"]
        fx = fx_rates.get(currency)
        marker = {
            **c,
            "fxRate":      round(fx, 4) if fx else None,
            "stressScore": stress_score,
            "criticalThreats": critical_count,
            # Geo signals for hover card
            "gdelt_events": sum(1 for ev in _gdelt_events
                                if _classify_country_region(c["iso"]) and True),
        }
        markers.append(marker)

    return markers


def _classify_country_region(iso3: str) -> str:
    """Map ISO-3 to geopolitical region label."""
    MIDDLE_EAST = {"SAU","ARE","QAT","IRN","IRQ","YEM","SYR","JOR","LBN","ISR","KWT","OMN","BHR"}
    EAST_ASIA   = {"CHN","JPN","KOR","PRK","TWN","VNM","THA","PHL","IDN","SGP","MYS"}
    EUR_NATO    = {"USA","GBR","FRA","DEU","CAN","AUS","NLD","POL","NOR","ESP","ITA","DNK","BEL"}
    S_ASIA      = {"IND","PAK","BGD","AFG","NPL","LKA"}
    if iso3 in MIDDLE_EAST: return "middle_east"
    if iso3 in EAST_ASIA:   return "east_asia"
    if iso3 in EUR_NATO:    return "nato_allied"
    if iso3 in S_ASIA:      return "south_asia"
    return "other"


@app.get("/api/v1/analytics/macro-overlay")
async def macro_overlay() -> dict:
    """Country capital markers with macro/FX data for map overlay. 15-min cached."""
    now = time.time()
    if _macro_overlay_cache["data"] and now - _macro_overlay_cache["ts"] < _MACRO_CACHE_TTL:
        return {"markers": _macro_overlay_cache["data"], "cached": True, "generatedAt": _now()}

    markers = await _build_macro_overlay()
    _macro_overlay_cache["data"] = markers
    _macro_overlay_cache["ts"] = now
    return {"markers": markers, "cached": False, "generatedAt": _now()}


@app.get("/api/v1/analytics/hover-intel/{entity_id}")
async def hover_intel_entity(entity_id: str) -> dict:
    """
    Hover intelligence card for a tracked entity.
    Returns AI-enriched assessment optimised for the 380px hover card.
    Delegates to the full assess pipeline + Groq LLM narrative.
    """
    from fastapi import HTTPException

    match = next(
        (e for e in _entities.values() if e.get("id") == entity_id or e.get("uid") == entity_id),
        None,
    )
    if not match:
        raise HTTPException(404, "Entity not found")

    uid      = match["uid"]
    entities = _entities_list()
    anom_raw = anomaly_engine.analyze_batch([match])
    threat   = threat_engine.score_entity(match, entities)
    sightings = _sightings.get(uid, [])

    threat_d = threat.as_dict() if threat else None
    anom_d   = anom_raw[0].as_dict() if anom_raw else None

    intel = intel_engine.build_entity_assessment(
        entity    = match,
        threat    = threat_d,
        anomaly   = anom_d,
        sightings = sightings,
    )

    context = {
        "entity":       {k: match.get(k) for k in ("callsign", "entityType", "affiliation",
                                                     "source", "speed", "heading", "lat", "lon")},
        "threat_score": threat_d.get("score") if threat_d else 0,
        "anomaly_flags":anom_d.get("flags", []) if anom_d else [],
        "sighting_count": len(sightings),
        "active_threats_total": len(_entities),
        "market_context": "See /api/v1/ai/markets for current regime",
    }
    intel = await intel_engine.enhance_with_llm(intel, json.dumps(context))
    result = intel.as_dict()
    result["overlayType"] = "entity"
    return result


@app.get("/api/v1/analytics/hover-intel-macro/{iso}")
async def hover_intel_macro(iso: str) -> dict:
    """
    AI-powered hover intelligence card for a country macro marker.
    Uses MAVEN intelligence engine + Groq LLM to generate geopolitical,
    economic, and market-impact narratives for the selected country.
    """
    from fastapi import HTTPException
    from normalizers.fred import build_economic_summary

    country = next((c for c in _COUNTRY_CAPS if c["iso"] == iso.upper()), None)
    if not country:
        raise HTTPException(404, f"Country {iso} not found in macro overlay")

    # Gather all context
    entities  = _entities_list()
    anom_raw  = anomaly_engine.analyze_batch(entities)
    anom_map  = {a.entity_uid: a for a in anom_raw}
    threats   = threat_engine.rank_threats(entities, anom_map)
    fred_sum  = build_economic_summary(_econ_data)

    # FX lookup
    fx_rates: dict[str, float] = {}
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get("https://open.er-api.com/v6/latest/USD")
            if r.status_code == 200:
                fx_rates = r.json().get("rates", {})
    except Exception:
        pass

    currency  = country["currency"]
    fx        = fx_rates.get(currency)
    region    = _classify_country_region(iso.upper())
    risk_tier = country["riskTier"]

    # Threat count near this country's region
    region_threats = sum(
        1 for t in threats
        if risk_tier == "adversary" or (
            any(iso.upper() in str(r) for r in (t.reasons or []))
        )
    )

    # Market signals relevant to this country
    from dataclasses import asdict
    fred_payload = {
        "indicators": {ind.get("seriesId", ""): ind for ind in _econ_data},
        "summary":    fred_sum,
    }
    market_report = market_engine.generate_market_intel(
        entities     = entities,
        threats      = [t.as_dict() for t in threats],
        fred_data    = fred_payload,
        gdelt_events = _gdelt_events,
    )
    regime        = market_report.macro_regime
    geopol_score  = market_report.geopol_score
    top_opps      = [asdict(o) for o in market_report.opportunities[:3]]

    # Structured card (template — always available)
    key_findings = []
    if fx:
        move = ""
        if risk_tier == "adversary":
            move = f" — currency under sanction/capital controls pressure"
        key_findings.append(f"{currency}/USD: {fx:.4f}{move}")
    key_findings.append(f"GDP: ${country['gdpBn']:,}B — {risk_tier.upper()} posture")
    key_findings.append(f"Region: {region.replace('_',' ').title()} · Geopolitical score: {geopol_score}/100")
    if top_opps:
        key_findings.append(f"Top market signal: {top_opps[0]['title']} ({top_opps[0]['direction']})")

    hypotheses = [
        {"hypothesis": f"{country['name']} maintains current {risk_tier} posture", "probability": "HIGH"},
        {"hypothesis": "Policy shift toward neutral / de-escalation",             "probability": "MODERATE"},
    ]
    if risk_tier == "adversary":
        hypotheses.append({"hypothesis": "Escalatory action near chokepoints or borders", "probability": "MODERATE"})

    indicators = []
    if geopol_score >= 60:
        indicators.append(f"Elevated geopolitical risk score ({geopol_score}/100)")
    if fx and risk_tier == "adversary":
        indicators.append(f"{currency} under devaluation / sanction pressure")

    summary = (
        f"{country['name']} ({iso.upper()}) — {risk_tier.upper()} strategic posture. "
        f"GDP ${country['gdpBn']:,}B, {currency}"
        f"{f' at {fx:.4f}/USD' if fx else ''}. "
        f"Current macro regime: {regime.replace('_',' ').upper()}. "
        f"Geopolitical risk index: {geopol_score}/100."
    )

    result = {
        "overlayType":   "macro",
        "callsign":      f"{country['capital']} / {iso.upper()}",
        "entityType":    "country",
        "affiliation":   risk_tier,
        "source":        "MACRO·FRED·MAVEN",
        "threatScore":   min(100, geopol_score),
        "confidence":    "HIGH" if len(_econ_data) > 5 else "MODERATE",
        "summary":       summary,
        "keyFindings":   key_findings,
        "hypotheses":    hypotheses,
        "indicators":    indicators,
        "llmNarrative":  None,
        "sightingCount": region_threats,
        "sources":       ["FRED", "MAVEN", "Market Intel"],
        "marketOpps":    top_opps,
        "country":       country,
        "fxRate":        round(fx, 4) if fx else None,
        "regime":        regime,
        "geopolScore":   geopol_score,
    }

    # LLM enhancement via Groq
    llm_prompt = (
        f"You are MAVEN, a geopolitical intelligence AI. Analyse {country['name']} ({iso.upper()}) "
        f"for a military/financial analyst. Risk tier: {risk_tier}. "
        f"GDP: ${country['gdpBn']:,}B. Currency: {currency}"
        f"{f' at {fx:.4f}/USD' if fx else ''}. "
        f"Current macro regime: {regime}. Geopolitical risk score: {geopol_score}/100. "
        f"Active market opportunities: {', '.join(o['title'] for o in top_opps) if top_opps else 'none'}. "
        f"In 3-4 sentences: describe the country's current strategic position, "
        f"key risks to monitor, and what this means for markets and regional security."
    )
    intel_obj = intel_engine.build_entity_assessment(
        entity={"callsign": country["name"], "entityType": "country",
                "affiliation": risk_tier, "source": "MACRO", "lat": country["position"][1],
                "lon": country["position"][0], "uid": iso.upper()},
        threat=None, anomaly=None, sightings=[],
    )
    intel_obj = await intel_engine.enhance_with_llm(intel_obj, llm_prompt)
    if intel_obj and intel_obj.llm_narrative:
        result["llmNarrative"] = intel_obj.llm_narrative

    return result


@app.get("/api/v1/ai/correlate")
async def ai_correlate() -> dict:
    """Cross-domain correlation analysis (military × economic × geopolitical)."""
    entities  = _entities_list()
    ent_dict  = {e["uid"]: e for e in entities}
    anom_raw  = anomaly_engine.analyze_batch(entities)
    anom_map  = {a.entity_uid: a for a in anom_raw}
    threats   = threat_engine.rank_threats(entities, anom_map)

    signals = intel_engine.correlate_domains(
        entities  = ent_dict,
        threats   = [t.as_dict() for t in threats],
        anomalies = [a.as_dict() for a in anom_raw],
        macro     = None,
    )
    return {
        "signals":    [s.as_dict() for s in signals],
        "total":      len(signals),
        "escalatory": sum(1 for s in signals if s.direction == "escalatory"),
        "generatedAt": _now(),
    }


# ── Palantir-style intelligence endpoints ─────────────────────────────────────

@app.get("/api/v1/intel/ontology/{entity_id}")
async def intel_ontology_object(entity_id: str) -> dict:
    """Return a fully resolved OntologyObject for an entity."""
    from fastapi import HTTPException
    match = next(
        (e for e in _entities.values() if e["id"] == entity_id or e["uid"] == entity_id),
        None,
    )
    if not match:
        raise HTTPException(404, "Entity not found")

    entities  = _entities_list()
    anom_raw  = anomaly_engine.analyze_batch([match])
    anom_map  = {a.entity_uid: a for a in anom_raw}
    threat    = threat_engine.score_entity(match, entities)

    t_dict = threat.as_dict() if threat else None
    a_dict = anom_raw[0].as_dict() if anom_raw else None

    obj = ontology_engine.build_ontology_object(match, t_dict, a_dict)
    return obj.as_dict()


@app.get("/api/v1/intel/pol")
async def intel_pol(
    limit:     int   = Query(50, ge=1, le=500),
    min_score: float = Query(0.1, ge=0.0),
) -> dict:
    """Pattern of Life deviation analysis for all entities."""
    entities  = _entities_list()
    pol_raw   = pol_engine.analyze_pol_batch(entities)
    filtered  = [r for r in pol_raw if r.deviation_score >= min_score]
    return {
        "deviations": [r.as_dict() for r in filtered[:limit]],
        "total":      len(filtered),
        "generatedAt": _now(),
    }


@app.get("/api/v1/intel/pol/{entity_id}")
async def intel_pol_entity(entity_id: str) -> dict:
    """Pattern of Life profile for a specific entity."""
    from fastapi import HTTPException
    match = next(
        (e for e in _entities.values() if e["id"] == entity_id or e["uid"] == entity_id),
        None,
    )
    if not match:
        raise HTTPException(404, "Entity not found")
    return pol_engine.get_profile_summary(match["uid"])


@app.get("/api/v1/intel/graph")
async def intel_graph(
    min_confidence: float = Query(0.4, ge=0.0, le=1.0),
) -> dict:
    """Entity relationship graph (NetworkX link analysis)."""
    entities = _entities_list()
    _, clusters = cluster_engine.dbscan(entities, eps_nm=30.0, min_pts=3)
    anom_raw = anomaly_engine.analyze_batch(entities)
    anom_map = {a.entity_uid: a for a in anom_raw}
    threats  = threat_engine.rank_threats(entities, anom_map)

    links, analysis = link_engine.build_link_graph(
        entities = entities,
        clusters = [c.as_dict() for c in clusters],
        threats  = [t.as_dict() for t in threats],
    )
    filtered_links = [l.as_dict() for l in links if l.confidence >= min_confidence]
    result = {
        "links":       filtered_links,
        "linkCount":   len(filtered_links),
        "generatedAt": _now(),
    }
    if analysis:
        result["graph"] = analysis.as_dict()
    return result


@app.get("/api/v1/intel/graph/{entity_id}")
async def intel_entity_graph(entity_id: str, depth: int = Query(2, ge=1, le=3)) -> dict:
    """Ego network for a specific entity (all entities within N link hops)."""
    from fastapi import HTTPException
    match = next(
        (e for e in _entities.values() if e["id"] == entity_id or e["uid"] == entity_id),
        None,
    )
    if not match:
        raise HTTPException(404, "Entity not found")

    entities = _entities_list()
    _, clusters = cluster_engine.dbscan(entities, eps_nm=30.0, min_pts=3)
    links, _ = link_engine.build_link_graph(entities, [c.as_dict() for c in clusters])
    link_dicts = [l.as_dict() for l in links]
    return link_engine.get_entity_network(match["uid"], entities, link_dicts, depth=depth)


@app.get("/api/v1/intel/actions")
async def intel_actions_list(
    status:   Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
) -> dict:
    """Return intelligence action queue."""
    pending = actions_engine.get_pending_actions(limit=100)
    if status:
        pending = [a for a in pending if a.status.lower() == status.lower()]
    if priority:
        pending = [a for a in pending if a.priority.lower() == priority.lower()]
    return {
        "actions": [a.as_dict() for a in pending],
        "summary": actions_engine.get_action_summary(),
        "generatedAt": _now(),
    }


@app.post("/api/v1/intel/actions/generate")
async def intel_actions_generate() -> dict:
    """Trigger action generation from current operational picture."""
    entities  = _entities_list()
    anom_raw  = anomaly_engine.analyze_batch(entities)
    anom_map  = {a.entity_uid: a for a in anom_raw}
    threats   = threat_engine.rank_threats(entities, anom_map)
    pol_raw   = pol_engine.analyze_pol_batch(entities)

    new_actions = actions_engine.generate_actions(
        entities    = entities,
        threats     = [t.as_dict() for t in threats],
        anomalies   = [a.as_dict() for a in anom_raw],
        pol_deviations = [p.as_dict() for p in pol_raw],
    )
    return {
        "generated": len(new_actions),
        "actions":   [a.as_dict() for a in new_actions],
        "summary":   actions_engine.get_action_summary(),
    }


@app.patch("/api/v1/intel/actions/{action_id}")
async def intel_action_update(action_id: str, body: dict) -> dict:
    """Update action status (ACKNOWLEDGED / COMPLETED / DISMISSED)."""
    from fastapi import HTTPException
    status = body.get("status", "")
    if not actions_engine.update_action_status(action_id, status):
        raise HTTPException(400, f"Invalid action_id or status '{status}'")
    return {"ok": True, "actionId": action_id, "status": status}


# ── WebSocket endpoints ───────────────────────────────────────────────────────

@app.websocket("/ws/entities")
async def ws_entities(ws: WebSocket) -> None:
    await ws.accept()
    _entity_sockets.append(ws)
    log.info("WS /ws/entities client connected (%d total)", len(_entity_sockets))

    # Send current snapshot immediately on connect
    snapshot = list(_entities.values())
    for e in snapshot:
        await ws.send_text(json.dumps({"op": "upsert", "entity": e, "timestamp": _now()}))

    try:
        while True:
            await ws.receive_text()   # keep-alive — client can send pings
    except WebSocketDisconnect:
        pass
    finally:
        try:
            _entity_sockets.remove(ws)
        except ValueError:
            pass
        log.info("WS /ws/entities client disconnected (%d remaining)", len(_entity_sockets))


@app.websocket("/ws/events")
async def ws_events(ws: WebSocket) -> None:
    await ws.accept()
    _event_sockets.append(ws)
    log.info("WS /ws/events client connected (%d total)", len(_event_sockets))
    await publish_event("info", "MSS Dev Server connected — SYSTEM NOMINAL", None)

    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        try:
            _event_sockets.remove(ws)
        except ValueError:
            pass


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("dev_main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
