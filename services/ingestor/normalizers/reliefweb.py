"""
UN OCHA ReliefWeb API normalizer.
Free, no key required (just an appname parameter).

Endpoint: https://api.reliefweb.int/v1/disasters
Returns crisis/conflict events with country-level geolocation.

Also: https://api.reliefweb.int/v1/reports for OSINT reports.
Rate limit: 1000 calls/day.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

RELIEFWEB_DISASTERS_URL = "https://api.reliefweb.int/v1/disasters"
RELIEFWEB_REPORTS_URL   = "https://api.reliefweb.int/v1/reports"

RELIEFWEB_DISASTER_PARAMS = {
    "appname":  "mss-aegis",
    "limit":    50,
    "preset":   "latest",
    "fields[include][]": "name,date,country,type,glide,status",
}

RELIEFWEB_REPORT_PARAMS = {
    "appname":  "mss-aegis",
    "limit":    30,
    "preset":   "latest",
    "query[value]": "conflict OR military OR attack OR explosion OR armed",
    "fields[include][]": "title,body,country,date,source,url",
}

# Disaster type → affiliation mapping
TYPE_AFFILIATION = {
    "Complex Emergency":  "hostile",
    "Epidemic":           "neutral",
    "Flood":              "neutral",
    "Earthquake":         "neutral",
    "Volcano":            "neutral",
    "Cyclone":            "neutral",
    "Drought":            "neutral",
    "Storm":              "neutral",
    "Fire":               "neutral",
    "Insect Infestation": "neutral",
    "Technological Disaster": "unknown",
}

# Approximate country centroids for placing on map (subset for Gulf AOI + key regions)
COUNTRY_CENTROIDS: dict[str, tuple[float, float]] = {
    "United Arab Emirates": (24.45, 54.40),
    "Saudi Arabia":         (24.71, 46.68),
    "Iran":                 (32.43, 53.69),
    "Iraq":                 (33.22, 43.68),
    "Yemen":                (15.55, 48.52),
    "Oman":                 (21.47, 55.98),
    "Qatar":                (25.35, 51.18),
    "Bahrain":              (26.07, 50.55),
    "Kuwait":               (29.31, 47.48),
    "Syria":                (34.80, 38.99),
    "Lebanon":              (33.85, 35.86),
    "Jordan":               (30.59, 36.24),
    "Israel":               (31.05, 34.85),
    "Palestine":            (31.95, 35.23),
    "Egypt":                (26.82, 30.80),
    "Libya":                (26.34, 17.23),
    "Sudan":                (12.86, 30.22),
    "Somalia":              (5.15, 46.20),
    "Ethiopia":             (9.15, 40.49),
    "Afghanistan":          (33.94, 67.71),
    "Pakistan":             (30.38, 69.35),
    "Ukraine":              (48.38, 31.17),
    "Russia":               (61.52, 105.32),
    "Turkey":               (38.96, 35.24),
    "Myanmar":              (21.91, 95.96),
    "Democratic Republic of the Congo": (-4.04, 21.76),
    "Nigeria":              (9.08, 8.68),
    "Mali":                 (17.57, -4.00),
    "Mozambique":           (-18.67, 35.53),
}


def normalize_reliefweb_disaster(item: dict[str, Any]) -> dict[str, Any] | None:
    """Parse a single ReliefWeb disaster item."""
    fields = item.get("fields", {})
    name   = fields.get("name", "Unknown disaster")

    # Get country for geolocation
    countries = fields.get("country", [])
    if not countries:
        return None

    country_name = countries[0].get("name", "") if isinstance(countries[0], dict) else str(countries[0])
    coords = COUNTRY_CENTROIDS.get(country_name)
    if not coords:
        return None  # Can't place on map without known centroid

    lat, lon = coords

    # Get disaster type
    types = fields.get("type", [])
    dtype = types[0].get("name", "Unknown") if types and isinstance(types[0], dict) else "Unknown"
    affiliation = TYPE_AFFILIATION.get(dtype, "unknown")

    # Date
    date_info = fields.get("date", {})
    created = date_info.get("created") if isinstance(date_info, dict) else None
    ts = created if created else datetime.now(timezone.utc).isoformat() + "Z"

    disaster_id = str(item.get("id", ""))
    glide = fields.get("glide", "")

    return {
        "uid":         f"RW-{disaster_id}" if disaster_id else f"RW-{lat:.2f}-{lon:.2f}",
        "entityType":  "event",
        "callsign":    f"RW-{dtype[:8].upper()}",
        "lat":         lat,
        "lon":         lon,
        "altitude":    None,
        "heading":     None,
        "speed":       None,
        "affiliation": affiliation,
        "source":      "OSINT",
        "staleAt":     None,
        "lastSeen":    ts,
        "raw": {
            "name":     name,
            "type":     dtype,
            "country":  country_name,
            "glide":    glide,
            "status":   fields.get("status", ""),
        },
    }


def parse_reliefweb_disasters(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Parse ReliefWeb disasters API response."""
    items    = data.get("data", []) or []
    entities = []
    for item in items:
        e = normalize_reliefweb_disaster(item)
        if e:
            entities.append(e)
    return entities


def normalize_reliefweb_report(item: dict[str, Any]) -> dict[str, Any]:
    """Parse a ReliefWeb report into an OsintReport-shaped dict for the reports table."""
    fields = item.get("fields", {})
    date_info = fields.get("date", {})
    created = date_info.get("created") if isinstance(date_info, dict) else None

    source_list = fields.get("source", [])
    source_name = source_list[0].get("name", "") if source_list and isinstance(source_list[0], dict) else ""

    return {
        "title":       fields.get("title"),
        "body":        (fields.get("body") or fields.get("title", ""))[:2000],
        "sourceUrl":   fields.get("url", {}).get("url") if isinstance(fields.get("url"), dict) else None,
        "publishedAt": created,
        "entityIds":   [],
    }


def parse_reliefweb_reports(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Parse ReliefWeb reports API response."""
    items   = data.get("data", []) or []
    reports = []
    for item in items:
        r = normalize_reliefweb_report(item)
        if r.get("title"):
            reports.append(r)
    return reports
