"""
OpenSky Network REST API normalizer.
State vector array columns:
  0 icao24  1 callsign  2 origin_country  3 time_position  4 last_contact
  5 longitude  6 latitude  7 baro_altitude  8 on_ground
  9 velocity  10 true_track  11 vertical_rate  12 sensors
  13 geo_altitude  14 squawk  15 spi  16 position_source
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def normalize_opensky(state: list[Any]) -> dict[str, Any] | None:
    """Return MSSEntity-shaped dict or None if data is unusable."""
    if len(state) < 17:
        return None

    lat = state[6]
    lon = state[5]
    if lat is None or lon is None:
        return None

    callsign = state[1]
    if callsign:
        callsign = callsign.strip() or None

    return {
        "uid":         state[0],           # ICAO24
        "entityType":  "aircraft",
        "callsign":    callsign,
        "lat":         float(lat),
        "lon":         float(lon),
        "altitude":    float(state[7]) if state[7] is not None else None,
        "heading":     float(state[10]) if state[10] is not None else None,
        "speed":       float(state[9]) if state[9] is not None else None,
        "affiliation": "unknown",
        "source":      "ADS-B",
        "staleAt":     None,
        "lastSeen":    datetime.now(timezone.utc).isoformat() + "Z",
    }
