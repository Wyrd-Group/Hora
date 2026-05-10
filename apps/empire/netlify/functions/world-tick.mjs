/**
 * Netlify Scheduled Function: World Tick
 * Runs every 5 minutes.
 *
 * - Decays all route traffic by 2%
 * - Deletes dead routes (traffic < 0.5 and inactive > 24h)
 * - Archives expired world events (expired > 24h)
 * - Purges player actions older than 30 days
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async () => {
  const results = { routeDecay: null, eventArchive: null, actionPurge: null };

  try {
    // 1. Decay route traffic & prune dead routes
    const { error: decayErr } = await supabase.rpc('decay_route_traffic');
    results.routeDecay = decayErr ? decayErr.message : 'ok';

    // 2. Archive expired events
    const { error: archiveErr } = await supabase.rpc('archive_expired_events');
    results.eventArchive = archiveErr ? archiveErr.message : 'ok';

    // 3. Purge old player actions (30-day TTL)
    const { error: purgeErr } = await supabase.rpc('purge_old_actions');
    results.actionPurge = purgeErr ? purgeErr.message : 'ok';

    // 4. Auto-archive inactive ventures (0 purchases + 0 upvotes after 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: archiveVenturesErr } = await supabase
      .from('world_nodes')
      .update({ status: 'removed' })
      .eq('status', 'active')
      .eq('purchase_count', 0)
      .eq('upvotes', 0)
      .lt('created_at', sevenDaysAgo);

    results.ventureArchive = archiveVenturesErr ? archiveVenturesErr.message : 'ok';

    console.log('[world-tick] Results:', results);
  } catch (err) {
    console.error('[world-tick] Error:', err);
  }
};

export const config = {
  schedule: '*/5 * * * *',
};
