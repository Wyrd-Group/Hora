"""
GET /api/v1/entities
GET /api/v1/entities/{id}
GET /api/v1/entities/{id}/dossier
GET /api/v1/entities/{id}/track
POST /api/v1/entities/ingest
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, HTTPException, Query

from core.config import settings
from core.db import pool
from models.entities import (
    DossierResult,
    EntityDetail,
    EntityRelationship,
    IngestResult,
    MSSEntity,
    OsintReport,
    PaginatedEntities,
    RelationshipTarget,
    Sighting,
    TrackResult,
)

router = APIRouter(prefix="/api/v1/entities", tags=["entities"])

# ── helpers ───────────────────────────────────────────────────────────────────

def _row_to_entity(row: dict) -> MSSEntity:
    return MSSEntity(
        id          = str(row["id"]),
        uid         = row["uid"],
        entity_type = row["entity_type"],
        callsign    = row.get("callsign"),
        lat         = row.get("lat"),
        lon         = row.get("lon"),
        altitude    = row.get("altitude"),
        heading     = row.get("heading"),
        speed       = row.get("speed"),
        affiliation = row.get("affiliation", "unknown"),
        source      = row["source"],
        stale_at    = row.get("stale_at"),
        last_seen   = row["last_seen"],
    )


# ── list entities ─────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedEntities)
async def list_entities(
    page:        int           = Query(1, ge=1),
    per_page:    int           = Query(100, ge=1, le=1000),
    source:      Optional[str] = None,
    affiliation: Optional[str] = None,
    bbox:        Optional[str] = None,   # "lon_min,lat_min,lon_max,lat_max"
) -> PaginatedEntities:
    conditions: list[str] = []
    params:     list      = []
    i = 1

    if source:
        conditions.append(f"source = ${i}"); params.append(source); i += 1
    if affiliation:
        conditions.append(f"affiliation = ${i}"); params.append(affiliation); i += 1
    if bbox:
        try:
            lon_min, lat_min, lon_max, lat_max = map(float, bbox.split(","))
        except ValueError:
            raise HTTPException(400, "bbox must be 'lon_min,lat_min,lon_max,lat_max'")
        conditions.append(
            f"lon BETWEEN ${i} AND ${i+1} AND lat BETWEEN ${i+2} AND ${i+3}"
        )
        params.extend([lon_min, lon_max, lat_min, lat_max])
        i += 4

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    offset = (page - 1) * per_page

    db = pool()
    rows = await db.fetch(
        f"SELECT * FROM entities {where} ORDER BY last_seen DESC LIMIT ${i} OFFSET ${i+1}",
        *params, per_page, offset,
    )
    total = await db.fetchval(f"SELECT COUNT(*) FROM entities {where}", *params)

    return PaginatedEntities(
        items    = [_row_to_entity(dict(r)) for r in rows],
        total    = total or 0,
        page     = page,
        per_page = per_page,
    )


# ── entity detail + relationships ─────────────────────────────────────────────

@router.get("/{entity_id}", response_model=EntityDetail)
async def get_entity(entity_id: UUID) -> EntityDetail:
    db  = pool()
    row = await db.fetchrow("SELECT * FROM entities WHERE id = $1", entity_id)
    if not row:
        raise HTTPException(404, "Entity not found")

    entity = _row_to_entity(dict(row))

    # Query graph relationships via Apache AGE
    relationships: list[EntityRelationship] = []
    try:
        graph_rows = await db.fetch(
            """
            SELECT * FROM ag_catalog.cypher('mss_graph', $$
                MATCH (e:Entity {uid: $uid})-[r]-(target:Entity)
                RETURN type(r) as rel_type, target.uid as target_uid,
                       target.type as target_type, target.callsign as target_label
                LIMIT 25
            $$, $1) AS (rel_type ag_catalog.agtype, target_uid ag_catalog.agtype, target_type ag_catalog.agtype, target_label ag_catalog.agtype)
            """,
            json.dumps({"uid": entity.uid}),
        )
        for gr in graph_rows:
            relationships.append(EntityRelationship(
                type   = str(gr["rel_type"]).strip('"'),
                target = RelationshipTarget(
                    id    = str(gr["target_uid"]).strip('"'),
                    type  = str(gr["target_type"]).strip('"'),
                    label = str(gr["target_label"]).strip('"') or "unknown",
                ),
            ))
    except Exception:
        pass  # AGE not available or no relationships — degrade gracefully

    # Recent sightings (last 50)
    sight_rows = await db.fetch(
        """
        SELECT lat, lon, altitude, heading, speed, observed_at, source, confidence
        FROM sightings WHERE entity_id = $1 ORDER BY observed_at DESC LIMIT 50
        """,
        entity_id,
    )
    sightings = [
        Sighting(
            lat        = r["lat"],
            lon        = r["lon"],
            altitude   = r.get("altitude"),
            heading    = r.get("heading"),
            speed      = r.get("speed"),
            observed_at= r["observed_at"],
            source     = r.get("source"),
            confidence = r.get("confidence", 1.0),
        )
        for r in sight_rows
    ]

    return EntityDetail(
        **entity.model_dump(),
        relationships    = relationships,
        recent_sightings = sightings,
    )


# ── dossier (LLM-generated) ───────────────────────────────────────────────────

@router.get("/{entity_id}/dossier", response_model=DossierResult)
async def get_dossier(entity_id: UUID) -> DossierResult:
    db  = pool()
    row = await db.fetchrow("SELECT * FROM entities WHERE id = $1", entity_id)
    if not row:
        raise HTTPException(404, "Entity not found")

    entity = _row_to_entity(dict(row))

    sight_rows = await db.fetch(
        "SELECT lat, lon, observed_at FROM sightings WHERE entity_id = $1 "
        "ORDER BY observed_at DESC LIMIT 10",
        entity_id,
    )
    sightings_json = [{"lat": r["lat"], "lon": r["lon"],
                       "observedAt": r["observed_at"].isoformat() + "Z"} for r in sight_rows]

    prompt = f"""You are an intelligence analyst. Generate a concise, structured dossier for the
