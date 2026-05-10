#!/usr/bin/env python3
"""
MSS synthetic data seeder.
Populates PostgreSQL with simulated entities and runs a movement loop,
publishing live updates to Redis so connected aegis clients receive real-time data.

Usage:
  python scripts/seed_simdata.py --aoi gulf --count 50 --interval 2

AOI presets: gulf, med, taiwan_strait, baltics, south_china_sea
"""
from __future__ import annotations

import argparse
import asyncio
import json
import math
import random
import uuid
from datetime import datetime, timezone
from typing import Any

# ── AOI presets ───────────────────────────────────────────────────────────────

AOI_PRESETS: dict[str, dict[str, tuple[float, float]]] = {
    "gulf":            {"lat": (24.0, 28.0),  "lon": (50.0, 57.0)},
    "med":             {"lat": (30.0, 44.0),  "lon": (-5.0, 36.0)},
    "taiwan_strait":   {"lat": (22.0, 26.0),  "lon": (119.0, 122.5)},
    "baltics":         {"lat": (54.0, 60.0),  "lon": (14.0, 28.0)},
    "south_china_sea": {"lat": (5.0,  22.0),  "lon": (105.0, 120.0)},
}

ENTITY_TEMPLATES: list[dict[str, Any]] = [
    {"type": "vessel",   "source": "AIS",   "affiliation": "neutral",  "speed_range": (5, 18),    "altitude": 0.0},
    {"type": "vessel",   "source": "AIS",   "affiliation": "unknown",  "speed_range": (0, 8),     "altitude": 0.0},
    {"type": "aircraft", "source": "ADS-B", "affiliation": "friendly", "speed_range": (250, 480), "altitude": None},
    {"type": "aircraft", "source": "ADS-B", "affiliation": "unknown",  "speed_range": (180, 350), "altitude": None},
    {"type": "ground",   "source": "CoT",   "affiliation": "friendly", "speed_range": (0, 25),    "altitude": 0.0},
    {"type": "ground",   "source": "CoT",   "affiliation": "hostile",  "speed_range": (0, 40),    "altitude": 0.0},
]

CALLSIGN_PREFIXES: dict[str, str] = {
    "vessel":   "MV",
    "aircraft": "FL",
    "ground":   "GND",
}


# ── Entity generation ─────────────────────────────────────────────────────────

def generate_entity(aoi: dict[str, tuple[float, float]]) -> dict[str, Any]:
    tmpl     = random.choice(ENTITY_TEMPLATES)
    speed    = random.uniform(*tmpl["speed_range"])
    heading  = random.uniform(0, 360)
    prefix   = CALLSIGN_PREFIXES[tmpl["type"]]
    callsign = f"{prefix}-{random.randint(100, 999)}"
    altitude = (
        random.uniform(1000, 35000)
        if tmpl["type"] == "aircraft"
        else tmpl["altitude"]
    )

    return {
        "id":          str(uuid.uuid4()),
        "uid":         f"SIM-{uuid.uuid4().hex[:8].upper()}",
        "entityType":  tmpl["type"],
        "callsign":    callsign,
        "lat":         random.uniform(*aoi["lat"]),
        "lon":         random.uniform(*aoi["lon"]),
        "altitude":    altitude,
        "heading":     heading,
        "speed":       round(speed, 2),
        "affiliation": tmpl["affiliation"],
        "source":      tmpl["source"],
        "staleAt":     None,
        "lastSeen":    _now(),
    }


def move_entity(entity: dict[str, Any], dt_sec: float) -> dict[str, Any]:
    """Advance entity position along its current heading (great-circle approx)."""
    speed_kts  = entity["speed"]
    dist_nm    = speed_kts * (dt_sec / 3600.0)
    dist_deg   = dist_nm / 60.0
    lat_rad    = math.radians(entity["lat"])
    heading_r  = math.radians(entity["heading"])

    entity["lat"] += dist_deg * math.cos(heading_r)
    entity["lon"] += dist_deg * math.sin(heading_r) / max(math.cos(lat_rad), 1e-9)

    # Slight heading drift
    entity["heading"] = (entity["heading"] + random.uniform(-3, 3)) % 360
    entity["lastSeen"] = _now()
    return entity


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── DB + Redis loop ───────────────────────────────────────────────────────────

async def run(aoi_name: str, count: int, interval: float) -> None:
    try:
        import asyncpg
        import redis.asyncio as aioredis
        from dotenv import load_dotenv
        import os
    except ImportError as exc:
        print(f"Missing dependency: {exc}")
        print("Install: pip install asyncpg redis python-dotenv")
        return

    load_dotenv()
    db_url    = os.environ.get("DATABASE_URL", "postgresql://mss:mssdev@localhost:5432/mss")
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")

    pg    = await asyncpg.connect(db_url)
    redis = await aioredis.from_url(redis_url, decode_responses=True)

    aoi      = AOI_PRESETS[aoi_name]
    entities = [generate_entity(aoi) for _ in range(count)]

    print(f"Seeding {count} entities in AOI={aoi_name}...")
    for e in entities:
        await pg.execute(
            """
            INSERT INTO entities (id, uid, entity_type, callsign, lat, lon, altitude,
                                  heading, speed, affiliation, source, last_seen)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
            ON CONFLICT (uid) DO NOTHING
            """,
            e["id"], e["uid"], e["entityType"], e["callsign"],
            e["lat"], e["lon"], e["altitude"], e["heading"], e["speed"],
            e["affiliation"], e["source"],
        )

    print(f"Seeded. Running movement loop (interval={interval}s). Ctrl+C to stop.")

    try:
        while True:
            await asyncio.sleep(interval)
            for e in entities:
                move_entity(e, interval)
                msg = json.dumps({
                    "op":        "upsert",
                    "entity":    e,
                    "timestamp": _now(),
                })
                await redis.publish("ws:entities", msg)
            print(f"  → pushed {len(entities)} entity updates", end="\r", flush=True)
    except asyncio.CancelledError:
        pass
    finally:
        print("\nShutting down seeder.")
        await pg.close()
        await redis.aclose()


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MSS synthetic data seeder")
    parser.add_argument("--aoi",      default="gulf",
                        choices=list(AOI_PRESETS.keys()),
                        help="Area of interest preset")
    parser.add_argument("--count",    type=int,   default=50,
                        help="Number of synthetic entities to generate")
    parser.add_argument("--interval", type=float, default=2.0,
                        help="Movement update interval in seconds")
    args = parser.parse_args()

    asyncio.run(run(args.aoi, args.count, args.interval))
