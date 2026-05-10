"""
Ontology Engine — Palantir-style typed entity and relationship model.

In Palantir Foundry/AIP every data element is an "Object" with:
  - ObjectType  : typed schema (Aircraft, Vessel, Person, Event, Location)
  - Properties  : strongly-typed fields
  - Links       : directed relationships to other objects
  - Object Sets : dynamic filtered collections

This module defines the AEGIS ontology: the canonical data model
that all engines operate on. It is the single source of truth for
what an entity IS and what relationships it CAN have.

Link types mirror real intelligence tradecraft:
  PROXIMITY   — entities detected in close physical proximity
  CO_OCCURS   — entities active in same time/area window
  ROUTE_SHARE — entities following similar route vectors
  PORT_CALL   — vessel called at same port
  FORMATION   — entities assessed to be operating in coordinated formation
  PARENT_UNIT — hierarchical command relationship (CoT/military)
  OBSERVED_BY — sensor/source that detected this entity
  ALIAS_OF    — two records assessed to be the same real-world entity
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any


# ── Object type schemas ───────────────────────────────────────────────────────

OBJECT_TYPES = {
    "aircraft": {
        "description": "Fixed-wing or rotary aircraft",
        "key_properties": ["callsign", "speed", "altitude", "heading", "affiliation", "source"],
        "icon": "plane",
        "threat_weight": 1.4,    # aircraft threats escalate faster
    },
    "vessel": {
        "description": "Maritime vessel (commercial, military, or unknown)",
        "key_properties": ["callsign", "speed", "heading", "affiliation", "source"],
        "icon": "ship",
        "threat_weight": 1.2,
    },
    "ground": {
        "description": "Ground vehicle or unit",
        "key_properties": ["callsign", "speed", "heading", "affiliation", "source"],
        "icon": "truck",
        "threat_weight": 1.0,
    },
    "person": {
        "description": "Individual person or small team",
        "key_properties": ["callsign", "affiliation", "source"],
        "icon": "user",
        "threat_weight": 0.8,
    },
    "event": {
        "description": "Geopolitical, conflict, or natural event",
        "key_properties": ["callsign", "affiliation", "source"],
        "icon": "alert",
        "threat_weight": 0.6,
    },
    "location": {
        "description": "Fixed location or point of interest",
        "key_properties": ["callsign"],
        "icon": "map-pin",
        "threat_weight": 0.0,
    },
}

# ── Link type definitions ─────────────────────────────────────────────────────

LINK_TYPES = {
    "PROXIMITY":    {"label": "In Proximity",     "direction": "undirected", "weight": 0.7},
    "CO_OCCURS":    {"label": "Co-occurrence",     "direction": "undirected", "weight": 0.5},
    "ROUTE_SHARE":  {"label": "Route Correlation", "direction": "undirected", "weight": 0.8},
    "PORT_CALL":    {"label": "Port Call",         "direction": "undirected", "weight": 0.9},
    "FORMATION":    {"label": "Formation Member",  "direction": "undirected", "weight": 1.0},
    "PARENT_UNIT":  {"label": "Parent Unit",       "direction": "directed",   "weight": 1.0},
    "OBSERVED_BY":  {"label": "Observed By",       "direction": "directed",   "weight": 0.3},
    "ALIAS_OF":     {"label": "Possible Alias",    "direction": "undirected", "weight": 0.95},
}

# ── Affiliation risk table ────────────────────────────────────────────────────

AFFILIATION_RISK = {
    "hostile":  1.0,
    "unknown":  0.4,
    "neutral":  0.15,
    "friendly": 0.0,
}


# ── Data structures ───────────────────────────────────────────────────────────

@dataclass
class EntityLink:
    """A directed or undirected relationship between two entities."""
    source_uid:  str
    target_uid:  str
    link_type:   str              # one of LINK_TYPES
    confidence:  float = 0.5     # 0–1
    evidence:    str   = ""      # human-readable reason
    created_at:  str   = ""

    def as_dict(self) -> dict:
        d = asdict(self)
        d["label"] = LINK_TYPES.get(self.link_type, {}).get("label", self.link_type)
        return d


@dataclass
class OntologyObject:
    """
    A fully resolved entity with typed properties and associated links.
    This is the Palantir "Object" — the canonical unit of analysis.
    """
    uid:          str
    object_type:  str
    callsign:     str
    affiliation:  str
    source:       str
    lat:          float | None  = None
    lon:          float | None  = None
    speed:        float         = 0.0
    heading:      float         = 0.0
    altitude:     float | None  = None
    threat_score: int           = 0
    anomaly_score: float        = 0.0
    anomaly_flags: list[str]    = field(default_factory=list)
    links:        list[EntityLink] = field(default_factory=list)
    properties:   dict[str, Any]   = field(default_factory=dict)

    def as_dict(self) -> dict:
        d = asdict(self)
        d["objectType"] = d.pop("object_type")
        d["threatScore"] = d.pop("threat_score")
        d["anomalyScore"] = d.pop("anomaly_score")
        d["anomalyFlags"] = d.pop("anomaly_flags")
        d["links"] = [l.as_dict() for l in self.links]
        d["schema"] = OBJECT_TYPES.get(self.object_type, {})
        return d


def build_ontology_object(
    entity:    dict[str, Any],
    threat:    dict | None = None,
    anomaly:   dict | None = None,
    links:     list[EntityLink] | None = None,
) -> OntologyObject:
    """Build an OntologyObject from a raw entity dict + analytics results."""
    return OntologyObject(
        uid          = entity.get("uid", ""),
        object_type  = entity.get("entityType", "ground"),
        callsign     = entity.get("callsign") or entity.get("uid", "")[:8],
        affiliation  = entity.get("affiliation", "unknown"),
        source       = entity.get("source", "UNKNOWN"),
        lat          = entity.get("lat"),
        lon          = entity.get("lon"),
        speed        = entity.get("speed") or 0.0,
        heading      = entity.get("heading") or 0.0,
        altitude     = entity.get("altitude"),
        threat_score = threat.get("score", 0) if threat else 0,
        anomaly_score= anomaly.get("score", 0.0) if anomaly else 0.0,
        anomaly_flags= anomaly.get("flags", []) if anomaly else [],
        links        = links or [],
        properties   = {k: entity.get(k) for k in ("source", "lastSeen", "staleAt") if entity.get(k)},
    )