following entity. Include: identity summary, known associations, recent activity,
and assessed threat level (Low/Medium/High/Critical).

Entity: {entity.model_dump_json()}
Recent sightings: {json.dumps(sightings_json)}

Output in Markdown. Be factual. Flag uncertainty explicitly."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                settings.ollama_url + "/api/generate",
                json={"model": settings.ollama_chat_model, "prompt": prompt, "stream": False},
            )
            resp.raise_for_status()
            markdown = resp.json().get("response", "[No response from LLM]")
    except Exception:
        markdown = (
            "[Dossier unavailable — LLM offline. Raw entity data attached.]\n\n"
            f"```json\n{entity.model_dump_json(indent=2)}\n```"
        )

    return DossierResult(
        markdown     = markdown,
        generated_at = datetime.now(timezone.utc).isoformat() + "Z",
    )


# ── track history ─────────────────────────────────────────────────────────────

@router.get("/{entity_id}/track", response_model=TrackResult)
async def get_track(entity_id: UUID) -> TrackResult:
    db  = pool()
    row = await db.fetchrow("SELECT uid FROM entities WHERE id = $1", entity_id)
    if not row:
        raise HTTPException(404, "Entity not found")

    sight_rows = await db.fetch(
        """
        SELECT lat, lon, altitude, heading, speed, observed_at, source, confidence
        FROM sightings WHERE entity_id = $1 ORDER BY observed_at DESC LIMIT 500
        """,
        entity_id,
    )
    return TrackResult(
        uid      = row["uid"],
        sightings = [
            Sighting(
                lat        = r["lat"],
                lon        = r["lon"],
                altitude   = r.get("altitude"),
                heading    = r.get("heading"),
                speed      = r.get("speed"),
                observed_at= r["observed_at"],
                source     = r.get("source"),
                confidence = r.get("confidence", 1.0),
            )
            for r in sight_rows
        ],
    )


# ── ingest endpoint ───────────────────────────────────────────────────────────

@router.post("/ingest", response_model=IngestResult)
async def ingest(body: dict) -> IngestResult:
    """
    Accepts raw CoT XML or JSON payloads, normalizes, and upserts into the DB.
    fmt: 'cot' | 'json'
    """
    fmt     = body.get("format", "json")
    payload = body.get("payload", "")

    if fmt == "cot":
        # Delegate to CoT parser subprocess or internal Python parser
        # For now we acknowledge receipt and return 0/0 (ingestor handles CoT)
        return IngestResult(accepted=0, failed=0)

    if fmt == "json":
        if isinstance(payload, str):
            try:
                items = json.loads(payload)
                if not isinstance(items, list):
                    items = [items]
            except json.JSONDecodeError:
                return IngestResult(accepted=0, failed=1)
        else:
            items = payload if isinstance(payload, list) else [payload]

        db       = pool()
        accepted = 0
        failed   = 0
        for item in items:
            try:
                await db.execute(
                    """
                    INSERT INTO entities (uid, entity_type, callsign, lat, lon, altitude,
                                         heading, speed, affiliation, source, raw, last_seen)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
                    ON CONFLICT (uid) DO UPDATE
                        SET lat = EXCLUDED.lat, lon = EXCLUDED.lon,
                            heading = EXCLUDED.heading, speed = EXCLUDED.speed,
                            last_seen = now(), raw = EXCLUDED.raw
                    """,
                    item.get("uid", ""),
                    item.get("entityType", "unknown"),
                    item.get("callsign"),
                    item.get("lat"),
                    item.get("lon"),
                    item.get("altitude"),
                    item.get("heading"),
                    item.get("speed"),
                    item.get("affiliation", "unknown"),
                    item.get("source", "MANUAL"),
                    json.dumps(item),
                )
                accepted += 1
            except Exception:
                failed += 1

        return IngestResult(accepted=accepted, failed=failed)

    raise HTTPException(400, f"Unknown format: {fmt}")
