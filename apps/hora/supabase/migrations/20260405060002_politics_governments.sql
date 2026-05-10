-- ============================================================
-- Living World Engine - Sprint 6: Politics, Governments & Power
-- ============================================================

-- ── countries: Every real country, seeded with regulations ──
CREATE TABLE IF NOT EXISTS countries (
  id                TEXT PRIMARY KEY, -- ISO 3166-1 alpha-2
  name              TEXT NOT NULL,
  leader_id         UUID REFERENCES auth.users(id), -- null = AI-controlled
  government_type   TEXT NOT NULL DEFAULT 'democracy'
    CHECK (government_type IN ('democracy','autocracy','monarchy','federation','theocracy','communist','military_junta')),
  territory_h3      TEXT[] NOT NULL DEFAULT '{}',
  regulations       JSONB NOT NULL DEFAULT '{}'::JSONB,
  treasury          BIGINT NOT NULL DEFAULT 0,
  approval_rating   REAL NOT NULL DEFAULT 50 CHECK (approval_rating BETWEEN 0 AND 100),
  military_strength INT NOT NULL DEFAULT 50,
  stability         REAL NOT NULL DEFAULT 0.7 CHECK (stability BETWEEN 0 AND 1),
  gdp               BIGINT NOT NULL DEFAULT 0,
  population        BIGINT NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'sovereign'
    CHECK (status IN ('sovereign','puppet','contested','failed_state')),
  puppet_master_id  UUID REFERENCES auth.users(id), -- who controls the puppet
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_countries_status ON countries (status);

-- ── world_governments: Player-formed government overlays ──
CREATE TABLE IF NOT EXISTS world_governments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id  TEXT NOT NULL REFERENCES countries(id),
  leader_id   UUID NOT NULL REFERENCES auth.users(id),
  type        TEXT NOT NULL CHECK (type IN ('democracy','autocracy','council','corporation')),
  cabinet     JSONB NOT NULL DEFAULT '[]'::JSONB,
  treasury    BIGINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','toppled','dissolved'))
);

CREATE INDEX idx_world_govs_country ON world_governments (country_id);
CREATE INDEX idx_world_govs_leader ON world_governments (leader_id);

-- ── political_actions: All political moves ──
CREATE TABLE IF NOT EXISTS political_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID NOT NULL REFERENCES auth.users(id),
  government_id   UUID REFERENCES world_governments(id),
  country_id      TEXT REFERENCES countries(id),
  action_type     TEXT NOT NULL CHECK (action_type IN (
    'form_government','run_for_office','lobby','coup_attempt',
    'election','policy_change','annex_territory','declare_sanctions',
    'corporate_takeover','revolution','election_interference'
  )),
  target_h3       TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::JSONB,
  result          TEXT, -- 'success'/'failure'/'pending'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_political_actions_actor ON political_actions (actor_id, created_at DESC);
CREATE INDEX idx_political_actions_country ON political_actions (country_id);
CREATE INDEX idx_political_actions_type ON political_actions (action_type);

-- ── lobbying_campaigns: Active lobbying competitions ──
CREATE TABLE IF NOT EXISTS lobbying_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id      TEXT NOT NULL REFERENCES countries(id),
  regulation_key  TEXT NOT NULL,
  proposed_value  JSONB NOT NULL,
  proposer_id     UUID NOT NULL REFERENCES auth.users(id),
  for_spending    BIGINT NOT NULL DEFAULT 0,
  against_spending BIGINT NOT NULL DEFAULT 0,
  public_opinion  REAL NOT NULL DEFAULT 0.5, -- 0-1 (1 = fully in favor)
  ticks_remaining INT NOT NULL DEFAULT 10,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','passed','failed','expired')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lobbying_country ON lobbying_campaigns (country_id, status);

-- ── elections: Scheduled and active elections ──
CREATE TABLE IF NOT EXISTS elections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id      TEXT NOT NULL REFERENCES countries(id),
  candidates      JSONB NOT NULL DEFAULT '[]'::JSONB, -- [{user_id, platform, spending, votes}]
  ticks_remaining INT NOT NULL DEFAULT 50,
  status          TEXT NOT NULL DEFAULT 'campaigning'
    CHECK (status IN ('campaigning','voting','completed')),
  winner_id       UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_elections_country ON elections (country_id, status);

