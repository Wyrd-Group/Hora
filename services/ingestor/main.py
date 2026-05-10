"""
MSS Ingestor — async polling worker.
Pulls from OpenSky (ADS-B) and GDELT (OSINT), normalizes, embeds, upserts.
Publishes deltas to Redis → FastAPI WS handler fans out to aegis clients.

Never raises. Never drops data (failed_events table is the safety net).
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

import asyncpg
import httpx
import redis.asyncio as aioredis

from config import settings
from normalizers.eonet       import parse_eonet_events, EONET_URL, EONET_PARAMS
from normalizers.adsbfi      import parse_adsbfi_response, ADSBFI_URL, ADSBFI_MILITARY
from normalizers.digitraffic_ais import parse_digitraffic_response, DIGITRAFFIC_AIS_URL
from normalizers.firms       import parse_firms_csv, FIRMS_URL
from normalizers.gdelt       import normalize_gdelt
from normalizers.noaa_marine import parse_noaa_alerts, NOAA_ALERTS_URL, NOAA_PARAMS
from normalizers.swpc       import parse_swpc_flares, parse_swpc_alerts, SWPC_FLARES_URL, SWPC_ALERTS_URL
from normalizers.opensky     import normalize_opensky
from normalizers.usgs        import parse_usgs_geojson, USGS_URL, USGS_PARAMS
from normalizers.yfinance_ohlcv import (
    fetch_batch, fetch_ohlcv_async, upsert_to_db, compute_returns,
    UNIVERSE, EQUITIES, ETFS, CRYPTO, FOREX, OHLCVBar, _HAS_YF,
)

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("mss.ingestor")

# Global connections (initialized in main())
_pg:    asyncpg.Pool | None       = None
_redis: aioredis.Redis | None     = None
_http:  httpx.AsyncClient | None  = None


# ── Connection helpers ────────────────────────────────────────────────────────

def pg() -> asyncpg.Pool:
    assert _pg is not None
    return _pg


def redis() -> aioredis.Redis:
    assert _redis is not None
    return _redis


def http() -> httpx.AsyncClient:
    assert _http is not None
    return _http


# ── Safe fetch (never raises) ─────────────────────────────────────────────────

async def safe_fetch(
    url: str,
    *,
    method: str = "GET",
    params: dict | None = None,
    json_body: dict | None = None,
    auth: tuple[str, str] | None = None,
    timeout: float = 15.0,
    source_tag: str = "unknown",
) -> Any | None:
    """HTTP fetch with exponential backoff. Returns parsed JSON or None on failure."""
    backoff = 2.0
    for attempt in range(1, 6):
        try:
            kwargs: dict[str, Any] = {"timeout": timeout}
            if params:    kwargs["params"] = params
            if json_body: kwargs["json"]   = json_body
            if auth:      kwargs["auth"]   = auth

            if method == "GET":
                resp = await http().get(url, **kwargs)
            else:
                resp = await http().post(url, **kwargs)

            resp.raise_for_status()
            return resp.json()

        except Exception as exc:
            if attempt == 5:
                await _store_failed(str(exc), source_tag, url)
                return None
            log.warning("Fetch failed (attempt %d/5) %s: %s — retrying in %.0fs",
                        attempt, url, exc, backoff)
            await asyncio.sleep(backoff)
            backoff *= 2

    return None


async def _store_failed(error: str, source: str, payload: str) -> None:
    try:
        await pg().execute(
            "INSERT INTO failed_events (payload, source, error) VALUES ($1, $2, $3)",
            payload[:4096], source, error[:1024],
        )
    except Exception as store_exc:
        log.error("Could not store failed event: %s", store_exc)


# ── Embedding ─────────────────────────────────────────────────────────────────

async def embed(text: str) -> list[float] | None:
    """Get embedding from Ollama. Returns None on failure — record is still ingested."""
    try:
        data = await safe_fetch(
            settings.ollama_url + "/api/embeddings",
            method    = "POST",
            json_body = {"model": settings.ollama_embed_model, "prompt": text},
            timeout   = 10.0,
            source_tag= "ollama-embed",
        )
        if data:
            return data.get("embedding")
    except Exception:
        pass
    return None


# ── DB upsert ─────────────────────────────────────────────────────────────────

async def upsert_entity(entity: dict[str, Any]) -> str | None:
    """Upsert entity, return DB UUID or None on failure."""
    try:
        row = await pg().fetchrow(
            """
            INSERT INTO entities (uid, entity_type, callsign, lat, lon, altitude,
                                  heading, speed, affiliation, source, last_seen)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
            ON CONFLICT (uid)
            DO UPDATE SET
                lat       = EXCLUDED.lat,
                lon       = EXCLUDED.lon,
                altitude  = EXCLUDED.altitude,
                heading   = EXCLUDED.heading,
                speed     = EXCLUDED.speed,
                last_seen = now()
            RETURNING id
            """,
            entity.get("uid", ""),
            entity.get("entityType", "unknown"),
            entity.get("callsign"),
            entity.get("lat"),
            entity.get("lon"),
            entity.get("altitude"),
            entity.get("heading"),
            entity.get("speed"),
            entity.get("affiliation", "unknown"),
            entity.get("source", "MANUAL"),
        )
        if row:
            entity_id = str(row["id"])
            # Append to sightings log
            if entity.get("lat") is not None and entity.get("lon") is not None:
                await pg().execute(
                    """
                    INSERT INTO sightings (entity_id, lat, lon, altitude, heading, speed, source)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    entity_id,
                    entity["lat"], entity["lon"],
                    entity.get("altitude"),
                    entity.get("heading"),
                    entity.get("speed"),
                    entity.get("source"),
                )
            return entity_id
    except Exception as exc:
        await _store_failed(str(exc), entity.get("source", "?"), json.dumps(entity))
    return None


