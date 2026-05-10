"""
ACLED (Armed Conflict Location & Event Data) normalizer.
Free API key via registration at https://acleddata.com/

Endpoint: https://api.acleddata.com/acled/read
Required params: key=<your_key>, email=<your_email>

Event types ingested as hostiles or unknowns:
  - Battles, Explosions/Remote violence → hostile
  - Violence against civilians, Riots → unknown
  - Protests, Strategic developments → neutral

Rate limit: 500 requests/month on free tier.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

ACLED_URL = "https://api.acleddata.com/acled/read"

# event_type → (affiliation, entity_type)
ACLED_AFFILIATION: dict[str, tuple[str, str]] = {
    "Battles":                  ("hostile", "event"),
    "Explosions/Remote violence": ("hostile", "event"),
    "Violence against civilians": ("unknown", "event"),
    "Riots":                    ("unknown", "event"),
    "Protests":                 ("neutral", "event"),
    "Strategic developments":   ("neutral", "event"),
}


def normalize_acled_event(event: dict[str, Any]) -> dict[str, Any] | None:
    """Parse a single ACLED event object."""
    try:
        lat = float(event.get("latitude", "NaN"))
        lon = float(event.get("longitude", "NaN"))
    except (ValueError, TypeError):
        return None

    if lat != lat or lon != lon:
        return None

    event_id   = event.get("data_id") or event.get("event_id_cnty") or ""
    event_type = event.get("event_type", "Strategic developments")
    sub_event  = event.get("sub_event_type", "")
    actor1     = event.get("actor1", "Unknown actor")
    country    = event.get("country", "")
    fatalities = int(event.get("fatalities", 0) or 0)
    event_date = event.get("event_date", "")

    affiliation, etype = ACLED_AFFILIATION.get(event_type, ("neutral", "event"))

    # High fatality events → hostile regardless
    if fatalities >= 10:
        affiliation = "hostile"

    try:
        ts = datetime.strptime(event_date, "%Y-%m-%d").replace(tzinfo=timezone.utc).isoformat() + "Z"
    except Exception:
        ts = datetime.now(timezone.utc).isoformat() + "Z"

    callsign = f"ACLED-{event_type[:4].upper()}"
    if fatalities > 0:
        callsign += f"-{fatalities}KIA"

    return {
        "uid":         f"ACLED-{event_id}" if event_id else f"ACLED-{lat:.3f}-{lon:.3f}",
        "entityType":  etype,
        "callsign":    callsign,
        "lat":         lat,
        "lon":         lon,
        "altitude":    None,
        "heading":     None,
        "speed":       float(fatalities),   # fatalities in speed field as signal strength
        "affiliation": affiliation,
        "source":      "OSINT",
        "staleAt":     None,
        "lastSeen":    ts,
        "raw": {
            "eventType":  event_type,
            "subEvent":   sub_event,
            "actor1":     actor1,
            "actor2":     event.get("actor2"),
            "country":    country,
            "fatalities": fatalities,
            "notes":      (event.get("notes") or "")[:500],
            "source":     event.get("source"),
        },
    }


def parse_acled_response(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Parse ACLED API response data array."""
    events   = data.get("data") or []
    entities = []
    for evt in events:
        e = normalize_acled_event(evt)
        if e:
            entities.append(e)
    return entities