-- ── referendums: Player-initiated votes ──
CREATE TABLE IF NOT EXISTS referendums (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id      TEXT, -- null = platform-wide
  title           TEXT NOT NULL,
  description     TEXT,
  proposer_id     UUID NOT NULL REFERENCES auth.users(id),
  signatures      INT NOT NULL DEFAULT 0,
  signatures_required INT NOT NULL DEFAULT 2000000,
  votes_for       INT NOT NULL DEFAULT 0,
  votes_against   INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'gathering_signatures'
    CHECK (status IN ('gathering_signatures','voting','passed','failed','expired')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referendums_status ON referendums (status);

-- ── RLS ──

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_governments ENABLE ROW LEVEL SECURITY;
ALTER TABLE political_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lobbying_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE referendums ENABLE ROW LEVEL SECURITY;

-- countries: anyone reads, server updates
CREATE POLICY "countries_select" ON countries FOR SELECT USING (true);

-- world_governments: anyone reads, authenticated creates/updates own
CREATE POLICY "world_govs_select" ON world_governments FOR SELECT USING (true);
CREATE POLICY "world_govs_insert" ON world_governments FOR INSERT
  WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "world_govs_update" ON world_governments FOR UPDATE
  USING (auth.uid() = leader_id);

-- political_actions: anyone reads, authenticated creates own
CREATE POLICY "political_actions_select" ON political_actions FOR SELECT USING (true);
CREATE POLICY "political_actions_insert" ON political_actions FOR INSERT
  WITH CHECK (auth.uid() = actor_id);

-- lobbying: anyone reads, authenticated participates
CREATE POLICY "lobbying_select" ON lobbying_campaigns FOR SELECT USING (true);
CREATE POLICY "lobbying_insert" ON lobbying_campaigns FOR INSERT
  WITH CHECK (auth.uid() = proposer_id);

-- elections: anyone reads
CREATE POLICY "elections_select" ON elections FOR SELECT USING (true);

-- referendums: anyone reads, authenticated creates
CREATE POLICY "referendums_select" ON referendums FOR SELECT USING (true);
CREATE POLICY "referendums_insert" ON referendums FOR INSERT
  WITH CHECK (auth.uid() = proposer_id);

-- ── RPC Functions ──

-- Lobby for a regulation change
CREATE OR REPLACE FUNCTION lobby_for(p_campaign_id UUID, p_amount BIGINT, p_side TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_side = 'for' THEN
    UPDATE lobbying_campaigns SET for_spending = for_spending + p_amount WHERE id = p_campaign_id;
  ELSIF p_side = 'against' THEN
    UPDATE lobbying_campaigns SET against_spending = against_spending + p_amount WHERE id = p_campaign_id;
  END IF;
END;
$$;

-- Attempt a coup
CREATE OR REPLACE FUNCTION attempt_coup(
  p_actor_id UUID,
  p_country_id TEXT,
  p_military_strength INT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_country countries%ROWTYPE;
  v_success BOOLEAN;
  v_roll REAL;
BEGIN
  SELECT * INTO v_country FROM countries WHERE id = p_country_id;
  IF NOT FOUND THEN RETURN '{"success":false,"error":"Country not found"}'::JSONB; END IF;

  -- Success rate: 40-70% modified by relative military strength and stability
  v_roll := random();
  v_success := v_roll < (0.4 + 0.3 * (p_military_strength::REAL / GREATEST(v_country.military_strength, 1)) - v_country.stability * 0.2);

  IF v_success THEN
    UPDATE countries
    SET leader_id = NULL,
        puppet_master_id = p_actor_id,
        status = 'puppet',
        stability = GREATEST(0, stability - 0.3),
        approval_rating = GREATEST(0, approval_rating - 20)
    WHERE id = p_country_id;
  END IF;

  INSERT INTO political_actions (actor_id, country_id, action_type, result, metadata)
  VALUES (p_actor_id, p_country_id, 'coup_attempt',
    CASE WHEN v_success THEN 'success' ELSE 'failure' END,
    jsonb_build_object('military_strength', p_military_strength, 'roll', v_roll));

  RETURN jsonb_build_object('success', v_success, 'roll', v_roll);
END;
$$;

-- Sign a referendum
CREATE OR REPLACE FUNCTION sign_referendum(p_referendum_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE referendums
  SET signatures = signatures + 1
  WHERE id = p_referendum_id AND status = 'gathering_signatures';

  -- Auto-advance to voting if threshold met
  UPDATE referendums
  SET status = 'voting'
  WHERE id = p_referendum_id AND signatures >= signatures_required AND status = 'gathering_signatures';
END;
$$;

-- Vote on referendum
CREATE OR REPLACE FUNCTION vote_referendum(p_referendum_id UUID, p_user_id UUID, p_vote TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_vote = 'for' THEN
    UPDATE referendums SET votes_for = votes_for + 1 WHERE id = p_referendum_id AND status = 'voting';
  ELSIF p_vote = 'against' THEN
    UPDATE referendums SET votes_against = votes_against + 1 WHERE id = p_referendum_id AND status = 'voting';
  END IF;
END;
$$;