async def publish_entity(entity: dict[str, Any]) -> None:
    msg = json.dumps({
        "op":        "upsert",
        "entity":    entity,
        "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
    })
    try:
        await redis().publish("ws:entities", msg)
    except Exception as exc:
        log.warning("Redis publish failed: %s", exc)


# ── OpenSky ingestion ─────────────────────────────────────────────────────────

async def ingest_opensky() -> None:
    if settings.air_gap_mode:
        log.debug("AIR_GAP_MODE — skipping OpenSky")
        return

    auth = (settings.opensky_username, settings.opensky_password) \
        if settings.opensky_username else None

    data = await safe_fetch(
        "https://opensky-network.org/api/states/all",
        auth       = auth,
        timeout    = 20.0,
        source_tag = "opensky",
    )
    if not data or "states" not in data:
        return

    states = data["states"] or []
    log.info("OpenSky: received %d state vectors", len(states))

    for state in states:
        entity = normalize_opensky(state)
        if entity is None:
            continue
        entity_id = await upsert_entity(entity)
        if entity_id:
            entity["id"] = entity_id
            await publish_entity(entity)


# ── GDELT ingestion ───────────────────────────────────────────────────────────

async def ingest_gdelt() -> None:
    if settings.air_gap_mode:
        log.debug("AIR_GAP_MODE — skipping GDELT")
        return

    data = await safe_fetch(
        settings.gdelt_api_url,
        params    = {
            "query":      "military vessel aircraft",
            "mode":       "artlist",
            "maxrecords": 50,
            "format":     "json",
        },
        source_tag= "gdelt",
    )
    if not data:
        return

    articles = data.get("articles") or []
    log.info("GDELT: received %d articles", len(articles))

    for article in articles:
        report = normalize_gdelt(article)
        text   = (report.get("title") or "") + " " + (report.get("body") or "")
        vec    = await embed(text) if text.strip() else None

        vec_str = ("'[" + ",".join(str(x) for x in vec) + "]'::vector") if vec else "NULL"

        try:
            await pg().execute(
                f"""
                INSERT INTO reports (title, body, source_url, published_at, embedding, entity_ids)
                VALUES ($1, $2, $3, $4, {vec_str}, $5)
                """,
                report.get("title"),
                report.get("body"),
                report.get("sourceUrl"),
                report.get("publishedAt"),
                [],
            )
        except Exception as exc:
            await _store_failed(str(exc), "gdelt", json.dumps(report))


# ── adsb.fi ingestion (free, no auth) ─────────────────────────────────────────

