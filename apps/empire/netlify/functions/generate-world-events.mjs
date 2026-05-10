/**
 * Netlify Scheduled Function: Generate World Events
 * Runs every 15 minutes.
 *
 * 1. Aggregates recent player actions by H3 region
 * 2. Detects patterns (density spikes, route surges, mass exits)
 * 3. Generates world events with effects and expiry
 * 4. Inserts events → Supabase Realtime broadcasts to all clients
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Event templates with effects
const EVENT_TEMPLATES = {
  venture_capital_surge: {
    event_type: 'boom',
    title: 'Venture Capital Surge',
    description: 'Investor activity has spiked in this region, boosting tech and finance ventures.',
    effects: { income_modifier: 0.30 },
    severity: 0.6,
    durationHours: 2,
    sectors: ['tech', 'finance'],
  },
  supply_chain_disruption: {
    event_type: 'disruption',
    title: 'Supply Chain Disruption',
    description: 'A disruption is affecting partnership revenue through this region.',
    effects: { income_modifier: -0.20 },
    severity: 0.5,
    durationHours: 1,
    sectors: null,
  },
  regulatory_crackdown: {
    event_type: 'crisis',
    title: 'Regulatory Crackdown',
    description: 'Regulators are tightening rules on pharma and finance in this region.',
    effects: { cost_modifier: 0.40 },
    severity: 0.7,
    durationHours: 3,
    sectors: ['pharma', 'finance'],
  },
  talent_migration: {
    event_type: 'opportunity',
    title: 'Talent Migration',
    description: 'Skilled workers are migrating to this region, reducing hiring costs.',
    effects: { cost_modifier: -0.15 },
    severity: 0.4,
    durationHours: 2,
    sectors: null,
  },
  startup_hub_formation: {
    event_type: 'boom',
    title: 'Startup Hub Formation',
    description: 'High venture density has created an ecosystem effect — higher costs but stronger income.',
    effects: { income_modifier: 0.40, cost_modifier: 0.50 },
    severity: 0.8,
    durationHours: 4,
    sectors: null,
  },
  market_correction: {
    event_type: 'bust',
    title: 'Market Correction',
    description: 'A wave of venture failures has shaken investor confidence in this region.',
    effects: { income_modifier: -0.25 },
    severity: 0.6,
    durationHours: 2,
    sectors: null,
  },
};

export default async () => {
  try {
    // 1. Get recent player actions grouped by H3 region (last 30 min)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: actions, error: actionsErr } = await supabase
      .from('player_actions')
      .select('action_type, h3_index')
      .gt('created_at', thirtyMinAgo)
      .not('h3_index', 'is', null);

    if (actionsErr || !actions || actions.length === 0) return;

    // 2. Aggregate by region
    const regionActivity = {};
    for (const action of actions) {
      if (!action.h3_index) continue;
      if (!regionActivity[action.h3_index]) {
        regionActivity[action.h3_index] = { total: 0, types: {} };
      }
      regionActivity[action.h3_index].total++;
      regionActivity[action.h3_index].types[action.action_type] =
        (regionActivity[action.h3_index].types[action.action_type] || 0) + 1;
    }

    // 3. Detect patterns and generate events
    const newEvents = [];
    const now = new Date();

    for (const [h3, activity] of Object.entries(regionActivity)) {
      // High venture founding density → Startup Hub
      if ((activity.types.venture_founded || 0) >= 5) {
        const template = EVENT_TEMPLATES.startup_hub_formation;
        newEvents.push({
          event_type: template.event_type,
          region_h3: h3,
          sector: null,
          title: template.title,
          description: template.description,
          effects: template.effects,
          severity: template.severity,
          source: 'player_action',
          expires_at: new Date(now.getTime() + template.durationHours * 3600000).toISOString(),
        });
      }
      // High investment activity → VC Surge
      else if ((activity.types.venture_invested || 0) >= 10) {
        const template = EVENT_TEMPLATES.venture_capital_surge;
        newEvents.push({
          event_type: template.event_type,
          region_h3: h3,
          sector: 'tech',
          title: template.title,
          description: template.description,
          effects: template.effects,
          severity: template.severity,
          source: 'player_action',
          expires_at: new Date(now.getTime() + template.durationHours * 3600000).toISOString(),
        });
      }
      // General high activity → Talent migration
      else if (activity.total >= 15) {
        const template = EVENT_TEMPLATES.talent_migration;
        newEvents.push({
          event_type: template.event_type,
          region_h3: h3,
          sector: null,
          title: template.title,
          description: template.description,
          effects: template.effects,
          severity: template.severity,
          source: 'player_action',
          expires_at: new Date(now.getTime() + template.durationHours * 3600000).toISOString(),
        });
      }
    }

    // 4. Random global events (10% chance per tick)
    if (Math.random() < 0.10) {
      const templates = Object.values(EVENT_TEMPLATES);
      const template = templates[Math.floor(Math.random() * templates.length)];
      newEvents.push({
        event_type: template.event_type,
        region_h3: null,
        sector: template.sectors ? template.sectors[Math.floor(Math.random() * template.sectors.length)] : null,
        title: `Global: ${template.title}`,
        description: template.description,
        effects: template.effects,
        severity: template.severity * 0.5, // global events are less severe
        source: 'system',
        expires_at: new Date(now.getTime() + template.durationHours * 3600000).toISOString(),
      });
    }

    // 5. Insert events
    if (newEvents.length > 0) {
      const { error: insertErr } = await supabase.from('world_events').insert(newEvents);
      if (insertErr) {
        console.error('[generate-world-events] Insert error:', insertErr);
      } else {
        console.log(`[generate-world-events] Generated ${newEvents.length} events`);
      }
    }
  } catch (err) {
    console.error('[generate-world-events] Error:', err);
  }
};

export const config = {
  schedule: '*/15 * * * *',
};
