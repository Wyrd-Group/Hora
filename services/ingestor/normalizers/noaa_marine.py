"""
NOAA National Weather Service API normalizer.
Free, no key required.

Endpoints used:
  Active weather alerts: https://api.weather.gov/alerts/active
  Marine zones:          https://api.weather.gov/alerts/active?area=PZ  (Pacific)
                         https://api.weather.gov/alerts/active?area=AM  (Atlantic/Gulf)

Ingests severe marine alerts (GALE WATCH, STORM WARNING, HURRICANE, etc.)
as MSSEntity type='event', source='OSINT', to overlay on the tactical map.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any

NOAA_ALERTS_URL = "https://api.weather.gov/alerts/active"
NOAA_PARAMS     = {
    "status":       "actual",
    "message_type": "alert",
}

# Marine-relevant event types we care about
MARINE_EVENTS = {
    "Gale Watch", "Gale Warning", "Storm Warning", "Storm Watch",
    "Hurricane Warning", "Hurricane Watch", "Typhoon Warning", "Typhoon Watch",
    "Tropical Storm Warning", "Tropical Storm Watch",
    "High Wind Warning", "High Wind Watch",
    "Small Craft Advisory", "Dense Fog Advisory",
    "Tsunami Watch", "Tsunami Warning", "Tsunami Advisory",
    "Special Marine Warning",
}

SEVERITY_MAP = {
    "Extreme":  "critical",
    "Severe":   "critical",
    "Moderate": "warning",
    "Minor":    "info",
    "Unknown":  "info",
}


def normalize_noaa_alert(feature: dict[str, Any]) -> dict[str, Any] | None:
    """
    Parse a single NWS alert GeoJSON Feature.
    Returns an event entity or None if not marine-relevant.
    """
    props = feature.get("properties", {})
    event = props.get("event", "")

    # Filter to marine-relevant events only
    if not any(m.lower() in event.lower() for m in MARINE_EVENTS):
        return None

    # Extract geometry centroid (may be null for zone-based alerts)
    geometry = feature.get("geometry")
    lat, lon = None, None
    if geometry and geometry.get("type") == "Point":
        lon, lat = geometry["coordinates"]
    elif geometry and geometry.get("type") == "Polygon":
        coords = geometry["coordinates"][0]
        lon = sum(c[0] for c in coords) / len(coords)
        lat = sum(c[1] for c in coords) / len(coords)
    elif geometry and geometry.get("type") == "MultiPolygon":
        all_coords = [c for ring in geometry["coordinates"] for c in ring[0]]
        lon = sum(c[0] for c in all_coords) / len(all_coords)
        lat = sum(c[1] for c in all_coords) / len(all_coords)

    if lat is None or lon is None:
        return None   # Can't place on map

    alert_id = props.get("id") or hashlib.md5(
        (event + str(lat) + str(lon)).encode()
    ).hexdigest()[:16]

    severity  = SEVERITY_MAP.get(props.get("severity", "Unknown"), "info")
    headline  = props.get("headline") or event
    effective = props.get("effective") or datetime.now(timezone.utc).isoformat() + "Z"
    expires   = props.get("expires")

    return {
        "uid":         f"NOAA-{alert_id}",
        "entityType":  "event",
        "callsign":    event[:20],
        "lat":         round(lat, 5),
        "lon":         round(lon, 5),
        "altitude":    None,
        "heading":     None,
        "speed":       None,
        "affiliation": "neutral",
        "source":      "OSINT",
        "staleAt":     expires,
        "lastSeen":    effective,
        "raw": {
            "event":       event,
            "severity":    severity,
            "headline":    headline,
            "description": (props.get("description") or "")[:500],
            "areaDesc":    props.get("areaDesc"),
            "senderName":  props.get("senderName"),
        },
    }


def parse_noaa_alerts(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Parse NWS alerts GeoJSON FeatureCollection."""
    features = data.get("features") or []
    entities = []
    for f in features:
        e = normalize_noaa_alert(f)
        if e:
            entities.append(e)
    return entities