async def ingest_adsbfi() -> None:
    if settings.air_gap_mode:
        return

    # Fetch Gulf region via v3 location endpoint (lat/lon/dist in URL path)
    data = await safe_fetch(
        ADSBFI_URL,
        source_tag="adsbfi",
    )
    if not data:
        return

    entities = parse_adsbfi_response(data)
    log.info("adsb.fi: received %d aircraft", len(entities))
    for entity in entities:
        entity_id = await upsert_entity(entity)
        if entity_id:
            entity["id"] = entity_id
            await publish_entity(entity)

    # Military feed (no bounds filter)
    mil_data = await safe_fetch(ADSBFI_MILITARY, source_tag="adsbfi-mil")
    if mil_data:
        mil_entities = parse_adsbfi_response(mil_data)
        log.info("adsb.fi military: received %d aircraft", len(mil_entities))
        for entity in mil_entities:
            entity["affiliation"] = "unknown"   # flag as unknown until analyzed
            entity_id = await upsert_entity(entity)
            if entity_id:
                entity["id"] = entity_id
                await publish_entity(entity)


# ── USGS Earthquake ingestion (free, no auth) ──────────────────────────────────

async def ingest_usgs() -> None:
    if settings.air_gap_mode:
        return

    from datetime import timedelta
    since = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")

    data = await safe_fetch(
        USGS_URL,
        params={**USGS_PARAMS, "starttime": since},
        source_tag="usgs",
    )
    if not data:
        return

    entities = parse_usgs_geojson(data)
    log.info("USGS: received %d seismic events", len(entities))
    for entity in entities:
        entity_id = await upsert_entity(entity)
        if entity_id:
            entity["id"] = entity_id
            await publish_entity(entity)


# ── NOAA marine weather alerts (free, no auth) ─────────────────────────────────

async def ingest_noaa() -> None:
    if settings.air_gap_mode:
        return

    data = await safe_fetch(
        NOAA_ALERTS_URL,
        params=NOAA_PARAMS,
        source_tag="noaa",
    )
    if not data:
        return

    entities = parse_noaa_alerts(data)
    log.info("NOAA: received %d marine alerts", len(entities))
    for entity in entities:
        entity_id = await upsert_entity(entity)
        if entity_id:
            entity["id"] = entity_id
            await publish_entity(entity)


# ── NASA FIRMS thermal anomalies (free, no auth for global 24h) ───────────────

async def ingest_firms() -> None:
    if settings.air_gap_mode:
        return

    # FIRMS serves CSV without auth for the global 24h file
    try:
        resp = await http().get(FIRMS_URL, timeout=20.0)
        if resp.status_code == 200:
            entities = parse_firms_csv(resp.text)
            log.info("FIRMS: received %d thermal anomalies", len(entities))
            for entity in entities:
                entity_id = await upsert_entity(entity)
                if entity_id:
                    entity["id"] = entity_id
                    await publish_entity(entity)
    except Exception as exc:
        await _store_failed(str(exc), "firms", FIRMS_URL)


# ── NASA EONET natural events (free, no auth) ─────────────────────────────────

async def ingest_eonet() -> None:
    if settings.air_gap_mode:
        return

    data = await safe_fetch(
        EONET_URL,
        params=EONET_PARAMS,
        source_tag="eonet",
    )
    if not data:
        return

    entities = parse_eonet_events(data)
    log.info("EONET: received %d natural events", len(entities))
    for entity in entities:
        entity_id = await upsert_entity(entity)
        if entity_id:
            entity["id"] = entity_id
            await publish_entity(entity)


# ── Digitraffic AIS maritime tracking (free, no auth) ─────────────────────────

