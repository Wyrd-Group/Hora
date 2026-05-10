-- ============================================================================
-- Profiles column-level ACL
-- ============================================================================
-- The existing "Anyone can read profiles" SELECT policy on profiles uses
-- USING (true), which means every authenticated user can read every column
-- on every profile row - including the privilege columns (role, is_admin,
-- is_beta_tester). Those columns were never meant to be public: they're
-- used by the client only to render admin / dev UI for the signed-in user.
--
-- Postgres RLS can't scope a single policy per-column. We use column-level
-- REVOKE instead. After this migration:
--
--   * `SELECT id, display_name, game_state, country_code, ... FROM profiles`
--     continues to work for every authenticated user (leaderboards, search,
--     social feed all still read cross-user rows).
--
--   * `SELECT is_admin, role, is_beta_tester FROM profiles` errors with
--     "permission denied for column" for both anon and authenticated roles.
--     Even the row owner can no longer read their own privilege flags via a
--     direct column select.
--
--   * The client reads its own privilege flags via the helper RPCs
--     `public.current_user_is_admin()` and `public.current_user_is_beta_tester()`
--     which are SECURITY DEFINER and run as postgres, so they bypass the
--     column grants and return the correct scalar for the caller.
--
--   * service_role bypasses all of this (it has BYPASSRLS and implicit
--     grants). Edge functions continue to read/write privilege columns
--     normally.
--
-- Two RLS policies elsewhere in the schema (admin_full_read_queue on
-- review_queue, admin_full_read_log on fact_change_log) used the pattern
-- `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin)`
-- in their USING clause. Because the subquery is evaluated as the invoking
-- user, the column REVOKE would break those admin reads. We rewrite them
-- here to use public.current_user_is_admin() (already SECURITY DEFINER)
-- so the behaviour is preserved without relying on direct column access.
-- ============================================================================

-- ─── 1. Refactor the two remaining RLS policies that read privilege cols ───
DROP POLICY IF EXISTS admin_full_read_queue ON public.review_queue;
CREATE POLICY admin_full_read_queue
  ON public.review_queue FOR SELECT
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS admin_full_read_log ON public.fact_change_log;
CREATE POLICY admin_full_read_log
  ON public.fact_change_log FOR SELECT
  USING (public.current_user_is_admin());

-- ─── 2. REVOKE column-level SELECT on the three privilege columns ─────────
-- Idempotent: REVOKE on an already-revoked grant is a no-op.
REVOKE SELECT (role)           ON public.profiles FROM authenticated, anon;
REVOKE SELECT (is_admin)       ON public.profiles FROM authenticated, anon;
REVOKE SELECT (is_beta_tester) ON public.profiles FROM authenticated, anon;

-- Paranoia: make sure non-privilege columns remain readable. In practice the
-- table-level SELECT grant covers these, but spelling it out protects against
-- future REVOKE ALL commands.
-- (We intentionally do NOT enumerate every safe column here - that's
--  brittle when new columns are added. The default table-level SELECT grant
--  still applies to any column not explicitly revoked.)

-- ─── 3. Verification comment ──────────────────────────────────────────────
COMMENT ON COLUMN public.profiles.is_admin IS
  'Admin flag. REVOKED from anon/authenticated at the column level - read via public.current_user_is_admin() RPC. Only admins can write, enforced by profiles_privilege_guard trigger.';

COMMENT ON COLUMN public.profiles.role IS
  'Optional admin role string (''admin'' | NULL). REVOKED from anon/authenticated at the column level - read via public.current_user_is_admin() RPC.';

COMMENT ON COLUMN public.profiles.is_beta_tester IS
  'Beta tester flag - controls DevPanel visibility. REVOKED from anon/authenticated at the column level - read via public.current_user_is_beta_tester() RPC. Admins implicitly include beta powers.';
