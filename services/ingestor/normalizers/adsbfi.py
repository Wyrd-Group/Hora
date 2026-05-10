"""
adsb.fi — free, no-auth ADS-B aggregator.
Maintained by the community; better global coverage than OpenSky free tier.

Endpoints (opendata v2/v3 — old v1 is dead):
  By location (v3):
    GET https://opendata.adsb.fi/api/v3/lat/{lat}/lon/{lon}/dist/{dist_nm}
  By hex:
    GET https://opendata.adsb.fi/api/v2/hex/{hex}
  By callsign:
    GET https://opendata.adsb.fi/api/v2/callsign/{callsign}
  By squawk:
    GET https://opendata.adsb.fi/api/v2/sqk/{squawk}
  By registration:
    GET https://opendata.adsb.fi/api/v2/registration/{reg}

Squawk codes of interest:
  7500 — hijack
  7600 — comms failure
  7700 — emergency
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

ADSBFI_URL      = "https://opendata.adsb.fi/api/v3/lat/26.0/lon/53.5/dist/250"  # Gulf AOI
ADSBFI_MILITARY = "https://opendata.adsb.fi/api/v2/mil"   # military aircraft only

# Squawk codes that indicate an emergency or special status
EMERGENCY_SQUAWKS = {
    "7500": ("HIJACK",        "hostile"),
    "7600": ("COMMS_FAILURE", "unknown"),
    "7700": ("EMERGENCY",     "unknown"),
}


def normalize_adsbfi(ac: dict[str, Any]) -> dict[str, Any] | None:
    """
    Normalize a single aircraft object from adsb.fi response.

    adsb.fi fields (partial): hex, flight, lat, lon, alt_baro, alt_geom,
      gs (ground speed kts), track, baro_rate, squawk, emergency,
      category, t (type), r (registration), mil (military bool), seen
    """
    lat = ac.get("lat")
    lon = ac.get("lon")
    if lat is None or lon is None:
        return None

    icao24   = ac.get("hex", "").upper()
    callsign = (ac.get("flight") or "").strip() or None
    squawk   = ac.get("squawk", "")
    is_mil   = bool(ac.get("mil", False))

    # Determine affiliation
    if squawk in ("7500",):
        affiliation = "hostile"
    elif is_mil:
        affiliation = "unknown"   # Military → unknown until identified
    else:
        affiliation = "neutral"

    # Emergency callsign override
    emg_label, emg_affil = EMERGENCY_SQUAWKS.get(squawk, (None, None))
    if emg_label and callsign:
        callsign = f"{callsign}[{emg_label}]"
    if emg_affil:
        affiliation = emg_affil

    alt = ac.get("alt_geom") or ac.get("alt_baro")
    # alt in feet → metres
    alt_m = float(alt) * 0.3048 if alt is not None else None

    seen = ac.get("seen", 0)  # seconds since last message
    try:
        from datetime import timedelta
        ts = datetime.now(timezone.utc) - timedelta(seconds=float(seen))
        last_seen = ts.isoformat() + "Z"
    except Exception:
        last_seen = datetime.now(timezone.utc).isoformat() + "Z"

    return {
        "uid":         icao24 or f"ADSBFI-{lat:.4f}-{lon:.4f}",
        "entityType":  "aircraft",
        "callsign":    callsign,
        "lat":         float(lat),
        "lon":         float(lon),
        "altitude":    alt_m,
        "heading":     float(ac["track"]) if ac.get("track") is not None else None,
        "speed":       float(ac["gs"])    if ac.get("gs")    is not None else None,
        "affiliation": affiliation,
        "source":      "ADS-B",
        "staleAt":     None,
        "lastSeen":    last_seen,
        "raw": {
            "squawk":       squawk,
            "registration": ac.get("r"),
            "category":     ac.get("category"),
            "military":     is_mil,
            "type":         ac.get("t"),
            "emergency":    ac.get("emergency"),
        },
    }


def parse_adsbfi_response(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Parse adsb.fi opendata v2/v3 response → list of MSSEntity-shaped dicts."""
    # v2/v3 uses 'ac' key; fall back to 'aircraft' for compatibility
    aircraft = data.get("ac") or data.get("aircraft") or []
    entities = []
    for ac in aircraft:
        e = normalize_adsbfi(ac)
        if e:
            entities.append(e)
    return entities
