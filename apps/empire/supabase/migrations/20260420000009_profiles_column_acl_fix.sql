-- ============================================================================
-- Profiles column-level ACL (fix for migration 20260420000008)
-- ============================================================================
-- The previous migration issued column-level REVOKE SELECT on (role, is_admin,
-- is_beta_tester) but Postgres still allowed reads because the table-level
-- SELECT grant to authenticated/anon was untouched. Column-level REVOKE only
-- affects column-level GRANTs; a table-level GRANT authorizes every column
-- regardless.
--
-- To actually block per-column reads we must:
--   1. REVOKE the table-level SELECT from authenticated and anon
--   2. GRANT SELECT only on the safe column list back to them
--
-- After this, `SELECT is_admin FROM profiles` returns
--   ERROR:  permission denied for column is_admin
-- for authenticated and anon roles, while
--   SELECT id, display_name, game_state, country_code, created_at, updated_at
-- continues to work.
--
-- service_role is untouched (keeps full table SELECT via its own grant path).
-- INSERT / UPDATE / REFERENCES grants are untouched — writes are governed by
-- RLS policies and the profiles_privilege_guard trigger.
--
-- The client reads its own privilege flags via the SECURITY DEFINER helper
-- RPCs public.current_user_is_admin() and public.current_user_is_beta_tester(),
-- which bypass the column-level grants because they run as postgres.
-- ============================================================================

REVOKE SELECT ON public.profiles FROM authenticated, anon;

GRANT SELECT (id, display_name, game_state, created_at, updated_at, country_code)
  ON public.profiles TO authenticated, anon;

-- Ensure service_role retains full SELECT (edge functions, admin helpers).
GRANT SELECT ON public.profiles TO service_role;
