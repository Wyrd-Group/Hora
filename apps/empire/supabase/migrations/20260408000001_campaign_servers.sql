-- Campaign & Private Server tables for persistent shared multiplayer

-- ── Campaign Servers ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed BIGINT NOT NULL DEFAULT floor(random() * 1000000)::bigint,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  game_tick INT NOT NULL DEFAULT 0,
  game_day INT NOT NULL DEFAULT 1,
  game_month INT NOT NULL DEFAULT 1,
  player_count INT NOT NULL DEFAULT 0,
  max_players INT NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  server_type TEXT NOT NULL DEFAULT 'campaign' CHECK (server_type IN ('campaign', 'private')),
  -- Private server fields
  host_id UUID REFERENCES auth.users(id),
  room_code TEXT UNIQUE,
  rules JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_campaign_servers_status ON campaign_servers(status);
CREATE INDEX idx_campaign_servers_room_code ON campaign_servers(room_code) WHERE room_code IS NOT NULL;
CREATE INDEX idx_campaign_servers_type ON campaign_servers(server_type, status);

-- ── Campaign Players ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_players (
  server_id UUID NOT NULL REFERENCES campaign_servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  display_name TEXT NOT NULL DEFAULT 'Player',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_balance NUMERIC NOT NULL DEFAULT 500000,
  personal_balance NUMERIC NOT NULL DEFAULT 0,
  net_worth NUMERIC NOT NULL DEFAULT 500000,
  nodes_owned INT NOT NULL DEFAULT 0,
  trades_executed INT NOT NULL DEFAULT 0,
  online BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (server_id, user_id)
);

CREATE INDEX idx_campaign_players_server ON campaign_players(server_id);
CREATE INDEX idx_campaign_players_user ON campaign_players(user_id);

-- ── Campaign Prices (server-authoritative) ───────────────────────
CREATE TABLE IF NOT EXISTS campaign_prices (
  server_id UUID NOT NULL REFERENCES campaign_servers(id) ON DELETE CASCADE,
  instrument_id TEXT NOT NULL,
  price NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (server_id, instrument_id)
);

-- ── Campaign Actions (audit log for data collection) ─────────────
CREATE TABLE IF NOT EXISTS campaign_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES campaign_servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  instrument_id TEXT,
  quantity NUMERIC,
  price NUMERIC,
  game_tick INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_actions_server ON campaign_actions(server_id, created_at DESC);
CREATE INDEX idx_campaign_actions_user ON campaign_actions(user_id, created_at DESC);

-- ── Helper RPCs ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_player_count(p_server_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE campaign_servers
  SET player_count = player_count + 1
  WHERE id = p_server_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_player_count(p_server_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE campaign_servers
  SET player_count = GREATEST(0, player_count - 1)
  WHERE id = p_server_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RLS Policies ─────────────────────────────────────────────────

ALTER TABLE campaign_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_actions ENABLE ROW LEVEL SECURITY;

-- Anyone can read servers (to find one to join)
CREATE POLICY "campaign_servers_select" ON campaign_servers
  FOR SELECT USING (true);

-- Only authenticated users can insert (create servers)
CREATE POLICY "campaign_servers_insert" ON campaign_servers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Service role updates (via Edge Function) — no user-level update policy needed
-- The campaign-tick function runs with service_role key

-- Players can read all players in their server
CREATE POLICY "campaign_players_select" ON campaign_players
  FOR SELECT USING (true);

-- Players can insert/update their own row
CREATE POLICY "campaign_players_insert" ON campaign_players
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "campaign_players_update" ON campaign_players
  FOR UPDATE USING (auth.uid() = user_id);

-- Prices are readable by all
CREATE POLICY "campaign_prices_select" ON campaign_prices
  FOR SELECT USING (true);

-- Actions are readable by all in the server
CREATE POLICY "campaign_actions_select" ON campaign_actions
  FOR SELECT USING (true);

-- Players can log their own actions
CREATE POLICY "campaign_actions_insert" ON campaign_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
