"""
NOAA Space Weather Prediction Center (SWPC) normalizer.
Free, no key required.

Endpoints:
  Solar flares:     https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json
  Space weather alerts: https://services.swpc.noaa.gov/products/alerts.json
  Kp index:         https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
  Solar wind:       https://services.swpc.noaa.gov/products/solar-wind/plasma-5-minute.json

Ingests geomagnetic storms and solar flares as events — relevant for
satellite disruption, GPS degradation, and comms blackout scenarios.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

SWPC_FLARES_URL = "https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json"
SWPC_ALERTS_URL = "https://services.swpc.noaa.gov/products/alerts.json"
SWPC_KP_URL     = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"

# Solar flare class → severity
FLARE_SEVERITY = {
    "X": "critical",
    "M": "warning",
    "C": "info",
    "B": "info",
    "A": "info",
}


def normalize_solar_flare(flare: dict[str, Any]) -> dict[str, Any] | None:
    """Parse a GOES X-ray flare event."""
    max_class = flare.get("max_class") or flare.get("current_class", "")
    if not max_class:
        return None

    flare_letter = max_class[0].upper() if max_class else "B"
    severity = FLARE_SEVERITY.get(flare_letter, "info")

    # Solar flares don't have earth coordinates — place at 0,0 (symbolic)
    # or use a position representing the sub-solar point
    ts = flare.get("max_time") or flare.get("begin_time") or flare.get("time_tag")
    if not ts:
        ts = datetime.now(timezone.utc).isoformat() + "Z"

    uid = f"SWPC-FLARE-{max_class}-{ts[:16]}"

    return {
        "uid":         uid.replace(":", "").replace(" ", ""),
        "entityType":  "event",
        "callsign":    f"FLARE-{max_class}",
        "lat":         0.0,    # Sub-solar point (symbolic)
        "lon":         0.0,
        "altitude":    None,
        "heading":     None,
        "speed":       None,
        "affiliation": "neutral",
        "source":      "OSINT",
        "staleAt":     None,
        "lastSeen":    ts,
        "raw": {
            "class":     max_class,
            "severity":  severity,
            "beginTime": flare.get("begin_time"),
            "maxTime":   flare.get("max_time"),
            "satellite": flare.get("satellite"),
        },
    }


def parse_swpc_flares(data: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Parse SWPC solar flare list — only M and X class (significant)."""
    entities = []
    for flare in (data or []):
        max_class = flare.get("max_class", "")
        if max_class and max_class[0].upper() in ("M", "X"):
            e = normalize_solar_flare(flare)
            if e:
                entities.append(e)
    return entities


def parse_swpc_alerts(data: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Parse SWPC space weather alerts into event entities."""
    entities = []
    for alert in (data or [])[:20]:  # Latest 20
        msg = alert.get("message", "")
        product_id = alert.get("product_id", "")
        issue_dt = alert.get("issue_datetime", "")

        # Extract key info from message
        if "Geomagnetic Storm" in msg:
            severity = "warning"
            if "G3" in msg or "G4" in msg or "G5" in msg:
                severity = "critical"
            label = "GEOMAG-STORM"
        elif "Solar Radiation" in msg:
            severity = "warning"
            label = "SOLAR-RAD"
        elif "Radio Blackout" in msg:
            severity = "warning"
            label = "RADIO-BLKOUT"
        else:
            continue  # Skip non-critical alerts

        uid = f"SWPC-{product_id}-{issue_dt[:13]}".replace(" ", "")

        entities.append({
            "uid":         uid,
            "entityType":  "event",
            "callsign":    label,
            "lat":         0.0,
            "lon":         0.0,
            "altitude":    None,
            "heading":     None,
            "speed":       None,
            "affiliation": "neutral",
            "source":      "OSINT",
            "staleAt":     None,
            "lastSeen":    issue_dt + "Z" if issue_dt else datetime.now(timezone.utc).isoformat() + "Z",
            "raw": {
                "productId": product_id,
                "severity":  severity,
                "message":   msg[:500],
            },
        })

    return entities
