/**
 * Netlify Scheduled Function: World Trending
 * Runs every 10 minutes.
 *
 * Computes top 10 trending ventures and emerging sectors,
 * writes to world_meta table for cheap client reads.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async () => {
  try {
    // 1. Top 10 ventures by investor_count (last 24h created or high activity)
    const { data: topNodes, error: topErr } = await supabase
      .from('world_nodes')
      .select('id, name, sector, investor_count, purchase_count')
      .eq('status', 'active')
      .order('investor_count', { ascending: false })
      .limit(10);

    if (topErr) {
      console.error('[world-trending] Top nodes error:', topErr);
      return;
    }

    // 2. Emerging sectors: count ventures per (h3, sector) from last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentNodes, error: recentErr } = await supabase
      .from('world_nodes')
      .select('h3_index, sector')
      .eq('status', 'active')
      .gt('created_at', oneDayAgo);

    let emergingSectors = [];
    if (!recentErr && recentNodes) {
      const sectorGrowth = {};
      for (const node of recentNodes) {
        const key = `${node.h3_index}:${node.sector}`;
        sectorGrowth[key] = (sectorGrowth[key] || 0) + 1;
      }

      emergingSectors = Object.entries(sectorGrowth)
        .map(([key, count]) => {
          const [h3, sector] = key.split(':');
          return { h3, sector, growth: count / Math.max(1, recentNodes.length) };
        })
        .sort((a, b) => b.growth - a.growth)
        .slice(0, 5);
    }

    // 3. Write to world_meta
    const trending = {
      top_nodes: (topNodes || []).map(n => ({
        id: n.id,
        name: n.name,
        sector: n.sector,
        investor_count: n.investor_count,
      })),
      emerging_sectors: emergingSectors,
    };

    const { error: updateErr } = await supabase
      .from('world_meta')
      .update({ trending, updated_at: new Date().toISOString() })
      .eq('id', 'global');

    if (updateErr) {
      console.error('[world-trending] Update error:', updateErr);
    } else {
      console.log(`[world-trending] Updated: ${topNodes?.length || 0} top nodes, ${emergingSectors.length} emerging sectors`);
    }
  } catch (err) {
    console.error('[world-trending] Error:', err);
  }
};

export const config = {
  schedule: '*/10 * * * *',
};
