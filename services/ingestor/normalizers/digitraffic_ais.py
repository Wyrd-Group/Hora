"""
Finnish Transport Agency Digitraffic — free AIS vessel tracking.
No authentication required. GeoJSON FeatureCollection response.
Requires Accept-Encoding: gzip header.

Endpoint: https://meri.digitraffic.fi/api/ais/v1/locations
Returns: ALL vessel positions as GeoJSON (18,000+ ships).

Also available:
  Single vessel by MMSI:
    GET https://meri.digitraffic.fi/api/ais/v1/locations?mmsi={mmsi}
  Vessel metadata:
    GET https://meri.digitraffic.fi/api/ais/v1/vessels?mmsi={mmsi}

Coverage: Baltic Sea, North Sea, Gulf of Finland, North Atlantic corridors.

Note: This is government open data from Finland. Fair use — don't poll
more than once every 60 seconds.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

DIGITRAFFIC_AIS_URL = "https://meri.digitraffic.fi/api/ais/v1/locations"

# Navigation status codes (ITU-R M.1371)
NAV_STATUS = {
    0: "underway_engine",
    1: "at_anchor",
    2: "not_under_command",
    3: "restricted_manoeuvrability",
    4: "constrained_by_draught",
    5: "moored",
    6: "aground",
    7: "fishing",
    8: "underway_sailing",
    14: "ais_sart",
    15: "undefined",
}


def normalize_digitraffic_vessel(feature: dict[str, Any]) -> dict[str, Any] | None:
    """Parse a single AIS GeoJSON Feature from Digitraffic."""
    geom  = feature.get("geometry")
    props = feature.get("properties", {})

    if not geom or geom.get("type") != "Point":
        return None

    coords = geom.get("coordinates", [])
    if len(coords) < 2:
        return None

    lon, lat = float(coords[0]), float(coords[1])
    mmsi     = feature.get("mmsi") or props.get("mmsi")

    if mmsi is None or lat == 0 or lon == 0:
        return None

    sog     = props.get("sog")        # Speed over ground (1/10 knots)
    cog     = props.get("cog")        # Course over ground (1/10 degrees)
    heading = props.get("heading")
    nav_stat = props.get("navStat", 15)

    # Convert SOG from 1/10 knots to knots
    speed_kts = float(sog) / 10.0 if sog is not None else None
    course    = float(cog) / 10.0 if cog is not None else None
    hdg       = float(heading) if heading is not None and heading != 511 else course

    # Skip stationary vessels (anchored/moored with 0 speed) to reduce noise
    if nav_stat in (1, 5) and (speed_kts is None or speed_kts < 0.2):
        return None

    nav_label = NAV_STATUS.get(nav_stat, "unknown")
    callsign  = f"MMSI-{mmsi}"

    return {
        "uid":         f"AIS-{mmsi}",
        "entityType":  "vessel",
        "callsign":    callsign,
        "lat":         lat,
        "lon":         lon,
        "altitude":    None,
        "heading":     hdg,
        "speed":       speed_kts,
        "affiliation": "neutral",
        "source":      "AIS",
        "staleAt":     None,
        "lastSeen":    datetime.now(timezone.utc).isoformat() + "Z",
        "raw": {
            "mmsi":      mmsi,
            "sog":       speed_kts,
            "cog":       course,
            "navStatus": nav_label,
            "posAcc":    props.get("posAcc"),
        },
    }


def parse_digitraffic_response(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Parse Digitraffic AIS GeoJSON FeatureCollection."""
    features = data.get("features", []) or []
    entities = []
    for f in features:
        e = normalize_digitraffic_vessel(f)
        if e:
            entities.append(e)
    return entities
