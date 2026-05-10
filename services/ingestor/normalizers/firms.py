"""
NASA FIRMS (Fire Information for Resource Management) normalizer.
Free API — no key required for CSV download of last 24h.

Source: https://firms.modaps.eosdis.nasa.gov/api/
Endpoints used (no key needed for world data):
  VIIRS I-Band 375m, last 24h:
  https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/
    SUOMI_VIIRS_C2_Global_24h.csv

  With MAP_KEY (free registration at https://firms.modaps.eosdis.nasa.gov/api/):
  https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/VIIRS_SNPP_NRT/{bbox}/{days}

Output:
  Thermal anomalies/wildfires ingested as MSSEntity type='event',
  source='OSINT', affiliation='neutral'. High FRP = higher "threat".
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Any


FIRMS_URL = (
    "https://firms.modaps.eosdis.nasa.gov/data/active_fire/"
    "suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv"
)

# With API key: higher resolution, on-demand query
FIRMS_API_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/VIIRS_SNPP_NRT/{bbox}/1"


def normalize_firms_row(row: dict[str, str]) -> dict[str, Any] | None:
    """
    Parse a single CSV row from FIRMS VIIRS NRT feed.

    CSV columns: latitude, longitude, bright_ti4, scan, track, acq_date, acq_time,
                 satellite, instrument, confidence, version, bright_ti5, frp, daynight
    """
    try:
        lat = float(row.get("latitude", "NaN"))
        lon = float(row.get("longitude", "NaN"))
    except (ValueError, TypeError):
        return None

    if lat != lat or lon != lon:   # NaN check
        return None

    frp        = row.get("frp", "0")         # Fire Radiative Power (MW)
    confidence = row.get("confidence", "n")  # l/n/h or 0-100
    acq_date   = row.get("acq_date", "")
    acq_time   = row.get("acq_time", "")
    daynight   = row.get("daynight", "D")

    # Build a stable UID from position + acquisition time
    uid = f"FIRMS-{lat:.3f}-{lon:.3f}-{acq_date}{acq_time}"
    uid = uid.replace(".", "").replace("-", "")[:32]

    try:
        frp_val = float(frp)
    except (ValueError, TypeError):
        frp_val = 0.0

    # Map FRP to a rough "speed" proxy (unusual usage but keeps entity schema)
    # High FRP (>500MW) = critical wildfire or industrial fire
    label = _frp_label(frp_val)

    return {
        "uid":         uid,
        "entityType":  "event",
        "callsign":    f"FIRE-{label}",
        "lat":         lat,
        "lon":         lon,
        "altitude":    None,
        "heading":     None,
        "speed":       frp_val,           # FRP in MW (repurposed field)
        "affiliation": "neutral",
        "source":      "OSINT",
        "staleAt":     None,
        "lastSeen":    _acq_to_iso(acq_date, acq_time),
        "raw": {
            "frp":        frp_val,
            "confidence": confidence,
            "daynight":   daynight,
            "satellite":  row.get("satellite", "S-NPP"),
        },
    }


def parse_firms_csv(csv_text: str) -> list[dict[str, Any]]:
    """Parse full FIRMS CSV text, return list of normalized entities."""
    entities = []
    try:
        reader = csv.DictReader(io.StringIO(csv_text))
        for row in reader:
            e = normalize_firms_row(row)
            if e:
                entities.append(e)
    except Exception:
        pass
    return entities


def _frp_label(frp: float) -> str:
    if frp >= 1000: return "EXTREME"
    if frp >= 500:  return "CRITICAL"
    if frp >= 100:  return "HIGH"
    if frp >= 20:   return "MEDIUM"
    return "LOW"


def _acq_to_iso(acq_date: str, acq_time: str) -> str:
    """Convert FIRMS acq_date (YYYY-MM-DD) + acq_time (HHMM) to ISO."""
    try:
        t = datetime.strptime(f"{acq_date} {acq_time:0>4}", "%Y-%m-%d %H%M")
        return t.replace(tzinfo=timezone.utc).isoformat() + "Z"
    except Exception:
        return datetime.now(timezone.utc).isoformat() + "Z"
