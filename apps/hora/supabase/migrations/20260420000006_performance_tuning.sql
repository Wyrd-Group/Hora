-- ============================================================================
-- Performance tuning — closes perf advisor findings
-- ============================================================================
-- Fixes:
--   #8  41 RLS policies re-evaluate auth.uid()/auth.role() per row. Postgres
--       optimizer can turn them into an initplan (one-shot scalar) if wrapped
--       as `(SELECT auth.uid())`. Mechanical rewrite, no behavior change.
--   #9  Overlapping permissive policies on jurisdictional_facts + regulatory_sources
--       each run on every query. Merged into single policies with OR clauses.
--   #10 15 foreign keys without covering indexes — slow JOINs, slow cascading
--       deletes. Add B-tree indexes on each.
-- ============================================================================

-- ============================================================================
-- Part 1: Wrap auth.xxx() in (SELECT auth.xxx()) across every policy in public
-- ============================================================================
-- This is an idempotent rewrite: we only touch policies whose expressions
-- contain a BARE auth.<fn>() call, i.e. not already prefixed by "(select ".
-- For each matching policy: DROP, then CREATE with the wrapped expression.
DO $rewrite$
DECLARE
  r record;
  new_using text;
  new_check text;
  roles_list text;
  using_clause text;
  check_clause text;
  rewritten_count int := 0;
BEGIN
  FOR r IN
    SELECT
      p.schemaname,
      p.tablename,
      p.policyname,
      p.cmd,
      p.roles::text[] AS roles_array,
      pg_get_expr(pp.polqual, pp.polrelid) AS using_expr,
      pg_get_expr(pp.polwithcheck, pp.polrelid) AS check_expr,
      pp.polpermissive
    FROM pg_policies p
    JOIN pg_policy pp ON pp.polname = p.policyname
    JOIN pg_class c ON c.oid = pp.polrelid AND c.relname = p.tablename
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = p.schemaname
    WHERE p.schemaname = 'public'
      AND (
        (
          pg_get_expr(pp.polqual, pp.polrelid) ~ 'auth\.\w+\s*\('
          AND pg_get_expr(pp.polqual, pp.polrelid) !~ '\(\s*[sS][eE][lL][eE][cC][tT]\s+auth\.'
        )
        OR (
          pg_get_expr(pp.polwithcheck, pp.polrelid) ~ 'auth\.\w+\s*\('
          AND pg_get_expr(pp.polwithcheck, pp.polrelid) !~ '\(\s*[sS][eE][lL][eE][cC][tT]\s+auth\.'
        )
      )
  LOOP
    new_using := regexp_replace(r.using_expr,  'auth\.(\w+)\(\)', '(SELECT auth.\1())', 'g');
    new_check := regexp_replace(r.check_expr,  'auth\.(\w+)\(\)', '(SELECT auth.\1())', 'g');

    roles_list := replace(replace(array_to_string(r.roles_array, ','), '{', ''), '}', '');

    using_clause := CASE WHEN new_using IS NOT NULL THEN ' USING (' || new_using || ')' ELSE '' END;
    check_clause := CASE WHEN new_check IS NOT NULL THEN ' WITH CHECK (' || new_check || ')' ELSE '' END;

    EXECUTE format('DROP POLICY %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      r.policyname, r.schemaname, r.tablename,
      CASE WHEN r.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      r.cmd,
      roles_list,
      using_clause, check_clause
    );

    rewritten_count := rewritten_count + 1;
    RAISE NOTICE 'Rewrote policy %.% / %', r.schemaname, r.tablename, r.policyname;
  END LOOP;

  RAISE NOTICE 'Total policies rewritten: %', rewritten_count;
END $rewrite$;

-- ============================================================================
-- Part 2: Merge overlapping permissive policies (2 tables, 2 merges)
-- ============================================================================
-- Each SELECT on these tables was running BOTH policies. Merging into a single
-- OR-combined policy halves the RLS work per query.

-- jurisdictional_facts: public sees approved, admins see everything
DROP POLICY IF EXISTS approved_facts_public_read ON public.jurisdictional_facts;
DROP POLICY IF EXISTS admin_full_read_facts      ON public.jurisdictional_facts;
CREATE POLICY jurisdictional_facts_read ON public.jurisdictional_facts
  FOR SELECT
  USING (status = 'approved' OR public.current_user_is_admin());

-- regulatory_sources: public sees active, admins see everything
DROP POLICY IF EXISTS active_sources_public_read ON public.regulatory_sources;
DROP POLICY IF EXISTS admin_full_read_sources    ON public.regulatory_sources;
CREATE POLICY regulatory_sources_read ON public.regulatory_sources
  FOR SELECT
  USING (active = true OR public.current_user_is_admin());

-- ============================================================================
-- Part 3: Covering indexes on foreign keys (15 columns)
-- ============================================================================
-- Without these, JOINs and ON DELETE CASCADE do full table scans. Adding
-- B-tree indexes is cheap and scales linearly with table growth.

CREATE INDEX IF NOT EXISTS idx_countries_leader_id                ON public.countries(leader_id);
CREATE INDEX IF NOT EXISTS idx_countries_puppet_master_id         ON public.countries(puppet_master_id);
CREATE INDEX IF NOT EXISTS idx_elections_winner_id                ON public.elections(winner_id);
CREATE INDEX IF NOT EXISTS idx_fact_change_log_review_id          ON public.fact_change_log(review_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_host_id                 ON public.game_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_jurisdictional_facts_source_id     ON public.jurisdictional_facts(source_id);
CREATE INDEX IF NOT EXISTS idx_jurisdictional_facts_superseded_by ON public.jurisdictional_facts(superseded_by);
CREATE INDEX IF NOT EXISTS idx_lobbying_campaigns_proposer_id     ON public.lobbying_campaigns(proposer_id);
CREATE INDEX IF NOT EXISTS idx_political_actions_government_id    ON public.political_actions(government_id);
CREATE INDEX IF NOT EXISTS idx_referendums_proposer_id            ON public.referendums(proposer_id);
CREATE INDEX IF NOT EXISTS idx_review_queue_new_fact_id           ON public.review_queue(new_fact_id);
CREATE INDEX IF NOT EXISTS idx_review_queue_previous_fact_id      ON public.review_queue(previous_fact_id);
CREATE INDEX IF NOT EXISTS idx_social_follows_following_id        ON public.social_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_author_id             ON public.social_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_world_routes_creator_id            ON public.world_routes(creator_id);

-- Note: "unused indexes" (31 of them) are NOT dropped in this migration.
-- Most are on recently-created tables that simply haven't been queried yet in
-- prod. Dropping them based on pg_stat_user_indexes when the table has seen
-- no traffic is a false positive. Revisit after 30 days of real traffic.
