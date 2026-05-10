-- ============================================================================
-- Substrate Mode — Phase 0 init (foundation tables only)
-- ============================================================================
-- See AEGIS_BUILD_SPEC.md §4.1 (Academy / ECFL firewall — non-negotiable),
-- §4.3 (IP / ToS), and §12 (telemetry pipeline).
--
-- This migration introduces the two foundation tables Substrate Mode needs
-- in Phase 0:
--
--   1. substrate_tos_acceptances        — one row per user, audit trail of
--                                         the Substrate ToS acceptance
--                                         (spec §4.3).
--   2. substrate_telemetry_events_buffer — local-side buffer for the nightly
--                                         batch upload to NCOE (spec §12.2).
--                                         Phase 1 owns the transport flow;
--                                         this migration just lays the
--                                         schema so events have somewhere
--                                         to land.
--
-- FIREWALL — DO NOT JOIN AGAINST academy_* TABLES.
-- =================================================
-- Per AEGIS_BUILD_SPEC.md §4.1, no Substrate table joins to Academy / ECFL
-- tables, ever, by any path, under any condition. ECFL is a registered
-- trademark + a published European standard whose credential value depends
-- entirely on rigor; cross-pollination dilutes both. The firewall is
-- enforced at the schema level by:
--
--   * No FOREIGN KEY here references academy_* / ecfl_* tables.
--   * No CHECK constraint here calls a function that touches academy_*.
--   * No view defined here joins academy_* / ecfl_*.
--
-- If a future migration introduces such a join, REJECT IT IN REVIEW.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. substrate_tos_acceptances
-- ----------------------------------------------------------------------------
-- One row per user, written when the player accepts the Substrate ToS
-- interstitial (see src/components/substrate/SubstrateTosInterstitial.jsx).
-- The presence of a row gates entry to the Substrate placeholder surface.

CREATE TABLE IF NOT EXISTS public.substrate_tos_acceptances (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at  timestamptz NOT NULL DEFAULT now(),
  tos_version  text NOT NULL DEFAULT 'v1'
);

COMMENT ON TABLE public.substrate_tos_acceptances IS
  'Substrate Mode terms-of-service acceptance audit trail. One row per user. '
  'See AEGIS_BUILD_SPEC.md §4.3. Contains NO foreign keys to academy_* tables '
  'per the §4.1 firewall.';

-- RLS: a user reads + writes only their own row.
ALTER TABLE public.substrate_tos_acceptances ENABLE ROW LEVEL SECURITY;

-- Drop+recreate idempotently so re-running the migration in dev is safe.
DROP POLICY IF EXISTS "substrate_tos_acceptances_owner_select"
  ON public.substrate_tos_acceptances;
CREATE POLICY "substrate_tos_acceptances_owner_select"
  ON public.substrate_tos_acceptances
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "substrate_tos_acceptances_owner_insert"
  ON public.substrate_tos_acceptances;
CREATE POLICY "substrate_tos_acceptances_owner_insert"
  ON public.substrate_tos_acceptances
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "substrate_tos_acceptances_owner_update"
  ON public.substrate_tos_acceptances;
CREATE POLICY "substrate_tos_acceptances_owner_update"
  ON public.substrate_tos_acceptances
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy: ToS acceptance is an audit record. Account-deletion
-- cascades from auth.users.

-- ----------------------------------------------------------------------------
-- 2. substrate_telemetry_events_buffer
-- ----------------------------------------------------------------------------
-- Local buffer for the Phase 1 nightly batch upload to NCOE (spec §12.2).
-- Phase 0 stubs writes through `emit(...)` in src/substrate/telemetry/events.ts;
-- the durable transport, retry semantics, and cron drain are Phase 1 work.

CREATE TABLE IF NOT EXISTS public.substrate_telemetry_events_buffer (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type        text NOT NULL,
  payload           jsonb NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  uploaded_at       timestamptz NULL,
  -- Pseudonymous token attached at write time so the eventual NCOE-bound
  -- payload contains no real identity. Per spec §12.3, real identity is
  -- only resolved at spinout time on the NCOE side.
  player_pseudonym  text NULL
);

COMMENT ON TABLE public.substrate_telemetry_events_buffer IS
  'Local Substrate telemetry buffer drained nightly by the Phase 1+ '
  'transport worker. Per AEGIS_BUILD_SPEC.md §12.2 + §12.3. Payloads '
  'use pseudonymous player_pseudonym, never real identity. Contains '
  'NO foreign keys to academy_* tables per the §4.1 firewall.';

CREATE INDEX IF NOT EXISTS substrate_telemetry_events_buffer_user_idx
  ON public.substrate_telemetry_events_buffer (user_id, created_at DESC);

-- Index the un-uploaded events so the Phase 1 nightly drain can find them
-- without a full scan.
CREATE INDEX IF NOT EXISTS substrate_telemetry_events_buffer_pending_idx
  ON public.substrate_telemetry_events_buffer (created_at)
  WHERE uploaded_at IS NULL;

ALTER TABLE public.substrate_telemetry_events_buffer ENABLE ROW LEVEL SECURITY;

-- Owner-only RLS. The Phase 1 nightly transport will run with the
-- service-role key, which bypasses RLS, so we deliberately do NOT add a
-- service-role policy here — that would broaden the surface unnecessarily.
DROP POLICY IF EXISTS "substrate_telemetry_buffer_owner_select"
  ON public.substrate_telemetry_events_buffer;
CREATE POLICY "substrate_telemetry_buffer_owner_select"
  ON public.substrate_telemetry_events_buffer
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "substrate_telemetry_buffer_owner_insert"
  ON public.substrate_telemetry_events_buffer;
CREATE POLICY "substrate_telemetry_buffer_owner_insert"
  ON public.substrate_telemetry_events_buffer
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE / DELETE policies for the row owner: telemetry events are
-- write-once. The Phase 1 transport uses the service role to flip
-- uploaded_at after a successful ship-up.

-- ----------------------------------------------------------------------------
-- Audit-trail comment for future contributors
-- ----------------------------------------------------------------------------
-- If you find yourself wanting to:
--   * Add a column referencing academy_promoted, ecfl_eligible, ecfl_score …
--   * Add a JOIN clause across substrate_* and academy_* …
--   * Promote a Substrate Briefing into Academy curriculum …
-- STOP. Per §4.1 these are explicit non-features. Academy has its own
-- pipeline + governance; Substrate cannot promote into it. Any such
-- "cross-system promotion" is a separate process owned by Academy's
-- governance, not a feature of THIS schema.
-- ============================================================================
