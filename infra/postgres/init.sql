-- MSS PostgreSQL initialization
-- Extensions: pgvector (semantic search) + Apache AGE (graph)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS age;
CREATE EXTENSION IF NOT EXISTS postgis;
LOAD 'age';

-- ── Core entity table ──────────────────────────────────────────────────────────
CREATE TABLE entities (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid          TEXT UNIQUE NOT NULL,        -- CoT uid / ICAO / MMSI
    entity_type  TEXT NOT NULL,               -- 'vessel' | 'aircraft' | 'ground' | 'person' | 'location' | 'event'
    callsign     TEXT,
    lat          DOUBLE PRECISION,
    lon          DOUBLE PRECISION,
    altitude     DOUBLE PRECISION,
    heading      DOUBLE PRECISION,
    speed        DOUBLE PRECISION,
    affiliation  TEXT DEFAULT 'unknown',      -- MIL-STD-2525: 'friendly' | 'hostile' | 'neutral' | 'unknown'
    source       TEXT NOT NULL,               -- 'ADS-B' | 'AIS' | 'CoT' | 'OSINT' | 'MANUAL'
    raw          JSONB,
    embedding    vector(1536),
    stale_at     TIMESTAMPTZ,
    last_seen    TIMESTAMPTZ DEFAULT now(),
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── Append-only sighting log (feeds ticker + track history) ───────────────────
CREATE TABLE sightings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id    UUID REFERENCES entities(id) ON DELETE CASCADE,
    lat          DOUBLE PRECISION NOT NULL,
    lon          DOUBLE PRECISION NOT NULL,
    altitude     DOUBLE PRECISION,
    heading      DOUBLE PRECISION,
    speed        DOUBLE PRECISION,
    observed_at  TIMESTAMPTZ DEFAULT now(),
    source       TEXT,
    confidence   FLOAT DEFAULT 1.0
);

-- ── OSINT reports (free text, vectorized for similarity search) ───────────────
CREATE TABLE reports (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        TEXT,
    body         TEXT,
    source_url   TEXT,
    published_at TIMESTAMPTZ,
    embedding    vector(1536),
    entity_ids   UUID[]
);

-- ── Failed ingestion queue (never drop data) ──────────────────────────────────
CREATE TABLE failed_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payload      TEXT NOT NULL,
    source       TEXT,
    error        TEXT,
    created_at   TIMESTAMPTZ DEFAULT now(),
    retry_count  INT DEFAULT 0
);

-- ── Indices ───────────────────────────────────────────────────────────────────
CREATE INDEX ON entities USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON reports   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON entities (last_seen DESC);
CREATE INDEX ON entities (affiliation);
CREATE INDEX ON entities (source);
CREATE INDEX ON entities (entity_type);
CREATE INDEX ON sightings (entity_id, observed_at DESC);

-- ── Apache AGE graph ──────────────────────────────────────────────────────────
SELECT ag_catalog.create_graph('mss_graph');

-- ── Trigger: mirror every entity upsert into the AGE graph as a vertex ────────
CREATE OR REPLACE FUNCTION sync_entity_to_graph() RETURNS TRIGGER AS $func$
BEGIN
    EXECUTE 'SELECT * FROM ag_catalog.cypher(''mss_graph'', $$' 
         || 'MERGE (e:Entity {uid: "' || NEW.uid || '"}) '
         || 'SET e.type = "' || NEW.entity_type || '", '
         || 'e.callsign = "' || COALESCE(NEW.callsign, '') || '", '
         || 'e.affiliation = "' || NEW.affiliation || '"'
         || '$$) AS (a ag_catalog.agtype)';
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

CREATE TRIGGER entity_graph_sync
AFTER INSERT OR UPDATE ON entities
FOR EACH ROW EXECUTE FUNCTION sync_entity_to_graph();

-- ── Financial market data (OHLCV) — powers training pipeline ──────────────────
CREATE TABLE ohlcv (
    symbol      TEXT NOT NULL,
    ts          TIMESTAMPTZ NOT NULL,
    open        DOUBLE PRECISION,
    high        DOUBLE PRECISION,
    low         DOUBLE PRECISION,
    close       DOUBLE PRECISION,
    volume      BIGINT,
    adj_close   DOUBLE PRECISION,
    PRIMARY KEY (symbol, ts)
);

CREATE INDEX idx_ohlcv_symbol ON ohlcv(symbol);
CREATE INDEX idx_ohlcv_ts ON ohlcv(ts DESC);
CREATE INDEX idx_ohlcv_symbol_ts ON ohlcv(symbol, ts DESC);

-- ── Computed features / alpha signals (materialized server-side) ──────────────
CREATE TABLE alpha_features (
    symbol      TEXT NOT NULL,
    ts          TIMESTAMPTZ NOT NULL,
    feature     TEXT NOT NULL,               -- e.g. 'momentum_12m', 'vol_20d', 'alpha001'
    value       DOUBLE PRECISION,
    PRIMARY KEY (symbol, ts, feature)
);

CREATE INDEX idx_alpha_feature ON alpha_features(feature, ts DESC);

-- ── Session Defaults for Future Connections ─────────────────────────────────────
ALTER DATABASE mss SET search_path = ag_catalog, "$user", public;
ALTER DATABASE mss SET session_preload_libraries = 'age';
