-- ============================================================================
-- Regulatory Agents System
-- ============================================================================
-- Two-agent system for keeping jurisdictional financial facts up to date:
--   - Researcher Agent: fetches official gov/regulator sources weekly,
--     extracts structured facts via Claude, writes to jurisdictional_facts
--   - Updater Agent: diffs against approved values, auto-approves unchanged
--     confirmations, queues value changes for human review
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Prereq: profiles columns the rest of this migration depends on.
-- The existing profiles table has only (id, display_name, game_state, ...),
-- but the jurisdiction store reads/writes country_code, and the RLS policies
-- below gate admin reads on role/is_admin. Adding these idempotently.
-- ----------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.country_code IS
  'ISO 3166-1 alpha-2 jurisdiction code, set by the country picker.';
COMMENT ON COLUMN profiles.role IS
  'Optional coarse role string; ''admin'' unlocks the regulatory review UI.';
COMMENT ON COLUMN profiles.is_admin IS
  'Boolean admin flag; either this or role=admin grants review access.';

-- ----------------------------------------------------------------------------
-- Table: regulatory_sources
-- Whitelisted official URLs per (country, topic). Agents never scrape arbitrary
-- URLs — only sources explicitly approved here.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regulatory_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,           -- ISO 3166-1 alpha-2: 'FR', 'UK', 'DE', 'US'
  topic text NOT NULL,                  -- canonical topic key: 'income_tax_brackets', 'isa_allowance'
  source_url text NOT NULL,             -- official source URL
  source_type text NOT NULL,            -- 'government' | 'regulator' | 'official_news'
  source_authority text,                -- 'HMRC', 'IRS', 'BaFin', 'impots.gouv.fr'
  notes text,                           -- what to look for on the page
  active boolean NOT NULL DEFAULT true,
  last_fetched_at timestamptz,
  last_success_at timestamptz,
  fetch_failures_in_row int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, topic, source_url)
);

CREATE INDEX idx_regulatory_sources_country_topic
  ON regulatory_sources (country_code, topic) WHERE active = true;

COMMENT ON TABLE regulatory_sources IS
  'Whitelisted official URLs that the Researcher agent is permitted to fetch.';

-- ----------------------------------------------------------------------------
-- Table: jurisdictional_facts
-- Structured facts extracted from sources. Every fact has a lifecycle:
-- pending_review -> approved (visible to learners) or rejected.
-- Only the latest approved fact for a given (country, key) is rendered.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jurisdictional_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  topic text NOT NULL,
  fact_key text NOT NULL,               -- e.g. 'isa_annual_allowance', 'top_income_tax_rate'
  value jsonb NOT NULL,                 -- { amount: 20000, currency: 'GBP', effective_from: '2025-04-06' }
  display_value text,                   -- human-readable '£20,000'
  source_id uuid REFERENCES regulatory_sources(id) ON DELETE SET NULL,
  source_url text,                      -- denormalized for audit
  source_excerpt text,                  -- verbatim quote from source
  confidence numeric(3,2) NOT NULL,     -- 0.00 - 1.00 from extractor
  fetched_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending_review',
    -- 'pending_review' | 'approved' | 'rejected' | 'superseded'
  approved_at timestamptz,
  approved_by uuid,                     -- references auth.users
  rejected_at timestamptz,
  rejected_by uuid,
  rejection_reason text,
  superseded_by uuid REFERENCES jurisdictional_facts(id) ON DELETE SET NULL,
  effective_from date,                  -- when fact becomes legally effective
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending_review', 'approved', 'rejected', 'superseded')),
  CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- One active approved fact per (country, fact_key). Enforced via partial unique.
CREATE UNIQUE INDEX idx_facts_approved_unique
  ON jurisdictional_facts (country_code, fact_key)
  WHERE status = 'approved';

CREATE INDEX idx_facts_status
  ON jurisdictional_facts (status, fetched_at DESC);

CREATE INDEX idx_facts_country_key
  ON jurisdictional_facts (country_code, fact_key, status);

