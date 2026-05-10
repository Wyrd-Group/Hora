"""
Pydantic models — camelCase JSON output to match MSSEntity in shared-types.
All field names MUST stay in sync with packages/shared-types/src/index.ts.
"""
from __future__ import annotations
from datetime import datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict, field_serializer


def _to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)


# ── Core entity ───────────────────────────────────────────────────────────────

class MSSEntity(CamelModel):
    id:           str
    uid:          str
    entity_type:  str
    callsign:     Optional[str]   = None
    lat:          Optional[float] = None
    lon:          Optional[float] = None
    altitude:     Optional[float] = None
    heading:      Optional[float] = None
    speed:        Optional[float] = None
    affiliation:  Literal['friendly', 'hostile', 'neutral', 'unknown'] = 'unknown'
    source:       Literal['ADS-B', 'AIS', 'CoT', 'OSINT', 'MANUAL']
    stale_at:     Optional[datetime] = None
    last_seen:    datetime
    raw:          Optional[Any]   = None

    @field_serializer('stale_at', 'last_seen')
    def _iso(self, v: Optional[datetime]) -> Optional[str]:
        return v.isoformat() + 'Z' if v else None


# ── Sighting ──────────────────────────────────────────────────────────────────

class Sighting(CamelModel):
    lat:         float
    lon:         float
    altitude:    Optional[float] = None
    heading:     Optional[float] = None
    speed:       Optional[float] = None
    observed_at: datetime
    source:      Optional[str]   = None
    confidence:  float           = 1.0

    @field_serializer('observed_at')
    def _iso(self, v: datetime) -> str:
        return v.isoformat() + 'Z'


# ── Relationship ──────────────────────────────────────────────────────────────

class RelationshipTarget(CamelModel):
    id:    str
    type:  str
    label: str


class EntityRelationship(CamelModel):
    type:   str
    target: RelationshipTarget


# ── Entity detail (extends MSSEntity) ─────────────────────────────────────────

class EntityDetail(MSSEntity):
    relationships:    list[EntityRelationship] = []
    recent_sightings: list[Sighting]           = []


# ── OSINT report ──────────────────────────────────────────────────────────────

class OsintReport(CamelModel):
    id:           str
    title:        Optional[str]      = None
    body:         Optional[str]      = None
    source_url:   Optional[str]      = None
    published_at: Optional[datetime] = None
    entity_ids:   list[str]          = []
    similarity:   Optional[float]    = None

    @field_serializer('published_at')
    def _iso(self, v: Optional[datetime]) -> Optional[str]:
        return v.isoformat() + 'Z' if v else None


# ── API response wrappers ─────────────────────────────────────────────────────

class PaginatedEntities(BaseModel):
    items:    list[MSSEntity]
    total:    int
    page:     int
    per_page: int


class ApiHealth(BaseModel):
    status:  Literal['ok', 'degraded']
    version: str
    uptime:  float                       # seconds


class IngestResult(BaseModel):
    accepted: int
    failed:   int


class DossierResult(BaseModel):
    markdown:     str
    generated_at: str


class TrackResult(BaseModel):
    uid:      str
    sightings: list[Sighting]


class SimilarReportsResult(BaseModel):
    reports: list[OsintReport]


# ── WebSocket message models ───────────────────────────────────────────────────

class WSEntityMessage(BaseModel):
    op:        Literal['upsert', 'stale', 'delete']
    entity:    MSSEntity
    timestamp: str


class WSEventMessage(BaseModel):
    severity:  Literal['info', 'warning', 'critical']
    message:   str
    entity_id: Optional[str] = None
    timestamp: str
