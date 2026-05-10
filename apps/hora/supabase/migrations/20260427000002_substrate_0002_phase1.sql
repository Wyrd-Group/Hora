-- ============================================================================
-- Substrate Mode — Phase 1 schema
-- ============================================================================
-- See AEGIS_BUILD_SPEC.md §4.1 (Academy / ECFL firewall — non-negotiable),
-- §7.3 (VentureAttempt), §11 (marketplace), §8 (NPC engine), §4.5 (sinks).
--
-- This migration introduces ten new tables for Substrate Phase 1:
--
--   1. substrate_ventures              — cached snapshot of pulled VentureSpecs
--   2. substrate_venture_attempts      — per-player VentureAttempt rows
--   3. substrate_listings              — marketplace listings
--   4. substrate_subscriptions         — recurring B2B/B2C subscriptions
--   5. substrate_npc_decisions         — NPC decision audit trail
--   6. substrate_npc_personas          — instantiated NPC persona records
--   7. substrate_npc_decision_jobs     — async job queue
--   8. substrate_briefings             — Phase 1 stub for full composer (P2)
--   9. substrate_wallets               — Substrate-only wallet balances
--   10. substrate_economy_events       — sink-by-sink audit trail
--
-- FIREWALL — Per §4.1, no Substrate table joins academy_* / ecfl_* tables,
-- ever, by any path. NO foreign keys to academy_* / ecfl_* — REJECT IN REVIEW
-- if a future migration tries to add one.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. substrate_ventures
-- ----------------------------------------------------------------------------
-- Write-through cache of pulled VentureSpec snapshots. Source of truth lives
-- in the NCOE backend; AEGIS caches here so the Venture List + Athena panel
-- can hydrate without a round-trip on every render.
CREATE TABLE IF NOT EXISTS public.substrate_ventures (
  venture_id          text PRIMARY KEY,
  spec_version        text NOT NULL,
  generated_at        timestamptz NOT NULL,
  pitch               text NOT NULL,
  description         text NOT NULL,
  domain              text NOT NULL,
  difficulty          smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  starting_capital    numeric NOT NULL,
  target_eta_mvp_days integer NOT NULL,
  target_buyer        text NOT NULL CHECK (target_buyer IN ('B2B','B2C','BOTH')),
  spec_json           jsonb NOT NULL,
  cached_at           timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.substrate_ventures IS
  'Cached snapshot of pulled VentureSpec payloads. Per AEGIS_BUILD_SPEC.md §7.2. '
  'No foreign keys to academy_* per §4.1 firewall.';
ALTER TABLE public.substrate_ventures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "substrate_ventures_authenticated_read" ON public.substrate_ventures;
CREATE POLICY "substrate_ventures_authenticated_read"
  ON public.substrate_ventures FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- 2. substrate_venture_attempts
-- ----------------------------------------------------------------------------
-- One row per (player, venture) attempt. Lifecycle drives the rest of the
-- Substrate flow.
CREATE TABLE IF NOT EXISTS public.substrate_venture_attempts (
  attempt_id          text PRIMARY KEY,
  venture_id          text NOT NULL REFERENCES public.substrate_ventures(venture_id) ON DELETE RESTRICT,
  player_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id          text NOT NULL,
  started_at          timestamptz NOT NULL DEFAULT now(),
  ended_at            timestamptz NULL,
  status              text NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress','shipped','abandoned','failed','exited')),
  pieces_json         jsonb NOT NULL DEFAULT '[]'::jsonb,
  briefings_json      jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics_json        jsonb NOT NULL DEFAULT '{}'::jsonb,
  pivots_json         jsonb NOT NULL DEFAULT '[]'::jsonb,
  contribution_score  numeric NULL,                                -- §13.4: stored, never surfaced as a percentage
  athena_session_ids  text[] NOT NULL DEFAULT ARRAY[]::text[],
  starting_capital    numeric NOT NULL DEFAULT 0,
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.substrate_venture_attempts IS
  'Per-player VentureAttempt records. Per AEGIS_BUILD_SPEC.md §7.3. '
  'contribution_score is stored server-side but NEVER surfaced as a '
  'percentage to the UI per §4.4 + §13.3 (lawyer review pending). '
  'No foreign keys to academy_* per §4.1.';
CREATE INDEX IF NOT EXISTS substrate_venture_attempts_player_idx
  ON public.substrate_venture_attempts (player_id, started_at DESC);
CREATE INDEX IF NOT EXISTS substrate_venture_attempts_venture_idx
  ON public.substrate_venture_attempts (venture_id);
ALTER TABLE public.substrate_venture_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "substrate_venture_attempts_owner_select" ON public.substrate_venture_attempts;
CREATE POLICY "substrate_venture_attempts_owner_select"
  ON public.substrate_venture_attempts FOR SELECT TO authenticated USING (auth.uid() = player_id);
DROP POLICY IF EXISTS "substrate_venture_attempts_owner_insert" ON public.substrate_venture_attempts;
CREATE POLICY "substrate_venture_attempts_owner_insert"
  ON public.substrate_venture_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = player_id);
DROP POLICY IF EXISTS "substrate_venture_attempts_owner_update" ON public.substrate_venture_attempts;
CREATE POLICY "substrate_venture_attempts_owner_update"
  ON public.substrate_venture_attempts FOR UPDATE TO authenticated
  USING (auth.uid() = player_id) WITH CHECK (auth.uid() = player_id);

-- ----------------------------------------------------------------------------
-- 3. substrate_listings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.substrate_listings (
  listing_id          text PRIMARY KEY,
  seller_id           text NOT NULL,                          -- player UUID or NPC id (text-typed for both)
  seller_kind         text NOT NULL CHECK (seller_kind IN ('player','npc')),
  venture_id          text NOT NULL REFERENCES public.substrate_ventures(venture_id) ON DELETE CASCADE,
  title               text NOT NULL,
  description         text NOT NULL,
  kind                text NOT NULL CHECK (kind IN ('one_time','subscription','usage_based')),
  pricing_tiers_json  jsonb NOT NULL,
  interface_handle    text NULL,
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  domain              text NULL,
  target_buyer        text NULL CHECK (target_buyer IN ('B2B','B2C','BOTH'))
);
CREATE INDEX IF NOT EXISTS substrate_listings_status_idx
  ON public.substrate_listings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS substrate_listings_seller_idx
  ON public.substrate_listings (seller_id);
COMMENT ON TABLE public.substrate_listings IS
  'Marketplace listings published from ventures. Per §11. '
  'No foreign keys to academy_* per §4.1.';
ALTER TABLE public.substrate_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "substrate_listings_authenticated_read" ON public.substrate_listings;
CREATE POLICY "substrate_listings_authenticated_read"
  ON public.substrate_listings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "substrate_listings_owner_insert" ON public.substrate_listings;
CREATE POLICY "substrate_listings_owner_insert"
  ON public.substrate_listings FOR INSERT TO authenticated
  WITH CHECK (seller_kind = 'npc' OR seller_id::uuid = auth.uid());
DROP POLICY IF EXISTS "substrate_listings_owner_update" ON public.substrate_listings;
CREATE POLICY "substrate_listings_owner_update"
  ON public.substrate_listings FOR UPDATE TO authenticated
  USING (seller_kind = 'npc' OR seller_id::uuid = auth.uid())
  WITH CHECK (seller_kind = 'npc' OR seller_id::uuid = auth.uid());

-- ----------------------------------------------------------------------------
-- 4. substrate_subscriptions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.substrate_subscriptions (
  sub_id              text PRIMARY KEY,
  listing_id          text NOT NULL REFERENCES public.substrate_listings(listing_id) ON DELETE CASCADE,
  buyer_id            text NOT NULL,
  buyer_kind          text NOT NULL CHECK (buyer_kind IN ('player','npc')),
  buyer_wallet_kind   text NOT NULL CHECK (buyer_wallet_kind IN ('personal','company')),
  tier                text NOT NULL,
  tier_price          numeric NOT NULL,
  seller_id           text NOT NULL,
  started_at          timestamptz NOT NULL DEFAULT now(),
  canceled_at         timestamptz NULL,
  last_settled_at     timestamptz NULL
);
CREATE INDEX IF NOT EXISTS substrate_subscriptions_active_idx
  ON public.substrate_subscriptions (canceled_at) WHERE canceled_at IS NULL;
CREATE INDEX IF NOT EXISTS substrate_subscriptions_buyer_idx
  ON public.substrate_subscriptions (buyer_id);
CREATE INDEX IF NOT EXISTS substrate_subscriptions_seller_idx
  ON public.substrate_subscriptions (seller_id);
COMMENT ON TABLE public.substrate_subscriptions IS
  'Per-tick recurring subscriptions. Per §11.1. '
  'No foreign keys to academy_* per §4.1.';
ALTER TABLE public.substrate_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "substrate_subscriptions_authenticated_read" ON public.substrate_subscriptions;
CREATE POLICY "substrate_subscriptions_authenticated_read"
  ON public.substrate_subscriptions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "substrate_subscriptions_owner_insert" ON public.substrate_subscriptions;
CREATE POLICY "substrate_subscriptions_owner_insert"
  ON public.substrate_subscriptions FOR INSERT TO authenticated
  WITH CHECK (buyer_kind = 'npc' OR buyer_id::uuid = auth.uid());
DROP POLICY IF EXISTS "substrate_subscriptions_owner_update" ON public.substrate_subscriptions;
CREATE POLICY "substrate_subscriptions_owner_update"
  ON public.substrate_subscriptions FOR UPDATE TO authenticated
  USING (buyer_kind = 'npc' OR buyer_id::uuid = auth.uid())
  WITH CHECK (buyer_kind = 'npc' OR buyer_id::uuid = auth.uid());

-- ----------------------------------------------------------------------------
-- 5. substrate_npc_decisions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.substrate_npc_decisions (
  decision_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id              text NOT NULL,
  persona_kind        text NOT NULL,
  kind                text NOT NULL,        -- subscribe | cancel | evaluate | publish_listing | audit_objection | noop
  severity            text NOT NULL CHECK (severity IN ('low','medium','high')),
  payload             jsonb NOT NULL DEFAULT '{}'::jsonb,
  rationale           text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS substrate_npc_decisions_created_idx
  ON public.substrate_npc_decisions (created_at DESC);
COMMENT ON TABLE public.substrate_npc_decisions IS
  'NPC decision audit trail per §8. No foreign keys to academy_* per §4.1.';
ALTER TABLE public.substrate_npc_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "substrate_npc_decisions_authenticated_read" ON public.substrate_npc_decisions;
CREATE POLICY "substrate_npc_decisions_authenticated_read"
  ON public.substrate_npc_decisions FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- 6. substrate_npc_personas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.substrate_npc_personas (
  npc_id              text PRIMARY KEY,
  persona_kind        text NOT NULL,
  anchor_params       jsonb NOT NULL,
  balance_substrate   numeric NOT NULL DEFAULT 0,
  balance_personal    numeric NOT NULL DEFAULT 0,
  balance_company     numeric NOT NULL DEFAULT 0,
  instantiated_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.substrate_npc_personas IS
  'Instantiated NPC persona records. Per §8.4. '
  'No foreign keys to academy_* per §4.1.';
ALTER TABLE public.substrate_npc_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "substrate_npc_personas_authenticated_read" ON public.substrate_npc_personas;
CREATE POLICY "substrate_npc_personas_authenticated_read"
  ON public.substrate_npc_personas FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- 7. substrate_npc_decision_jobs (the async job queue)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.substrate_npc_decision_jobs (
  job_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id              text NOT NULL,
  payload             jsonb NOT NULL DEFAULT '{}'::jsonb,
  status              text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','processing','done','error')),
  enqueued_at         timestamptz NOT NULL DEFAULT now(),
  processed_at        timestamptz NULL,
  error_message       text NULL
);
CREATE INDEX IF NOT EXISTS substrate_npc_decision_jobs_pending_idx
  ON public.substrate_npc_decision_jobs (enqueued_at) WHERE status = 'pending';
COMMENT ON TABLE public.substrate_npc_decision_jobs IS
  'Async-by-default job queue for NPC decisions. Per §8.7. '
  'No foreign keys to academy_* per §4.1.';
ALTER TABLE public.substrate_npc_decision_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "substrate_npc_decision_jobs_authenticated_read" ON public.substrate_npc_decision_jobs;
CREATE POLICY "substrate_npc_decision_jobs_authenticated_read"
  ON public.substrate_npc_decision_jobs FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- 8. substrate_briefings  (Phase 1 stub — full composer deferred to Phase 2)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.substrate_briefings (
  briefing_id         text PRIMARY KEY,
  venture_id          text NOT NULL REFERENCES public.substrate_ventures(venture_id) ON DELETE CASCADE,
  author_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               text NOT NULL,
  body_md             text NOT NULL,
  format              text NOT NULL DEFAULT '5_min_read',
  status              text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','published','featured','archived')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.substrate_briefings IS
  'Substrate Briefings — markdown educational content. Per §5.7. '
  'NO academy_promoted column. NO ecfl_eligible column. Per §4.1. '
  'Phase 1 stub — full composer deferred to Phase 2.';
ALTER TABLE public.substrate_briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "substrate_briefings_authenticated_read_published" ON public.substrate_briefings;
CREATE POLICY "substrate_briefings_authenticated_read_published"
  ON public.substrate_briefings FOR SELECT TO authenticated
  USING (status IN ('published','featured') OR auth.uid() = author_id);
DROP POLICY IF EXISTS "substrate_briefings_owner_insert" ON public.substrate_briefings;
CREATE POLICY "substrate_briefings_owner_insert"
  ON public.substrate_briefings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "substrate_briefings_owner_update" ON public.substrate_briefings;
CREATE POLICY "substrate_briefings_owner_update"
  ON public.substrate_briefings FOR UPDATE TO authenticated
  USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

-- ----------------------------------------------------------------------------
-- 9. substrate_wallets
-- ----------------------------------------------------------------------------
-- Substrate-only currency balances. ISOLATED from Campaign per §4.2. The
-- composite primary key (user_id, wallet_kind) lets a player hold both a
-- 'personal' (B2C) and 'company' (B2B) wallet without joining wallets across
-- modes.
CREATE TABLE IF NOT EXISTS public.substrate_wallets (
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_kind         text NOT NULL CHECK (wallet_kind IN ('personal','company')),
  balance             numeric NOT NULL DEFAULT 0,
  first_grant_applied boolean NOT NULL DEFAULT false,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, wallet_kind)
);
COMMENT ON TABLE public.substrate_wallets IS
  'Substrate-only currency balances per user per wallet_kind. ISOLATED '
  'from Campaign wallets per AEGIS_BUILD_SPEC.md §4.2. No cross-mode '
  'liquidity in v1 (§11.4). No foreign keys to academy_* per §4.1.';
ALTER TABLE public.substrate_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "substrate_wallets_owner_select" ON public.substrate_wallets;
CREATE POLICY "substrate_wallets_owner_select"
  ON public.substrate_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "substrate_wallets_owner_insert" ON public.substrate_wallets;
CREATE POLICY "substrate_wallets_owner_insert"
  ON public.substrate_wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "substrate_wallets_owner_update" ON public.substrate_wallets;
CREATE POLICY "substrate_wallets_owner_update"
  ON public.substrate_wallets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 10. substrate_economy_events
-- ----------------------------------------------------------------------------
-- Sink-by-sink audit trail. Each row is one churn / fee / upkeep / tax /
-- card_cost / inflation_adjustment event. The inflation guard reads this to
-- compute currency velocity over the last N ticks (§4.5).
CREATE TABLE IF NOT EXISTS public.substrate_economy_events (
  event_id            text PRIMARY KEY,
  kind                text NOT NULL CHECK (kind IN ('churn','fee','upkeep','tax','card_cost','inflation_guard')),
  amount              numeric NOT NULL,
  party_id            text NOT NULL,
  context             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS substrate_economy_events_created_idx
  ON public.substrate_economy_events (created_at DESC);
CREATE INDEX IF NOT EXISTS substrate_economy_events_kind_idx
  ON public.substrate_economy_events (kind);
COMMENT ON TABLE public.substrate_economy_events IS
  'Sink-by-sink audit trail. Per §4.5. The inflation guard reads this '
  'for rolling currency velocity. No foreign keys to academy_* per §4.1.';
ALTER TABLE public.substrate_economy_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "substrate_economy_events_authenticated_read" ON public.substrate_economy_events;
CREATE POLICY "substrate_economy_events_authenticated_read"
  ON public.substrate_economy_events FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- Audit-trail comment for future contributors
-- ============================================================================
-- If you find yourself wanting to:
--   * Add a column referencing academy_promoted, ecfl_eligible, ecfl_score …
--   * Add a JOIN clause across substrate_* and academy_* …
--   * Promote a Substrate Briefing into Academy curriculum …
-- STOP. Per §4.1 these are explicit non-features. Academy has its own
-- pipeline + governance; Substrate cannot promote into it.
-- ============================================================================