COMMENT ON TABLE jurisdictional_facts IS
  'Structured financial/tax facts per country, with full audit lineage.';

-- ----------------------------------------------------------------------------
-- Table: review_queue
-- Pending human approvals for value changes. Auto-populated by Updater agent
-- when a new extracted fact differs from the current approved value.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  new_fact_id uuid NOT NULL REFERENCES jurisdictional_facts(id) ON DELETE CASCADE,
  previous_fact_id uuid REFERENCES jurisdictional_facts(id) ON DELETE SET NULL,
  country_code text NOT NULL,
  fact_key text NOT NULL,
  change_type text NOT NULL,
    -- 'new_fact' | 'value_change' | 'structural_change' | 'deprecation'
  old_value jsonb,
  new_value jsonb NOT NULL,
  risk_score text NOT NULL,             -- 'low' | 'medium' | 'high'
  risk_reasoning text,                  -- why the agent assigned this risk
  delta_percent numeric(6,2),           -- for numeric changes: % difference
  status text NOT NULL DEFAULT 'pending',
    -- 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'needs_investigation'
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_change_type CHECK (change_type IN (
    'new_fact', 'value_change', 'structural_change', 'deprecation'
  )),
  CONSTRAINT valid_risk CHECK (risk_score IN ('low', 'medium', 'high')),
  CONSTRAINT valid_review_status CHECK (status IN (
    'pending', 'approved', 'rejected', 'auto_approved', 'needs_investigation'
  ))
);

CREATE INDEX idx_review_queue_status
  ON review_queue (status, created_at DESC) WHERE status = 'pending';

CREATE INDEX idx_review_queue_country
  ON review_queue (country_code, fact_key);

COMMENT ON TABLE review_queue IS
  'Pending regulatory fact changes awaiting human approval.';

-- ----------------------------------------------------------------------------
-- Table: fact_change_log
-- Append-only audit trail for every action taken on facts. Never deleted.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fact_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id uuid REFERENCES jurisdictional_facts(id) ON DELETE SET NULL,
  review_id uuid REFERENCES review_queue(id) ON DELETE SET NULL,
  action text NOT NULL,
    -- 'fact_created' | 'fact_approved' | 'fact_rejected' | 'fact_superseded'
    -- | 'review_queued' | 'review_auto_approved' | 'review_approved' | 'review_rejected'
    -- | 'source_fetch_failed'
  actor_type text NOT NULL,             -- 'researcher_agent' | 'updater_agent' | 'human'
  actor_id text,                        -- user id for humans, agent version for bots
  country_code text,
  fact_key text,
  before_state jsonb,
  after_state jsonb,
  details jsonb,                        -- free-form: source url, error msg, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_log_fact ON fact_change_log (fact_id, created_at DESC);
CREATE INDEX idx_change_log_country_key ON fact_change_log (country_code, fact_key, created_at DESC);
CREATE INDEX idx_change_log_actor ON fact_change_log (actor_type, created_at DESC);

COMMENT ON TABLE fact_change_log IS
  'Append-only audit trail for regulatory fact lifecycle. Never truncated.';

