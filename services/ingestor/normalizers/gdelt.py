"""
GDELT v2 DOC API normalizer.
Supports two output modes:
  - normalize_gdelt()  → OsintReport-shaped dict (original)
  - parse_gdelt_artlist() → list of MSSEntity-shaped event dicts for the map
"""
from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

GDELT_DOC_URL = "https://api.gdeltproject.org/api/v2/doc/doc"

# CAMEO root codes → affiliation classification
_HOSTILE_CAMEO = {"17", "18", "19", "20"}  # Coerce, Assault, Fight, Mass Violence
_NEUTRAL_CAMEO = {"13", "14", "15"}         # Threaten, Protest, Military posture

# Rough country centroids — GDELT uses FIPS-like 2-char codes
_CENTROIDS: dict[str, tuple[float, float]] = {
    "IR": (32.0, 53.0), "IZ": (33.0, 44.0), "RS": (61.0, 100.0),
    "CH": (35.0, 105.0), "KN": (40.0, 127.0), "SY": (35.0, 38.0),
    "YM": (15.5, 48.0), "LY": (27.0, 17.0), "SU": (15.0, 30.0),
    "BM": (19.0, 96.0), "ET": (9.0, 40.0), "ML": (17.0, -4.0),
    "NI": (10.0, 8.0), "SA": (23.5, 46.0), "IS": (31.5, 35.0),
    "LE": (33.5, 35.5), "PK": (30.0, 69.0), "AF": (33.0, 65.0),
    "UA": (49.0, 32.0), "UP": (49.0, 32.0), "US": (38.0, -97.0),
    "UK": (55.0, -3.0), "FR": (46.0, 2.0), "GM": (51.0, 10.0),
    "TU": (39.0, 35.0), "JA": (36.0, 138.0), "IN": (20.0, 77.0),
    "RP": (12.0, 122.0),  # Philippines
}


def _parse_gdelt_date(s: str | None) -> str | None:
    """Parse GDELT seendate format: 20260331T120000Z → ISO8601."""
    if not s:
        return None
    try:
        dt = datetime.strptime(s, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
        return dt.isoformat() + "Z"
    except ValueError:
        return s


def normalize_gdelt(article: dict[str, Any]) -> dict[str, Any]:
    """Original OsintReport-shaped output."""
    return {
        "title":       article.get("title"),
        "body":        article.get("title"),   # GDELT v2 DOC has no full body in free tier
        "sourceUrl":   article.get("url"),
        "publishedAt": _parse_gdelt_date(article.get("seendate")),
        "entityIds":   [],
    }


def parse_gdelt_artlist(data: dict) -> list[dict[str, Any]]:
    """
    Parse GDELT artlist response into map-ready MSSEntity event dicts.
    Each article becomes an 'event' entity placed at the source country centroid.
    """
    articles = data.get("articles", [])
    entities: list[dict[str, Any]] = []

    for art in articles:
        url    = art.get("url", "")
        title  = art.get("title", "")
        seen   = art.get("seendate", "")
        country = (art.get("sourcecountry") or "").upper()
        tone    = float(art.get("tone") or 0.0)
        domain  = art.get("domain", "GDELT")

        centroid = _CENTROIDS.get(country)
        if not centroid:
            continue

        lat = centroid[0] + random.uniform(-0.8, 0.8)
        lon = centroid[1] + random.uniform(-0.8, 0.8)

        ts = _parse_gdelt_date(seen) or datetime.now(timezone.utc).isoformat() + "Z"

        # Tone < -5 → hostile event; neutral otherwise
        affiliation = "hostile" if tone < -5 else ("neutral" if abs(tone) < 3 else "unknown")

        uid = f"GDELT-{uuid.uuid5(uuid.NAMESPACE_URL, url).hex[:12].upper()}"

        entities.append({
            "id":          str(uuid.uuid4()),
            "uid":         uid,
            "entityType":  "event",
            "callsign":    title[:45] if title else domain,
            "lat":         round(lat, 4),
            "lon":         round(lon, 4),
            "altitude":    0.0,
            "heading":     0.0,
            "speed":       0.0,
            "affiliation": affiliation,
            "source":      "OSINT",
            "lastSeen":    ts,
            "staleAt":     None,
            "raw": {
                "url":    url,
                "title":  title,
                "tone":   tone,
                "domain": domain,
                "country": country,
            },
        })

    return entities


def build_conflict_query(region: str = "Gulf") -> str:
    """Return a GDELT DOC API query string for a region of interest."""
    queries = {
        "Gulf":    "(Iran OR IRGC OR Hormuz OR Yemen OR Houthi) sourcelang:English",
        "EastAsia":"(China OR Taiwan OR DPRK OR SouthChinaSea) sourcelang:English",
        "Europe":  "(Ukraine OR Russia OR NATO OR Donbas) sourcelang:English",
        "Africa":  "(Mali OR Sudan OR Ethiopia OR Sahel OR Wagner) sourcelang:English",
        "Global":  "(military attack OR armed conflict OR missile OR naval) sourcelang:English",
    }
    return queries.get(region, queries["Global"])


def gdelt_params(query: str, hours_back: int = 4, max_records: int = 75) -> dict:
    """Build GDELT DOC API request params."""
    now   = datetime.now(timezone.utc)
    start = (now - timedelta(hours=hours_back)).strftime("%Y%m%d%H%M%S")
    end   = now.strftime("%Y%m%d%H%M%S")
    return {
        "query":         query,
        "mode":          "artlist",
        "maxrecords":    max_records,
        "format":        "json",
        "startdatetime": start,
        "enddatetime":   end,
        "sort":          "DateDesc",
    }
