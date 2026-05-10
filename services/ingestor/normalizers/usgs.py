"""
USGS Earthquake Hazards Program — normalizer.
Free API, no key required.

Endpoint: https://earthquake.usgs.gov/fdsnws/event/1/query
GeoJSON format, recent M≥4.0 events, last 7 days.

Ingests earthquakes as MSSEntity type='event', source='OSINT'.
Magnitude maps to 'speed' field (repurposed for signal strength).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"
USGS_PARAMS = {
    "format":         "geojson",
    "minmagnitude":   "4.0",
    "limit":          "200",
    "orderby":        "time",
    "starttime":      "",   # filled at runtime: 7 days ago
}


def normalize_usgs_feature(feature: dict[str, Any]) -> dict[str, Any] | None:
    """Parse a single GeoJSON Feature from USGS earthquake feed."""
    try:
        coords = feature["geometry"]["coordinates"]   # [lon, lat, depth_km]
        props  = feature["properties"]
        lon, lat, depth = float(coords[0]), float(coords[1]), float(coords[2])
    except (KeyError, TypeError, ValueError, IndexError):
        return None

    mag   = props.get("mag", 0.0) or 0.0
    place = props.get("place", "Unknown location")
    time_ms = props.get("time", 0)   # epoch ms
    uid   = feature.get("id", f"USGS-{lat:.3f}-{lon:.3f}")

    try:
        ts = datetime.fromtimestamp(time_ms / 1000, tz=timezone.utc).isoformat() + "Z"
    except Exception:
        ts = datetime.now(timezone.utc).isoformat() + "Z"

    # Classify severity
    if mag >= 7.0:
        severity_label = "MAJOR"
    elif mag >= 6.0:
        severity_label = "STRONG"
    elif mag >= 5.0:
        severity_label = "MODERATE"
    else:
        severity_label = "LIGHT"

    return {
        "uid":         uid,
        "entityType":  "event",
        "callsign":    f"EQ-M{mag:.1f}-{severity_label}",
        "lat":         lat,
        "lon":         lon,
        "altitude":    -depth * 1000.0,   # depth → negative altitude in metres
        "heading":     None,
        "speed":       mag,               # magnitude stored in speed field
        "affiliation": "neutral",
        "source":      "OSINT",
        "staleAt":     None,
        "lastSeen":    ts,
        "raw": {
            "magnitude": mag,
            "place":     place,
            "depthKm":   depth,
            "magType":   props.get("magType"),
            "status":    props.get("status"),
            "tsunami":   props.get("tsunami", 0),
            "url":       props.get("url"),
        },
    }


def parse_usgs_geojson(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Parse full USGS GeoJSON FeatureCollection."""
    features = data.get("features", []) or []
    entities = []
    for f in features:
        e = normalize_usgs_feature(f)
        if e:
            entities.append(e)
    return entities
