"""
Geofence Engine — pure Python, no Shapely required.

Supports three AOI types:
  CircleAOI   — (center_lat, center_lon, radius_nm)
  BBoxAOI     — (min_lat, min_lon, max_lat, max_lon)
  PolygonAOI  — list of (lat, lon) pairs, ray-casting point-in-polygon

Named AOIs for dev (Persian Gulf region):
  STRAIT_OF_HORMUZ    — ~30nm circle around the strait
  HORMUZ_AOI          — bounding box for Gulf approach
  PERSIAN_GULF_NORTH  — northern Gulf
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Literal

# ── Distance helper ────────────────────────────────────────────────────────────

def haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in nautical miles."""
    R = 3440.065
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ  = math.radians(lat2 - lat1)
    Δλ  = math.radians(lon2 - lon1)
    a   = math.sin(Δφ/2)**2 + math.cos(φ1)*math.cos(φ2)*math.sin(Δλ/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Ray-casting point-in-polygon ───────────────────────────────────────────────

def point_in_polygon(lat: float, lon: float, polygon: list[tuple[float, float]]) -> bool:
    """
    Ray-casting algorithm — O(n).
    polygon: list of (lat, lon) pairs, does NOT need to be closed.
    """
    n       = len(polygon)
    inside  = False
    j       = n - 1
    for i in range(n):
        yi, xi = polygon[i]
        yj, xj = polygon[j]
        if ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-20) + xi):
            inside = not inside
        j = i
    return inside


# ── AOI types ─────────────────────────────────────────────────────────────────

@dataclass
class CircleAOI:
    name:       str
    center_lat: float
    center_lon: float
    radius_nm:  float
    severity:   Literal["info", "warning", "critical"] = "warning"

    def contains(self, lat: float, lon: float) -> bool:
        return haversine_nm(self.center_lat, self.center_lon, lat, lon) <= self.radius_nm


@dataclass
class BBoxAOI:
    name:     str
    min_lat:  float
    min_lon:  float
    max_lat:  float
    max_lon:  float
    severity: Literal["info", "warning", "critical"] = "warning"

    def contains(self, lat: float, lon: float) -> bool:
        return self.min_lat <= lat <= self.max_lat and self.min_lon <= lon <= self.max_lon


@dataclass
class PolygonAOI:
    name:     str
    vertices: list[tuple[float, float]]   # (lat, lon) pairs
    severity: Literal["info", "warning", "critical"] = "warning"

    def contains(self, lat: float, lon: float) -> bool:
        return point_in_polygon(lat, lon, self.vertices)


AOIType = CircleAOI | BBoxAOI | PolygonAOI


# ── Named AOI registry ─────────────────────────────────────────────────────────

NAMED_AOIS: list[AOIType] = [
    CircleAOI(
        name       = "Strait of Hormuz",
        center_lat = 26.58, center_lon = 56.35,
        radius_nm  = 30.0,
        severity   = "critical",
    ),
    BBoxAOI(
        name    = "Persian Gulf",
        min_lat = 23.5, min_lon = 48.0,
        max_lat = 29.0, max_lon = 57.0,
        severity= "warning",
    ),
    CircleAOI(
        name       = "Gulf of Oman",
        center_lat = 23.5, center_lon = 59.0,
        radius_nm  = 120.0,
        severity   = "warning",
    ),
    PolygonAOI(
        name = "Strait of Hormuz Chokepoint",
        vertices = [
            (26.2, 55.8), (26.9, 56.1), (27.0, 57.0),
            (26.4, 57.3), (25.8, 56.8), (25.9, 55.9),
        ],
        severity = "critical",
    ),
    CircleAOI(
        name       = "Taiwan Strait",
        center_lat = 24.5, center_lon = 120.5,
        radius_nm  = 80.0,
        severity   = "critical",
    ),
    CircleAOI(
        name       = "South China Sea - Paracel Islands",
        center_lat = 16.5, center_lon = 112.0,
        radius_nm  = 60.0,
        severity   = "warning",
    ),
    BBoxAOI(
        name    = "Baltic Sea",
        min_lat = 54.0, min_lon = 14.0,
        max_lat = 65.0, max_lon = 30.0,
        severity= "info",
    ),
]


# ── Geofence check ─────────────────────────────────────────────────────────────

@dataclass
class GeofenceAlert:
    entity_id:    str
    entity_uid:   str
    callsign:     str | None
    aoi_name:     str
    severity:     str
    distance_nm:  float | None   # None for polygon/bbox

    def as_dict(self) -> dict:
        return {
            "entityId":   self.entity_id,
            "entityUid":  self.entity_uid,
            "callsign":   self.callsign,
            "aoiName":    self.aoi_name,
            "severity":   self.severity,
            "distanceNm": round(self.distance_nm, 1) if self.distance_nm is not None else None,
        }


def check_entity(entity: dict, aois: list[AOIType] | None = None) -> list[GeofenceAlert]:
    """Return list of geofence alerts for a single entity."""
    lat = entity.get("lat")
    lon = entity.get("lon")
    if lat is None or lon is None:
        return []

    aois   = aois if aois is not None else NAMED_AOIS
    alerts = []
    for aoi in aois:
        if aoi.contains(lat, lon):
            dist = None
            if isinstance(aoi, CircleAOI):
                dist = haversine_nm(aoi.center_lat, aoi.center_lon, lat, lon)
            alerts.append(GeofenceAlert(
                entity_id   = entity.get("id", entity.get("uid", "")),
                entity_uid  = entity.get("uid", ""),
                callsign    = entity.get("callsign"),
                aoi_name    = aoi.name,
                severity    = aoi.severity,
                distance_nm = dist,
            ))
    return alerts


def check_all(entities: list[dict], aois: list[AOIType] | None = None) -> list[GeofenceAlert]:
    """Check all entities against all AOIs. Returns sorted by severity."""
    _sev_order = {"critical": 0, "warning": 1, "info": 2}
    alerts = []
    for e in entities:
        alerts.extend(check_entity(e, aois))
    return sorted(alerts, key=lambda a: (_sev_order.get(a.severity, 9), a.aoi_name))


def custom_geofence_check(
    entities: list[dict],
    geofence: dict,
) -> list[str]:
    """
    Check which entity IDs fall inside a user-defined geofence.
    geofence: {"type": "circle"|"bbox"|"polygon", ...}
    """
    gtype = geofence.get("type", "polygon")

    if gtype == "circle":
        aoi = CircleAOI(
            name       = "custom",
            center_lat = geofence["lat"],
            center_lon = geofence["lon"],
            radius_nm  = geofence["radiusNm"],
        )
    elif gtype == "bbox":
        aoi = BBoxAOI(
            name    = "custom",
            min_lat = geofence["minLat"], min_lon = geofence["minLon"],
            max_lat = geofence["maxLat"], max_lon = geofence["maxLon"],
        )
    else:
        verts = [(v["lat"], v["lon"]) for v in geofence.get("vertices", [])]
        aoi   = PolygonAOI(name="custom", vertices=verts)

    return [
        e.get("id", e.get("uid", ""))
        for e in entities
        if e.get("lat") is not None and aoi.contains(e["lat"], e["lon"])
    ]
