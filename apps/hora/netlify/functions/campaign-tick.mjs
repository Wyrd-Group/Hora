/**
 * Netlify Scheduled Function: Campaign Tick
 * Runs every 30 seconds via pg_cron.
 *
 * Server-authoritative game loop for Campaign and Private servers:
 *  - Advances game clock (game_tick, game_day, game_month)
 *  - Ticks instrument prices using seeded RNG (same seed = same prices for everyone)
 *  - Processes world events (random chance per tick)
 *  - Updates offline player balances (node income continues)
 *  - Broadcasts tick via Supabase Realtime
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── Seeded RNG (deterministic prices per server) ──────────────────

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── Default instruments ──────────────────────────────────────────

const DEFAULT_INSTRUMENTS = [
  { id: 'AAPL',  symbol: 'AAPL',  basePrice: 178.50, volatility: 0.008 },
  { id: 'MSFT',  symbol: 'MSFT',  basePrice: 415.20, volatility: 0.007 },
  { id: 'TSLA',  symbol: 'TSLA',  basePrice: 245.80, volatility: 0.020 },
  { id: 'NVDA',  symbol: 'NVDA',  basePrice: 875.30, volatility: 0.015 },
  { id: 'AMZN',  symbol: 'AMZN',  basePrice: 185.90, volatility: 0.009 },
  { id: 'GOOG',  symbol: 'GOOG',  basePrice: 155.20, volatility: 0.008 },
  { id: 'META',  symbol: 'META',  basePrice: 502.40, volatility: 0.012 },
  { id: 'JPM',   symbol: 'JPM',   basePrice: 198.30, volatility: 0.006 },
  { id: 'BTC',   symbol: 'BTC',   basePrice: 67420,  volatility: 0.025 },
  { id: 'ETH',   symbol: 'ETH',   basePrice: 3520,   volatility: 0.022 },
  { id: 'SOL',   symbol: 'SOL',   basePrice: 148.20, volatility: 0.030 },
  { id: 'EUR/USD', symbol: 'EUR/USD', basePrice: 1.0845, volatility: 0.003 },
  { id: 'GBP/EUR', symbol: 'GBP/EUR', basePrice: 1.1620, volatility: 0.003 },
  { id: 'GOLD',  symbol: 'GOLD',  basePrice: 2340,   volatility: 0.005 },
  { id: 'OIL',   symbol: 'OIL',   basePrice: 78.50,  volatility: 0.012 },
];

// ── World event templates ────────────────────────────────────────

const EVENT_TEMPLATES = [
  { type: 'earnings', title: 'Tech Earnings Beat', desc: 'Major tech company reported earnings above expectations.', impact: { AAPL: 0.02, MSFT: 0.015, NVDA: 0.025 } },
  { type: 'fed', title: 'Fed Rate Decision', desc: 'Federal Reserve announces rate hold, markets react.', impact: { JPM: -0.01, BTC: 0.03, GOLD: 0.01 } },
  { type: 'geopolitical', title: 'Trade Tensions Rise', desc: 'New tariffs announced between major economies.', impact: { AAPL: -0.015, AMZN: -0.01, OIL: 0.02 } },
  { type: 'crypto', title: 'Crypto Regulatory News', desc: 'Major economy announces new crypto regulations.', impact: { BTC: -0.04, ETH: -0.035, SOL: -0.05 } },
  { type: 'energy', title: 'OPEC Production Cut', desc: 'OPEC+ announces surprise production cut.', impact: { OIL: 0.05, TSLA: 0.02, GOLD: 0.01 } },
  { type: 'ai', title: 'AI Breakthrough Announced', desc: 'Major AI research lab announces new model capabilities.', impact: { NVDA: 0.04, MSFT: 0.02, GOOG: 0.025, META: 0.02 } },
  { type: 'banking', title: 'Bank Stress Test Results', desc: 'Major banks pass stress tests with strong capital ratios.', impact: { JPM: 0.02, 'EUR/USD': 0.005 } },
  { type: 'macro', title: 'GDP Growth Surprise', desc: 'Quarterly GDP growth exceeds forecasts significantly.', impact: { AAPL: 0.01, MSFT: 0.01, JPM: 0.015, AMZN: 0.01 } },
];

// ── Main tick handler ────────────────────────────────────────────

export default async () => {
  const results = { serversProcessed: 0, errors: [] };

  try {
    // Fetch all active servers
    const { data: servers, error: fetchErr } = await supabase
      .from('campaign_servers')
      .select('*')
      .eq('status', 'active');

    if (fetchErr || !servers) {
      console.error('[campaign-tick] Failed to fetch servers:', fetchErr);
      return;
    }

    for (const server of servers) {
      try {
        await processServerTick(server);
        results.serversProcessed++;
      } catch (err) {
        results.errors.push(`${server.id}: ${err.message}`);
      }
    }

    console.log(`[campaign-tick] Processed ${results.serversProcessed} servers, ${results.errors.length} errors`);
  } catch (err) {
    console.error('[campaign-tick] Fatal error:', err);
  }
};

async function processServerTick(server) {
  const newTick = server.game_tick + 1;

  // 1 in-game day = 120 ticks (= 1 hour at 30s/tick)
  const TICKS_PER_DAY = 120;
  const TICKS_PER_MONTH = TICKS_PER_DAY * 21; // 21 trading days
  const gameDay = Math.floor(newTick / TICKS_PER_DAY) + 1;
  const gameMonth = Math.floor(newTick / TICKS_PER_MONTH) + 1;

  // ── Price tick with seeded RNG ──────────────────────────────
  const rng = seededRandom(server.seed + newTick);

  // Load current prices or initialize
  let { data: priceRows } = await supabase
    .from('campaign_prices')
    .select('instrument_id, price')
    .eq('server_id', server.id);

  const currentPrices = {};
  if (priceRows && priceRows.length > 0) {
    for (const row of priceRows) currentPrices[row.instrument_id] = row.price;
  }

  const updatedInstruments = DEFAULT_INSTRUMENTS.map(inst => {
    const prevPrice = currentPrices[inst.id] || inst.basePrice;
    const noise = (rng() - 0.5) * 2 * inst.volatility;
    const drift = 0.0001; // slight upward bias
    const newPrice = Math.max(inst.basePrice * 0.1, prevPrice * (1 + noise + drift));
    const changePct = ((newPrice - prevPrice) / prevPrice) * 100;

    return {
      id: inst.id,
      symbol: inst.symbol,
      price: Math.round(newPrice * 100) / 100,
      change_pct: Math.round(changePct * 100) / 100,
    };
  });

  // Upsert prices
  const priceUpserts = updatedInstruments.map(i => ({
    server_id: server.id,
    instrument_id: i.id,
    price: i.price,
    updated_at: new Date().toISOString(),
  }));

  await supabase
    .from('campaign_prices')
    .upsert(priceUpserts, { onConflict: 'server_id,instrument_id' });

  // ── World events (5% chance per tick) ───────────────────────
  let worldEvent = null;
  if (rng() < 0.05) {
    const template = EVENT_TEMPLATES[Math.floor(rng() * EVENT_TEMPLATES.length)];
    worldEvent = {
      id: `evt-${server.id}-${newTick}`,
      type: template.type,
      title: template.title,
      description: template.desc,
      market_impact: template.impact,
      created_at: Date.now(),
    };

    // Apply event impacts to prices
    for (const [instId, impact] of Object.entries(template.impact)) {
      const inst = updatedInstruments.find(i => i.id === instId);
      if (inst) {
        inst.price = Math.round(inst.price * (1 + impact) * 100) / 100;
        inst.change_pct = Math.round((inst.change_pct + impact * 100) * 100) / 100;
      }
    }
  }

  // ── Update server state ─────────────────────────────────────
  await supabase
    .from('campaign_servers')
    .update({ game_tick: newTick, game_day: gameDay, game_month: gameMonth })
    .eq('id', server.id);

  // ── Process offline player income (every day = every 120 ticks) ──
  if (newTick % TICKS_PER_DAY === 0) {
    // Get all players for this server
    const { data: players } = await supabase
      .from('campaign_players')
      .select('user_id, company_balance, nodes_owned')
      .eq('server_id', server.id);

    if (players) {
      for (const player of players) {
        // Simple daily income: €500 per node owned
        const dailyIncome = player.nodes_owned * 500;
        if (dailyIncome > 0) {
          await supabase
            .from('campaign_players')
            .update({
              company_balance: player.company_balance + dailyIncome,
              net_worth: player.company_balance + dailyIncome,
            })
            .eq('server_id', server.id)
            .eq('user_id', player.user_id);
        }
      }
    }
  }

  // ── Broadcast tick to all connected clients ─────────────────
  const tickPayload = {
    instruments: updatedInstruments,
    game_tick: newTick,
    game_day: gameDay,
    game_month: gameMonth,
    timestamp: Date.now(),
  };

  await supabase.channel(`campaign-tick-${server.id}`).send({
    type: 'broadcast',
    event: 'price_tick',
    payload: tickPayload,
  }).catch(() => {});

  // Broadcast world event if generated
  if (worldEvent) {
    await supabase.channel(`campaign-tick-${server.id}`).send({
      type: 'broadcast',
      event: 'world_event',
      payload: worldEvent,
    }).catch(() => {});
  }

  // ── Check private server duration ───────────────────────────
  if (server.server_type === 'private' && server.rules?.duration_hours > 0) {
    const createdAt = new Date(server.created_at).getTime();
    const durationMs = server.rules.duration_hours * 60 * 60 * 1000;
    if (Date.now() - createdAt > durationMs) {
      await supabase
        .from('campaign_servers')
        .update({ status: 'archived' })
        .eq('id', server.id);
    }
  }
}

export const config = {
  schedule: '*/1 * * * *', // Every minute (Netlify minimum). Server processes 2 ticks per call.
};
