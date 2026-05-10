"""
NASA EONET (Earth Observatory Natural Event Tracker) normalizer.
Free API, no key required (30 req/hr without key, 1000 with free NASA key).

Endpoint: https://eonet.gsfc.nasa.gov/api/v3/events
Returns natural events (wildfires, storms, volcanoes, earthquakes, icebergs, etc.)
with precise lat/lon geometry.

Complements USGS (seismic only) and FIRMS (fire only) with broader event coverage.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events"
EONET_PARAMS = {
    "status": "open",
    "limit":  100,
}

# EONET category → entity affiliation
CATEGORY_MAP = {
    "wildfires":    "neutral",
    "severeStorms": "neutral",
    "volcanoes":    "neutral",
    "earthquakes":  "neutral",
    "floods":       "neutral",
    "landslides":   "neutral",
    "seaLakeIce":   "neutral",
    "drought":      "neutral",
    "dustHaze":     "neutral",
    "tempExtremes": "neutral",
    "waterColor":   "neutral",
    "manmade":      "unknown",
}

CATEGORY_LABEL = {
    "wildfires":    "FIRE",
    "severeStorms": "STORM",
    "volcanoes":    "VOLC",
    "earthquakes":  "QUAKE",
    "floods":       "FLOOD",
    "landslides":   "SLIDE",
    "seaLakeIce":   "ICE",
    "drought":      "DROUGHT",
    "dustHaze":     "DUST",
    "tempExtremes": "TEMP",
    "waterColor":   "WATER",
    "manmade":      "MANMADE",
}


def normalize_eonet_event(event: dict[str, Any]) -> dict[str, Any] | None:
    """Parse a single EONET v3 event into an MSSEntity-shaped dict."""
    geometry_list = event.get("geometry", [])
    if not geometry_list:
        return None

    # Use the most recent geometry entry
    latest_geo = geometry_list[-1]
    coords = latest_geo.get("coordinates")
    if not coords or len(coords) < 2:
        return None

    # EONET uses [lon, lat] (GeoJSON standard)
    lon, lat = float(coords[0]), float(coords[1])

    event_id   = event.get("id", "")
    title      = event.get("title", "Unknown event")
    categories = event.get("categories", [])
    cat_id     = categories[0].get("id", "unknown") if categories else "unknown"
    cat_title  = categories[0].get("title", "Unknown") if categories else "Unknown"

    affiliation = CATEGORY_MAP.get(cat_id, "neutral")
    label       = CATEGORY_LABEL.get(cat_id, "EVENT")

    # Parse date
    geo_date = latest_geo.get("date")
    ts = geo_date if geo_date else datetime.now(timezone.utc).isoformat() + "Z"

    # Magnitude (may be null)
    mag_value = latest_geo.get("magnitudeValue")
    mag_unit  = latest_geo.get("magnitudeUnit", "")

    callsign = f"EONET-{label}"
    if mag_value is not None:
        callsign += f"-{mag_value:.0f}{mag_unit[:3]}"

    return {
        "uid":         f"EONET-{event_id}" if event_id else f"EONET-{lat:.3f}-{lon:.3f}",
        "entityType":  "event",
        "callsign":    callsign[:20],
        "lat":         lat,
        "lon":         lon,
        "altitude":    None,
        "heading":     None,
        "speed":       float(mag_value) if mag_value is not None else None,
        "affiliation": affiliation,
        "source":      "OSINT",
        "staleAt":     None,
        "lastSeen":    ts,
        "raw": {
            "title":          title,
            "category":       cat_title,
            "categoryId":     cat_id,
            "magnitudeValue": mag_value,
            "magnitudeUnit":  mag_unit,
            "closed":         event.get("closed"),
            "link":           event.get("link"),
            "sources":        [s.get("id") for s in event.get("sources", [])],
        },
    }


def parse_eonet_events(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Parse EONET v3 events response."""
    events   = data.get("events", []) or []
    entities = []
    for evt in events:
        e = normalize_eonet_event(evt)
        if e:
            entities.append(e)
    return entities
