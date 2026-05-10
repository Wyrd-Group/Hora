-- ============================================================================
-- Security hardening — closes findings from Supabase linter
-- ============================================================================
-- Fixes:
--   #1  market_prices: drop permissive UPDATE policy (anyone could rewrite
--       prices). SECURITY DEFINER fns (tick_market, execute_trade) bypass RLS.
--   #2  ARES tables: drop permissive INSERT policies (any authenticated user
--       could pollute the AI feed). Edge functions (service_role) bypass RLS.
--   #3  regulatory_source_health view: flip to security_invoker so RLS is
--       enforced as the caller, not the view creator.
--   #4  telemetry_rollups: add admin-read policy (table had RLS enabled with
--       zero policies, effectively locking everything except service_role).
--   #5  21 existing functions get SET search_path = public pinned so they
--       can't be hijacked by schema-manipulation attacks.
-- ============================================================================

-- ─── 1. market_prices ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated can update market prices via RPC" ON public.market_prices;
-- No replacement needed: tick_market() and execute_trade() run SECURITY DEFINER
-- as postgres and bypass RLS. Client-initiated writes are now impossible.

-- ─── 2. ARES intel tables ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated insert ares_brain_entries"  ON public.ares_brain_entries;
DROP POLICY IF EXISTS "Authenticated insert ares_feed_snapshots" ON public.ares_feed_snapshots;
DROP POLICY IF EXISTS "Authenticated insert ares_intel_briefs"   ON public.ares_intel_briefs;
DROP POLICY IF EXISTS "Authenticated insert ares_vision_reports" ON public.ares_vision_reports;
-- SELECT policies remain (authenticated users can still read the AI feed).
-- Writes now only succeed via service_role (edge functions / cron).

-- ─── 3. regulatory_source_health view ─────────────────────────────────────
-- Postgres views default to security_invoker = false, which means they run
-- as the view's owner and bypass RLS on referenced tables. Flip to invoker.
ALTER VIEW public.regulatory_source_health SET (security_invoker = true);

-- ─── 4. telemetry_rollups: admin-read, service writes ─────────────────────
CREATE POLICY admin_read_telemetry_rollups ON public.telemetry_rollups
  FOR SELECT USING (public.current_user_is_admin());
-- Inserts happen via batch_insert_telemetry / aggregate jobs which run as
-- service_role and bypass RLS.

-- ─── 5. Pin search_path on every existing function ────────────────────────
-- Prevents the "search_path hijack" class of attacks: if an attacker can
-- create a function or operator in a higher-priority schema, they could
-- shadow public.* symbols referenced by SECURITY DEFINER functions.
ALTER FUNCTION public.approve_review(uuid, uuid, text)              SET search_path = public;
ALTER FUNCTION public.archive_expired_events()                       SET search_path = public;
ALTER FUNCTION public.attempt_coup(uuid, text, integer)              SET search_path = public;
ALTER FUNCTION public.batch_insert_telemetry(jsonb)                  SET search_path = public;
ALTER FUNCTION public.boost_route_traffic(uuid, real)                SET search_path = public;
ALTER FUNCTION public.current_approved_fact(text, text)              SET search_path = public;
ALTER FUNCTION public.decay_route_traffic()                          SET search_path = public;
ALTER FUNCTION public.execute_trade(text, text, numeric, numeric)    SET search_path = public;
ALTER FUNCTION public.get_active_events(text[])                      SET search_path = public;
ALTER FUNCTION public.handle_new_user()                              SET search_path = public;
ALTER FUNCTION public.handle_updated_at()                            SET search_path = public;
ALTER FUNCTION public.invoke_edge_function(text)                     SET search_path = public;
ALTER FUNCTION public.lobby_for(uuid, bigint, text)                  SET search_path = public;
ALTER FUNCTION public.purchase_world_node(uuid, uuid)                SET search_path = public;
ALTER FUNCTION public.purge_old_actions()                            SET search_path = public;
ALTER FUNCTION public.reject_review(uuid, uuid, text)                SET search_path = public;
ALTER FUNCTION public.set_updated_at()                               SET search_path = public;
ALTER FUNCTION public.sign_referendum(uuid, uuid)                    SET search_path = public;
ALTER FUNCTION public.tick_market()                                  SET search_path = public;
ALTER FUNCTION public.trigger_regulatory_sweep()                     SET search_path = public;
ALTER FUNCTION public.vote_referendum(uuid, uuid, text)              SET search_path = public;

-- ─── Verification comments ────────────────────────────────────────────────
COMMENT ON POLICY admin_read_telemetry_rollups ON public.telemetry_rollups IS
  'Only admins can read rollups. Writes are service-role only (cron jobs).';
