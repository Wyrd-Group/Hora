-- ============================================================================
-- Regulatory Agents — weekly cron schedule
-- ============================================================================
-- Runs every Monday 03:15 UTC (quiet hours across most EU/Americas):
--   1. Researcher sweeps all active regulatory_sources, writes pending facts
--   2. Updater diffs pending against approved, auto-approves unchanged,
--      queues value changes for human review
--
-- Requires: pg_cron extension (Supabase Pro has it enabled) and pg_net for
-- HTTP calls to Edge Functions. The CRON_SECRET must be set via Supabase
-- Vault or as an Edge Function secret.
--
-- To configure after applying this migration:
--   1. Set CRON_SECRET in Supabase dashboard → Edge Functions → Secrets
--   2. Update the project_url variable below to your Supabase project URL
--   3. Store CRON_SECRET in vault or replace the vault call below with literal
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ----------------------------------------------------------------------------
-- Helper: invoke_edge_function(name)
-- Wraps pg_net.http_post with the standard auth header.
-- Replace the vault.decrypted_secrets lookups with your actual secret names.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION invoke_edge_function(p_function_name text)
RETURNS bigint AS $$
DECLARE
  v_url text;
  v_secret text;
  v_req_id bigint;
BEGIN
  -- Fetch the project URL and cron secret from vault.
  -- Fallback to environment-style lookup if vault isn't available.
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_PROJECT_URL'
  LIMIT 1;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_SECRET'
  LIMIT 1;

  IF v_url IS NULL THEN
    RAISE WARNING 'SUPABASE_PROJECT_URL not in vault — cron will not run';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_url || '/functions/v1/' || p_function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE(v_secret, '')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000  -- 5 min per function
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Weekly sweep: Monday 03:15 UTC
-- First call the researcher, then 20 minutes later the updater (gives the
-- researcher plenty of time to finish on a full source list).
-- ----------------------------------------------------------------------------
SELECT cron.schedule(
  'regulatory-researcher-weekly',
  '15 3 * * 1',                   -- Mondays at 03:15 UTC
  $$SELECT invoke_edge_function('researcher-agent');$$
);

SELECT cron.schedule(
  'regulatory-updater-weekly',
  '35 3 * * 1',                   -- Mondays at 03:35 UTC (20 min after researcher)
  $$SELECT invoke_edge_function('updater-agent');$$
);

-- ----------------------------------------------------------------------------
-- Failure monitoring: sources that have failed 3+ times in a row
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW regulatory_source_health AS
SELECT
  country_code,
  topic,
  source_url,
  source_authority,
  active,
  last_fetched_at,
  last_success_at,
  fetch_failures_in_row,
  CASE
    WHEN NOT active THEN 'disabled'
    WHEN fetch_failures_in_row >= 5 THEN 'failing'
    WHEN fetch_failures_in_row >= 2 THEN 'degraded'
    WHEN last_success_at IS NULL THEN 'never_fetched'
    WHEN last_success_at < now() - interval '30 days' THEN 'stale'
    ELSE 'healthy'
  END AS health
FROM regulatory_sources;

COMMENT ON VIEW regulatory_source_health IS
  'Operational status of each regulatory source — check weekly.';

-- ----------------------------------------------------------------------------
-- Convenience: manual sweep for admin dashboard "Run now" button.
-- Exposed via SECURITY DEFINER so authenticated admins can trigger without
-- service role key.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_regulatory_sweep()
RETURNS jsonb AS $$
DECLARE
  v_researcher bigint;
  v_updater bigint;
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
  ) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  v_researcher := invoke_edge_function('researcher-agent');

  -- Note: we don't wait — caller polls review_queue for new rows.
  RETURN jsonb_build_object(
    'researcher_request_id', v_researcher,
    'note', 'Researcher invoked. Updater runs via scheduled cron; call updater-agent directly for immediate diff.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
