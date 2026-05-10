-- ============================================================
-- Living World Engine - Sprint 7 & 8: Telemetry + Player-Dev
-- ============================================================

-- ── telemetry: Every single user action ──
CREATE TABLE IF NOT EXISTS telemetry (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  event_type  TEXT NOT NULL,
  target_id   TEXT,
  metadata    JSONB DEFAULT '{}',
  session_id  UUID,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telemetry_user     ON telemetry (user_id, timestamp DESC);
CREATE INDEX idx_telemetry_type     ON telemetry (event_type, timestamp DESC);
CREATE INDEX idx_telemetry_session  ON telemetry (session_id);

-- ── telemetry_rollups: Aggregated daily/weekly stats ──
CREATE TABLE IF NOT EXISTS telemetry_rollups (
  id          BIGSERIAL PRIMARY KEY,
  period      TEXT NOT NULL CHECK (period IN ('daily','weekly')),
  period_start TIMESTAMPTZ NOT NULL,
  event_type  TEXT NOT NULL,
  count       INT NOT NULL DEFAULT 0,
  unique_users INT NOT NULL DEFAULT 0,
  metadata    JSONB DEFAULT '{}',
  UNIQUE (period, period_start, event_type)
);

-- ── player_dev_reports: Bug reports and feature innovations ──
CREATE TABLE IF NOT EXISTS player_dev_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      UUID NOT NULL REFERENCES auth.users(id),
  type             TEXT NOT NULL CHECK (type IN ('bug_report','innovation','feature_request')),
  title            TEXT NOT NULL,
  description      TEXT,
  steps_to_reproduce TEXT,
  maven_analysis   JSONB DEFAULT '{}',
  severity         TEXT CHECK (severity IN ('cosmetic','minor','major','critical')),
  status           TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','verified','in_progress','resolved','rewarded','rejected')),
  reward_xp        INT DEFAULT 0,
  reward_qcoins    INT DEFAULT 0,
  reward_money     BIGINT DEFAULT 0,
  reward_trophies  TEXT[] DEFAULT '{}',
  quality_score    REAL DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 1),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ
);

CREATE INDEX idx_dev_reports_reporter ON player_dev_reports (reporter_id);
CREATE INDEX idx_dev_reports_status   ON player_dev_reports (status);

-- ── innovation_paths: MAVEN-created gameplay paths ──
CREATE TABLE IF NOT EXISTS innovation_paths (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          UUID NOT NULL REFERENCES auth.users(id),
  name                TEXT NOT NULL,
  description         TEXT,
  trigger_conditions  JSONB DEFAULT '{}',
  actions             JSONB[] DEFAULT '{}',
  outcomes            JSONB DEFAULT '{}',
  success_probability REAL DEFAULT 0.5 CHECK (success_probability BETWEEN 0 AND 1),
  category            TEXT CHECK (category IN ('business','political','military','social','creative')),
  legality            TEXT DEFAULT 'legal' CHECK (legality IN ('legal','gray_area','illegal')),
  times_used          INT DEFAULT 0,
  success_rate        REAL DEFAULT 0 CHECK (success_rate BETWEEN 0 AND 1),
  status              TEXT DEFAULT 'proposed'
    CHECK (status IN ('proposed','approved','active','deprecated')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_innovation_paths_creator ON innovation_paths (creator_id);
CREATE INDEX idx_innovation_paths_status  ON innovation_paths (status);
CREATE INDEX idx_innovation_paths_category ON innovation_paths (category);

-- ── player_innovations: Auto-detected innovations ──
CREATE TABLE IF NOT EXISTS player_innovations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID NOT NULL REFERENCES auth.users(id),
  innovation_type  TEXT NOT NULL CHECK (innovation_type IN (
    'new_sector_hub','trade_route_pioneer','government_type',
    'market_strategy','gameplay_path','regulation_change','political_move'
  )),
  description      TEXT,
  impact_score     REAL DEFAULT 0 CHECK (impact_score BETWEEN 0 AND 1),
  follower_count   INT DEFAULT 0,
  reward_tier      TEXT CHECK (reward_tier IN ('bronze','silver','gold','platinum','diamond')),
  status           TEXT DEFAULT 'detected'
    CHECK (status IN ('detected','verified','rewarded')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_innovations_creator ON player_innovations (creator_id);

-- ── RLS ──

ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_dev_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE innovation_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_innovations ENABLE ROW LEVEL SECURITY;

-- telemetry: users insert own, server reads
CREATE POLICY "telemetry_insert" ON telemetry FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- rollups: server only
-- (no client policies needed)

-- dev reports: users create own, anyone reads
CREATE POLICY "dev_reports_select" ON player_dev_reports FOR SELECT USING (true);
CREATE POLICY "dev_reports_insert" ON player_dev_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- innovation paths: anyone reads, creators insert
CREATE POLICY "innovation_paths_select" ON innovation_paths FOR SELECT USING (true);
CREATE POLICY "innovation_paths_insert" ON innovation_paths FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- player innovations: anyone reads
CREATE POLICY "player_innovations_select" ON player_innovations FOR SELECT USING (true);

-- ── Telemetry batch insert function ──
CREATE OR REPLACE FUNCTION batch_insert_telemetry(p_events JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO telemetry (user_id, event_type, target_id, metadata, session_id, timestamp)
  SELECT
    (e->>'user_id')::UUID,
    e->>'event_type',
    e->>'target_id',
    COALESCE(e->'metadata', '{}'::JSONB),
    (e->>'session_id')::UUID,
    COALESCE((e->>'timestamp')::TIMESTAMPTZ, now())
  FROM jsonb_array_elements(p_events) AS e;
END;
$$;
