-- ============================================================
-- Living World Engine - Sprint 1: Database Foundation
-- ============================================================

-- ── world_nodes: Player-founded ventures visible to everyone ──
CREATE TABLE IF NOT EXISTS world_nodes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID NOT NULL REFERENCES auth.users(id),
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 60),
  sector        TEXT NOT NULL CHECK (sector IN (
    'finance','tech','oil_gas','manufacturing','energy','pharma',
    'venue','healthcare','education','cultural','hospitality','defense','retail'
  )),
  lat           DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng           DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  h3_index      TEXT NOT NULL,
  level         INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  business_model TEXT CHECK (char_length(business_model) <= 200),
  base_income   INT NOT NULL DEFAULT 0,
  base_cost     INT NOT NULL DEFAULT 0,
  description   TEXT,
  upvotes       INT NOT NULL DEFAULT 0,
  purchase_count INT NOT NULL DEFAULT 0,
  investor_count INT NOT NULL DEFAULT 0,
  partnership_count INT NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','flagged','removed','pivoted')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_world_nodes_h3      ON world_nodes (h3_index);
CREATE INDEX idx_world_nodes_sector  ON world_nodes (sector);
CREATE INDEX idx_world_nodes_created ON world_nodes (created_at DESC);
CREATE INDEX idx_world_nodes_creator ON world_nodes (creator_id);

-- ── world_routes: Emergent supply chains & partnerships ──
CREATE TABLE IF NOT EXISTS world_routes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id  UUID NOT NULL REFERENCES world_nodes(id) ON DELETE CASCADE,
  to_node_id    UUID NOT NULL REFERENCES world_nodes(id) ON DELETE CASCADE,
  route_type    TEXT NOT NULL CHECK (route_type IN ('supply_chain','partnership','franchise','distribution')),
  traffic_score REAL NOT NULL DEFAULT 0,
  creator_id    UUID REFERENCES auth.users(id),
  last_active   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_node_id, to_node_id, route_type)
);

CREATE INDEX idx_world_routes_from ON world_routes (from_node_id);
CREATE INDEX idx_world_routes_to   ON world_routes (to_node_id);

-- ── world_events: Dynamic events from AI + player actions ──
CREATE TABLE IF NOT EXISTS world_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    TEXT NOT NULL CHECK (event_type IN ('boom','bust','disruption','opportunity','crisis')),
  region_h3     TEXT,              -- null = global event
  sector        TEXT,              -- null = all sectors
  title         TEXT NOT NULL,
  description   TEXT,
  effects       JSONB NOT NULL DEFAULT '{}',
  severity      REAL NOT NULL DEFAULT 0.5 CHECK (severity BETWEEN 0 AND 1),
  source        TEXT NOT NULL CHECK (source IN ('macro','gnn','altdata','player_action','system')),
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_world_events_region  ON world_events (region_h3);
CREATE INDEX idx_world_events_expires ON world_events (expires_at);
CREATE INDEX idx_world_events_type    ON world_events (event_type);

-- ── player_actions: Lightweight action log for emergent behavior ──
CREATE TABLE IF NOT EXISTS player_actions (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  action_type   TEXT NOT NULL,
  target_id     TEXT,
  metadata      JSONB DEFAULT '{}',
  h3_index      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_actions_user    ON player_actions (user_id, created_at DESC);
CREATE INDEX idx_player_actions_h3      ON player_actions (h3_index);
CREATE INDEX idx_player_actions_type    ON player_actions (action_type, created_at DESC);

-- ── world_meta: Single-row JSONB for trending data (cheap reads) ──
CREATE TABLE IF NOT EXISTS world_meta (
  id            TEXT PRIMARY KEY DEFAULT 'global',
  trending      JSONB NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO world_meta (id, trending) VALUES ('global', '{"top_nodes":[],"emerging_sectors":[]}')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE world_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_meta ENABLE ROW LEVEL SECURITY;

-- world_nodes: anyone reads, authenticated inserts own, updates own
CREATE POLICY "world_nodes_select" ON world_nodes FOR SELECT USING (true);
CREATE POLICY "world_nodes_insert" ON world_nodes FOR INSERT
  WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "world_nodes_update" ON world_nodes FOR UPDATE
  USING (auth.uid() = creator_id);

-- world_routes: anyone reads, authenticated inserts/updates
CREATE POLICY "world_routes_select" ON world_routes FOR SELECT USING (true);
CREATE POLICY "world_routes_insert" ON world_routes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "world_routes_update" ON world_routes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- world_events: read-only for clients (server writes via service key)
CREATE POLICY "world_events_select" ON world_events FOR SELECT USING (true);

-- player_actions: users insert own only, no client reads (server-only reads)
CREATE POLICY "player_actions_insert" ON player_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- world_meta: anyone reads
CREATE POLICY "world_meta_select" ON world_meta FOR SELECT USING (true);


-- ============================================================
-- RPC Functions
-- ============================================================

-- Purchase / invest in a world node
CREATE OR REPLACE FUNCTION purchase_world_node(p_node_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE world_nodes
  SET purchase_count = purchase_count + 1,
      investor_count = investor_count + 1
  WHERE id = p_node_id;

  INSERT INTO player_actions (user_id, action_type, target_id, metadata)
  VALUES (p_user_id, 'invest', p_node_id::TEXT, '{"type":"purchase"}');
END;
$$;

-- Boost traffic on a route
CREATE OR REPLACE FUNCTION boost_route_traffic(p_route_id UUID, p_amount REAL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE world_routes
  SET traffic_score = traffic_score + p_amount,
      last_active = now()
  WHERE id = p_route_id;
END;
$$;

-- Decay all route traffic by 2%, delete dead routes
CREATE OR REPLACE FUNCTION decay_route_traffic()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE world_routes
  SET traffic_score = traffic_score * 0.98;

  DELETE FROM world_routes
  WHERE traffic_score < 0.5
    AND last_active < now() - INTERVAL '24 hours';
END;
$$;

-- Get active events for given H3 cells
CREATE OR REPLACE FUNCTION get_active_events(p_h3_cells TEXT[])
RETURNS SETOF world_events
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM world_events
  WHERE expires_at > now()
    AND (region_h3 IS NULL OR region_h3 = ANY(p_h3_cells));
END;
$$;

-- Purge old player actions (30-day TTL)
CREATE OR REPLACE FUNCTION purge_old_actions()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM player_actions
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$;

-- Archive expired events
CREATE OR REPLACE FUNCTION archive_expired_events()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM world_events
  WHERE expires_at < now() - INTERVAL '24 hours';
END;
$$;