-- ----------------------------------------------------------------------------
-- Function: current_approved_fact(country, fact_key)
-- Convenience accessor for renderer — always returns the one approved row.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_approved_fact(p_country text, p_fact_key text)
RETURNS jurisdictional_facts AS $$
  SELECT *
  FROM jurisdictional_facts
  WHERE country_code = p_country
    AND fact_key = p_fact_key
    AND status = 'approved'
  ORDER BY approved_at DESC NULLS LAST
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ----------------------------------------------------------------------------
-- Function: approve_review
-- Atomic approval: marks new fact approved, supersedes previous, updates queue,
-- writes audit log.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION approve_review(p_review_id uuid, p_actor_id uuid, p_notes text DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_review review_queue%ROWTYPE;
  v_prev_fact jurisdictional_facts%ROWTYPE;
BEGIN
  SELECT * INTO v_review FROM review_queue WHERE id = p_review_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'review not found'; END IF;
  IF v_review.status <> 'pending' THEN RAISE EXCEPTION 'review already resolved'; END IF;

  -- Supersede previous approved fact for this (country, fact_key)
  UPDATE jurisdictional_facts
  SET status = 'superseded', superseded_by = v_review.new_fact_id, updated_at = now()
  WHERE country_code = v_review.country_code
    AND fact_key = v_review.fact_key
    AND status = 'approved'
  RETURNING * INTO v_prev_fact;

  -- Approve the new fact
  UPDATE jurisdictional_facts
  SET status = 'approved',
      approved_at = now(),
      approved_by = p_actor_id,
      updated_at = now()
  WHERE id = v_review.new_fact_id;

  -- Resolve the review
  UPDATE review_queue
  SET status = 'approved',
      resolved_at = now(),
      resolved_by = p_actor_id,
      resolution_notes = p_notes
  WHERE id = p_review_id;

  -- Audit log
  INSERT INTO fact_change_log (
    fact_id, review_id, action, actor_type, actor_id,
    country_code, fact_key, before_state, after_state, details
  ) VALUES (
    v_review.new_fact_id, p_review_id, 'review_approved', 'human', p_actor_id::text,
    v_review.country_code, v_review.fact_key,
    to_jsonb(v_prev_fact), v_review.new_value,
    jsonb_build_object('notes', p_notes)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Function: reject_review
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reject_review(p_review_id uuid, p_actor_id uuid, p_reason text)
RETURNS void AS $$
DECLARE
  v_review review_queue%ROWTYPE;
BEGIN
  SELECT * INTO v_review FROM review_queue WHERE id = p_review_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'review not found'; END IF;
  IF v_review.status <> 'pending' THEN RAISE EXCEPTION 'review already resolved'; END IF;

  UPDATE jurisdictional_facts
  SET status = 'rejected',
      rejected_at = now(),
      rejected_by = p_actor_id,
      rejection_reason = p_reason,
      updated_at = now()
  WHERE id = v_review.new_fact_id;

  UPDATE review_queue
  SET status = 'rejected',
      resolved_at = now(),
      resolved_by = p_actor_id,
      resolution_notes = p_reason
  WHERE id = p_review_id;

  INSERT INTO fact_change_log (
    fact_id, review_id, action, actor_type, actor_id,
    country_code, fact_key, details
  ) VALUES (
    v_review.new_fact_id, p_review_id, 'review_rejected', 'human', p_actor_id::text,
    v_review.country_code, v_review.fact_key,
    jsonb_build_object('reason', p_reason)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- RLS Policies
-- Strategy: everyone reads approved facts (needed for curriculum rendering).
-- Only service role writes (Edge Functions use service role). Admins only can
-- call approve/reject via RPC.
-- ----------------------------------------------------------------------------
ALTER TABLE regulatory_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdictional_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_change_log ENABLE ROW LEVEL SECURITY;

-- Public read for approved facts and active sources (for transparency badges)
CREATE POLICY "approved_facts_public_read"
  ON jurisdictional_facts FOR SELECT
  USING (status = 'approved');

CREATE POLICY "active_sources_public_read"
  ON regulatory_sources FOR SELECT
  USING (active = true);

-- Admins (users with role 'admin' in profiles table) can see everything + review queue
-- Assumes profiles.role column exists. Adjust predicate to your actual admin check.
CREATE POLICY "admin_full_read_facts"
  ON jurisdictional_facts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.is_admin = true)
    )
  );

CREATE POLICY "admin_full_read_queue"
  ON review_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.is_admin = true)
    )
  );

CREATE POLICY "admin_full_read_sources"
  ON regulatory_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.is_admin = true)
    )
  );

CREATE POLICY "admin_full_read_log"
  ON fact_change_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.is_admin = true)
    )
  );

-- Writes only via service role key (Edge Functions) or SECURITY DEFINER RPCs.
-- No direct INSERT/UPDATE/DELETE policies for anon or authenticated.

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_regulatory_sources_updated
  BEFORE UPDATE ON regulatory_sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_jurisdictional_facts_updated
  BEFORE UPDATE ON jurisdictional_facts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