async def ingest_digitraffic() -> None:
    if settings.air_gap_mode:
        return

    try:
        resp = await http().get(
            DIGITRAFFIC_AIS_URL,
            headers={"Accept-Encoding": "gzip"},
            timeout=30.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            entities = parse_digitraffic_response(data)
            log.info("Digitraffic AIS: received %d active vessels", len(entities))
            for entity in entities:
                entity_id = await upsert_entity(entity)
                if entity_id:
                    entity["id"] = entity_id
                    await publish_entity(entity)
        else:
            log.warning("Digitraffic AIS: HTTP %d", resp.status_code)
    except Exception as exc:
        await _store_failed(str(exc), "digitraffic", DIGITRAFFIC_AIS_URL)


# ── NOAA SWPC space weather (free, no auth) ───────────────────────────────────

async def ingest_swpc() -> None:
    if settings.air_gap_mode:
        return

    # Solar flares (M/X class only)
    flares_data = await safe_fetch(SWPC_FLARES_URL, source_tag="swpc-flares")
    if flares_data and isinstance(flares_data, list):
        entities = parse_swpc_flares(flares_data)
        log.info("SWPC: received %d significant solar flares", len(entities))
        for entity in entities:
            entity_id = await upsert_entity(entity)
            if entity_id:
                entity["id"] = entity_id
                await publish_entity(entity)

    # Space weather alerts (geomagnetic storms, radio blackouts)
    alerts_data = await safe_fetch(SWPC_ALERTS_URL, source_tag="swpc-alerts")
    if alerts_data and isinstance(alerts_data, list):
        entities = parse_swpc_alerts(alerts_data)
        log.info("SWPC: received %d space weather alerts", len(entities))
        for entity in entities:
            entity_id = await upsert_entity(entity)
            if entity_id:
                entity["id"] = entity_id
                await publish_entity(entity)


# ── Yahoo Finance OHLCV ingestion ────────────────────────────────────────────

async def ingest_yfinance_daily() -> None:
    """
    Fetch daily OHLCV bars for the full universe, upsert to DB,
    compute features, and publish latest prices to Redis.

    Runs every 6h (4x/day) to catch market closes across time zones:
      - US close (21:00 UTC)
      - EU close (16:30 UTC)
      - Asia close (07:00 UTC)
      - Crypto never closes, but 6h is fine granularity
    """
    if settings.air_gap_mode:
        log.debug("AIR_GAP_MODE — skipping yfinance daily")
        return

    if not _HAS_YF:
        log.warning("yfinance not installed — skipping financial data ingestion")
        return

    log.info("yfinance daily: starting batch fetch for %d symbols", len(UNIVERSE))
    t0 = time.monotonic()

    try:
        # Fetch last 5 days of daily bars (enough to catch weekends + holidays)
        results = await fetch_batch(
            UNIVERSE,
            period="5d",
            interval="1d",
            max_concurrent=settings.yfinance_max_concurrent,
            delay_between=settings.yfinance_batch_delay,
        )

        # Upsert all bars to PostgreSQL
        total_bars = 0
        latest_prices: dict[str, dict] = {}

        for symbol, bars in results.items():
            if not bars:
                continue

            await upsert_to_db(pg(), bars)
            total_bars += len(bars)

            # Track latest price per symbol for Redis publish
            latest = bars[-1]
            latest_prices[symbol] = latest.as_dict()

            # Compute and store features in alpha_features table
            features = compute_returns(bars)
            if features:
                await _upsert_alpha_features(features)

        elapsed = time.monotonic() - t0
        log.info(
            "yfinance daily: upserted %d bars across %d symbols in %.1fs",
            total_bars, len(results), elapsed,
        )

        # Publish latest prices to Redis for real-time frontend updates
        if latest_prices:
            await _publish_price_tick(latest_prices)

    except Exception as exc:
        log.error("yfinance daily batch failed: %s", exc)
        await _store_failed(str(exc), "yfinance-daily", "batch")


async def ingest_yfinance_intraday() -> None:
    """
    Fetch 5-minute intraday bars for a subset of high-liquidity symbols.
    Only runs if yfinance_intraday_enabled=True (off by default).

    Limited to top equities + crypto (always open) to avoid Yahoo rate limits.
    """
    if settings.air_gap_mode or not settings.yfinance_intraday_enabled:
        return

    if not _HAS_YF:
        return

    # Intraday subset: top 20 equities + all crypto (always open)
    intraday_symbols = EQUITIES[:20] + CRYPTO
    log.info("yfinance intraday: fetching %d symbols", len(intraday_symbols))

    try:
        results = await fetch_batch(
            intraday_symbols,
            period="1d",
            interval="5m",
            max_concurrent=settings.yfinance_max_concurrent,
            delay_between=settings.yfinance_batch_delay,
        )

        total_bars = 0
        latest_prices: dict[str, dict] = {}

        for symbol, bars in results.items():
            if not bars:
                continue
            await upsert_to_db(pg(), bars)
            total_bars += len(bars)

            latest = bars[-1]
            latest_prices[symbol] = latest.as_dict()

        log.info("yfinance intraday: upserted %d bars across %d symbols",
                 total_bars, len(results))

        if latest_prices:
            await _publish_price_tick(latest_prices)

    except Exception as exc:
        log.error("yfinance intraday failed: %s", exc)
        await _store_failed(str(exc), "yfinance-intraday", "batch")


async def _upsert_alpha_features(features: list[dict]) -> None:
    """Store computed features (log returns, gaps, volume ratios) in alpha_features table."""
    if not features:
        return

    rows = []
    for f in features:
        ts = f.get("timestamp")
        sym = f.get("symbol")
        if not ts or not sym:
            continue
        for feat_name in ("logReturn", "intradayRange", "gap", "volumeRatio"):
            val = f.get(feat_name)
            if val is not None:
                rows.append((sym, ts, feat_name, float(val)))

    if not rows:
        return

    try:
        await pg().executemany(
            """
            INSERT INTO alpha_features (symbol, ts, feature, value)
            VALUES ($1, $2::timestamptz, $3, $4)
            ON CONFLICT (symbol, ts, feature) DO UPDATE SET value = EXCLUDED.value
            """,
            rows,
        )
        log.debug("Stored %d alpha features", len(rows))
    except Exception as exc:
        log.warning("alpha_features upsert failed: %s", exc)


async def _publish_price_tick(latest_prices: dict[str, dict]) -> None:
    """Publish latest prices to Redis for WebSocket fanout to frontend."""
    msg = json.dumps({
        "op":        "priceTick",
        "prices":    latest_prices,
        "count":     len(latest_prices),
        "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
    })
    try:
        await redis().publish("ws:prices", msg)
        log.debug("Published price tick for %d symbols", len(latest_prices))
    except Exception as exc:
        log.warning("Redis price publish failed: %s", exc)


# ── Main event loop ───────────────────────────────────────────────────────────

async def main() -> None:
    global _pg, _redis, _http

    log.info("MSS Ingestor starting up")
    _pg    = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=10)
    _redis = await aioredis.from_url(settings.redis_url, decode_responses=True)
    _http  = httpx.AsyncClient(
        headers={"User-Agent": "MSS-Ingestor/0.1"},
        follow_redirects=True,
    )

    opensky_last   = 0.0
    adsbfi_last    = 0.0
    ais_last       = 0.0
    usgs_last      = 0.0
    noaa_last      = 0.0
    swpc_last      = 0.0
    firms_last     = 0.0
    eonet_last     = 0.0
    gdelt_last     = 0.0
    yf_daily_last  = 0.0
    yf_intra_last  = 0.0

    log.info("Ingestor running (air_gap=%s)", settings.air_gap_mode)

    try:
        while True:
            now = time.monotonic()
            tasks: list[asyncio.Task] = []

            # ADS-B: OpenSky + adsb.fi (every 30s)
            if now - opensky_last >= settings.poll_interval_sec:
                tasks.append(asyncio.create_task(ingest_opensky()))
                tasks.append(asyncio.create_task(ingest_adsbfi()))
                opensky_last = adsbfi_last = now

            # AIS: Digitraffic maritime vessels (every 60s)
            if now - ais_last >= 60:
                tasks.append(asyncio.create_task(ingest_digitraffic()))
                ais_last = now

            # USGS Earthquakes (every 10min)
            if now - usgs_last >= 600:
                tasks.append(asyncio.create_task(ingest_usgs()))
                usgs_last = now

            # NOAA Marine weather (every 10min)
            if now - noaa_last >= 600:
                tasks.append(asyncio.create_task(ingest_noaa()))
                noaa_last = now

            # NASA FIRMS (every 30min — large file)
            if now - firms_last >= 1800:
                tasks.append(asyncio.create_task(ingest_firms()))
                firms_last = now

            # NOAA SWPC space weather (every 30min)
            if now - swpc_last >= 1800:
                tasks.append(asyncio.create_task(ingest_swpc()))
                swpc_last = now

            # NASA EONET natural events (every 6h)
            if now - eonet_last >= 21600:
                tasks.append(asyncio.create_task(ingest_eonet()))
                eonet_last = now

            # GDELT OSINT (every 5min)
            if now - gdelt_last >= settings.gdelt_interval_sec:
                tasks.append(asyncio.create_task(ingest_gdelt()))
                gdelt_last = now

            # Yahoo Finance daily OHLCV (every 6h)
            if now - yf_daily_last >= settings.yfinance_daily_interval_sec:
                tasks.append(asyncio.create_task(ingest_yfinance_daily()))
                yf_daily_last = now

            # Yahoo Finance intraday (every 5min, off by default)
            if settings.yfinance_intraday_enabled and \
               now - yf_intra_last >= settings.yfinance_intraday_interval_sec:
                tasks.append(asyncio.create_task(ingest_yfinance_intraday()))
                yf_intra_last = now

            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

            await asyncio.sleep(5)

    except asyncio.CancelledError:
        log.info("Ingestor cancelled — shutting down")
    finally:
        await _pg.close()
        await _redis.aclose()
        await _http.aclose()


if __name__ == "__main__":
    asyncio.run(main())
