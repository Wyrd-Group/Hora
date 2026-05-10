/**
 * Campaign Store — Persistent shared-world multiplayer.
 *
 * Two modes:
 *  1. **Campaign** — persistent 24/7 server, max 100 players, same prices/events for all.
 *     Server runs via Supabase pg_cron + Edge Function. Players join/leave freely.
 *  2. **Private Server** — same engine but room-scoped, host sets rules.
 *
 * Server-authoritative: prices, game clock, and world events come FROM the server.
 * Client sends actions (buy/sell/acquire) which server validates + broadcasts.
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ── Types ────────────────────────────────────────────────────────

export interface CampaignServer {
  id: string;
  seed: number;
  created_at: string;
  game_tick: number;
  game_day: number;
  game_month: number;
  player_count: number;
  max_players: number;
  status: 'active' | 'paused' | 'archived';
  server_type: 'campaign' | 'private';
  // Private server fields
  host_id?: string;
  room_code?: string;
  rules?: ServerRules;
}

export interface ServerRules {
  starting_capital: number;
  duration_hours: number;        // 0 = unlimited
  time_multiplier: number;
  allowed_instruments: string[]; // empty = all
  objectives: string[];
  event_frequency: 'low' | 'medium' | 'high';
}

export interface CampaignPlayer {
  server_id: string;
  user_id: string;
  display_name: string;
  joined_at: string;
  last_seen: string;
  company_balance: number;
  personal_balance: number;
  net_worth: number;
  nodes_owned: number;
  trades_executed: number;
  online: boolean;
}

export interface ServerPriceTick {
  instruments: Array<{
    id: string;
    symbol: string;
    price: number;
    change_pct: number;
  }>;
  game_tick: number;
  game_day: number;
  game_month: number;
  timestamp: number;
}

export interface ServerWorldEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  market_impact: Record<string, number>;
  created_at: number;
}

// ── State ────────────────────────────────────────────────────────

interface CampaignState {
  // Connection
  connected: boolean;
  serverId: string;
  serverType: 'campaign' | 'private' | null;
  server: CampaignServer | null;

  // Server-synced clock
  gameTick: number;
  gameDay: number;
  gameMonth: number;

  // Server-authoritative prices
  prices: Record<string, { price: number; change_pct: number }>;

  // Players in this server
  players: CampaignPlayer[];
  myRank: number;

  // World events from server
  worldEvents: ServerWorldEvent[];

  // Activity feed (server-broadcast)
  activityFeed: Array<{
    id: string;
    player_name: string;
    action: string;
    detail: string;
    timestamp: number;
  }>;

  // Actions
  joinCampaign: (userId: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  joinPrivateServer: (roomCode: string, userId: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  createPrivateServer: (hostId: string, displayName: string, rules: ServerRules) => Promise<{ success: boolean; roomCode?: string; error?: string }>;
  leave: () => void;
  broadcastAction: (action: string, detail: string) => void;
  syncMyState: (stats: { company_balance: number; personal_balance: number; net_worth: number; nodes_owned: number; trades_executed: number }) => void;
}

// ── Constants ────────────────────────────────────────────────────

const MAX_FEED = 100;
const MAX_EVENTS = 50;

// ── Channel refs ─────────────────────────────────────────────────

let tickChannel: ReturnType<typeof supabase.channel> | null = null;
let feedChannel: ReturnType<typeof supabase.channel> | null = null;
let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

// ── Store ────────────────────────────────────────────────────────

export const useCampaignStore = create<CampaignState>()((set, get) => ({
  connected: false,
  serverId: '',
  serverType: null,
  server: null,
  gameTick: 0,
  gameDay: 1,
  gameMonth: 1,
  prices: {},
  players: [],
  myRank: 0,
  worldEvents: [],
  activityFeed: [],

  // ── Join Campaign (auto-find a server with space) ──────────────

  joinCampaign: async (userId, displayName) => {
    try {
      // Find an active campaign server with space
      const { data: servers, error: fetchErr } = await supabase
        .from('campaign_servers')
        .select('*')
        .eq('status', 'active')
        .eq('server_type', 'campaign')
        .lt('player_count', 100)
        .order('player_count', { ascending: false }) // prefer fuller servers
        .limit(1);

      if (fetchErr) return { success: false, error: fetchErr.message };

      let server: CampaignServer;

      if (!servers || servers.length === 0) {
        // Create a new campaign server
        const seed = Math.floor(Math.random() * 1_000_000);
        const { data: newServer, error: createErr } = await supabase
          .from('campaign_servers')
          .insert({
            seed,
            game_tick: 0,
            game_day: 1,
            game_month: 1,
            player_count: 0,
            max_players: 100,
            status: 'active',
            server_type: 'campaign',
          })
          .select()
          .single();

        if (createErr || !newServer) return { success: false, error: createErr?.message || 'Failed to create server' };
        server = newServer;
      } else {
        server = servers[0];
      }

      // Register player
      const { error: joinErr } = await supabase
        .from('campaign_players')
        .upsert({
          server_id: server.id,
          user_id: userId,
          display_name: displayName,
          last_seen: new Date().toISOString(),
          company_balance: 500_000,
          personal_balance: 0,
          net_worth: 500_000,
          nodes_owned: 0,
          trades_executed: 0,
          online: true,
        }, { onConflict: 'server_id,user_id' });

      if (joinErr) return { success: false, error: joinErr.message };

      // Increment player count
      await supabase.rpc('increment_player_count', { p_server_id: server.id });

      // Subscribe to channels
      subscribeToServer(server.id, userId, displayName, set, get);

      set({
        connected: true,
        serverId: server.id,
        serverType: 'campaign',
        server,
        gameTick: server.game_tick,
        gameDay: server.game_day,
        gameMonth: server.game_month,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // ── Join Private Server ────────────────────────────────────────

  joinPrivateServer: async (roomCode, userId, displayName) => {
    try {
      const { data: server, error: fetchErr } = await supabase
        .from('campaign_servers')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .eq('server_type', 'private')
        .eq('status', 'active')
        .single();

      if (fetchErr || !server) return { success: false, error: 'Server not found or inactive' };
      if (server.player_count >= server.max_players) return { success: false, error: 'Server full' };

      const rules = server.rules as ServerRules || { starting_capital: 500_000 };

      const { error: joinErr } = await supabase
        .from('campaign_players')
        .upsert({
          server_id: server.id,
          user_id: userId,
          display_name: displayName,
          last_seen: new Date().toISOString(),
          company_balance: rules.starting_capital,
          personal_balance: 0,
          net_worth: rules.starting_capital,
          nodes_owned: 0,
          trades_executed: 0,
          online: true,
        }, { onConflict: 'server_id,user_id' });

      if (joinErr) return { success: false, error: joinErr.message };

      await supabase.rpc('increment_player_count', { p_server_id: server.id });

      subscribeToServer(server.id, userId, displayName, set, get);

      set({
        connected: true,
        serverId: server.id,
        serverType: 'private',
        server,
        gameTick: server.game_tick,
        gameDay: server.game_day,
        gameMonth: server.game_month,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // ── Create Private Server ──────────────────────────────────────

  createPrivateServer: async (hostId, displayName, rules) => {
    try {
      const roomCode = generateRoomCode();
      const seed = Math.floor(Math.random() * 1_000_000);

      const { data: server, error } = await supabase
        .from('campaign_servers')
        .insert({
          seed,
          game_tick: 0,
          game_day: 1,
          game_month: 1,
          player_count: 0,
          max_players: rules.duration_hours > 0 ? 20 : 100,
          status: 'active',
          server_type: 'private',
          host_id: hostId,
          room_code: roomCode,
          rules,
        })
        .select()
        .single();

      if (error || !server) return { success: false, error: error?.message || 'Failed to create server' };

      // Host auto-joins
      const joinResult = await get().joinPrivateServer(roomCode, hostId, displayName);
      if (!joinResult.success) return joinResult;

      return { success: true, roomCode };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // ── Leave ──────────────────────────────────────────────────────

  leave: () => {
    const { serverId } = get();

    if (tickChannel) { supabase.removeChannel(tickChannel); tickChannel = null; }
    if (feedChannel) { supabase.removeChannel(feedChannel); feedChannel = null; }
    if (presenceChannel) { supabase.removeChannel(presenceChannel); presenceChannel = null; }

    if (serverId) {
      supabase.rpc('decrement_player_count', { p_server_id: serverId }).then(() => {});
    }

    set({
      connected: false,
      serverId: '',
      serverType: null,
      server: null,
      gameTick: 0,
      gameDay: 1,
      gameMonth: 1,
      prices: {},
      players: [],
      myRank: 0,
      worldEvents: [],
      activityFeed: [],
    });
  },

  // ── Broadcast Action ───────────────────────────────────────────

  broadcastAction: (action, detail) => {
    if (!feedChannel) return;
    feedChannel.send({
      type: 'broadcast',
      event: 'player_action',
      payload: { action, detail, timestamp: Date.now() },
    }).catch(() => {});
  },

  // ── Sync My State ──────────────────────────────────────────────

  syncMyState: (stats) => {
    if (!presenceChannel) return;
    presenceChannel.track(stats).catch(() => {});
  },
}));

// ── Subscribe to Server Channels ─────────────────────────────────

function subscribeToServer(
  serverId: string,
  userId: string,
  displayName: string,
  set: (partial: Partial<CampaignState> | ((s: CampaignState) => Partial<CampaignState>)) => void,
  _get: () => CampaignState,
) {
  // 1. Tick channel — receives server-authoritative price ticks + game clock
  tickChannel = supabase.channel(`campaign-tick-${serverId}`, {
    config: { broadcast: { self: true } },
  });

  tickChannel.on('broadcast', { event: 'price_tick' }, ({ payload }) => {
    if (!payload) return;
    const tick = payload as ServerPriceTick;
    const priceMap: Record<string, { price: number; change_pct: number }> = {};
    for (const inst of tick.instruments) {
      priceMap[inst.id] = { price: inst.price, change_pct: inst.change_pct };
    }
    set({
      prices: priceMap,
      gameTick: tick.game_tick,
      gameDay: tick.game_day,
      gameMonth: tick.game_month,
    });
  });

  tickChannel.on('broadcast', { event: 'world_event' }, ({ payload }) => {
    if (!payload) return;
    set(s => ({
      worldEvents: [payload as ServerWorldEvent, ...s.worldEvents].slice(0, MAX_EVENTS),
    }));
  });

  tickChannel.subscribe();

  // 2. Feed channel — player action broadcasts
  feedChannel = supabase.channel(`campaign-feed-${serverId}`, {
    config: { broadcast: { self: true } },
  });

  feedChannel.on('broadcast', { event: 'player_action' }, ({ payload }) => {
    if (!payload) return;
    set(s => ({
      activityFeed: [{
        id: `${userId}-${payload.timestamp}`,
        player_name: displayName,
        action: payload.action,
        detail: payload.detail,
        timestamp: payload.timestamp,
      }, ...s.activityFeed].slice(0, MAX_FEED),
    }));
  });

  feedChannel.subscribe();

  // 3. Presence channel — track online players + their scores
  presenceChannel = supabase.channel(`campaign-presence-${serverId}`, {
    config: { presence: { key: userId } },
  });

  presenceChannel.on('presence', { event: 'sync' }, () => {
    const state = presenceChannel!.presenceState();
    const players: CampaignPlayer[] = [];

    for (const [uid, presences] of Object.entries(state)) {
      const latest = (presences as any[])[0];
      if (!latest) continue;
      players.push({
        server_id: serverId,
        user_id: uid,
        display_name: latest.display_name || uid,
        joined_at: '',
        last_seen: new Date().toISOString(),
        company_balance: latest.company_balance ?? 0,
        personal_balance: latest.personal_balance ?? 0,
        net_worth: latest.net_worth ?? 0,
        nodes_owned: latest.nodes_owned ?? 0,
        trades_executed: latest.trades_executed ?? 0,
        online: true,
      });
    }

    players.sort((a, b) => b.net_worth - a.net_worth);
    const myRank = players.findIndex(p => p.user_id === userId) + 1;

    set({ players, myRank });
  });

  presenceChannel.subscribe(async (status) => {
    if (status !== 'SUBSCRIBED') return;
    await presenceChannel!.track({
      display_name: displayName,
      company_balance: 500_000,
      personal_balance: 0,
      net_worth: 500_000,
      nodes_owned: 0,
      trades_executed: 0,
    });
  });
}

// ── Local Simulation Engine ──────────────────────────────────────
// When not connected to a server, we can run the ultra-realistic
// simulation engine locally for offline Campaign/Training mode.

import {
  createSimulation,
  simulateTick,
  createCampaignConfig,
  computeBenchmark,
  type SimulationState,
} from '../lib/engines/simulationEngine';
import {
  predict,
  type PredictionResult,
} from '../lib/engines/predictionEngine';
import {
  logPrediction,
  benchmarkAccuracy,
} from '../lib/engines/forecastBridge';

let _localSim: SimulationState | null = null;
let _localSimInterval: ReturnType<typeof setInterval> | null = null;
/**
 * Start a local simulation campaign (offline mode).
 * Uses the ultra-realistic simulation engine with Markov regime transitions,
 * event chains, and cross-asset correlations.
 */
export function startLocalSimulation(
  instruments: Array<{ id: string; symbol: string; price: number }>,
  speedMultiplier: number = 1,
) {
  stopLocalSimulation();

  const config = createCampaignConfig(
    instruments.map(i => ({ symbol: i.symbol, price: i.price })),
    365, // 1 year campaign
  );

  _localSim = createSimulation(config);

  // Initialize prices
  const prices: Record<string, { price: number; change_pct: number }> = {};
  instruments.forEach((inst) => {
    prices[inst.id] = { price: inst.price, change_pct: 0 };
  });

  useCampaignStore.setState({
    connected: true,
    serverType: 'campaign',
    gameTick: 0,
    gameDay: 1,
    gameMonth: 1,
    prices,
  });

  // Tick interval — 1 game tick per second * speed multiplier
  const tickInterval = Math.max(100, 1000 / speedMultiplier);

  _localSimInterval = setInterval(() => {
    if (!_localSim) return;

    const tick = simulateTick(_localSim);

    // Map prices back to instrument IDs
    const updatedPrices: Record<string, { price: number; change_pct: number }> = {};
    instruments.forEach((inst, i) => {
      const newPrice = tick.prices[i];
      const prevPrice = _localSim!.prices[i][_localSim!.prices[i].length - 2] || inst.price;
      const changePct = ((newPrice - prevPrice) / prevPrice) * 100;
      updatedPrices[inst.id] = { price: newPrice, change_pct: changePct };
    });

    // Convert events to world events
    const worldEvents = tick.events.map(e => ({
      id: `sim-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: e.type,
      title: e.description,
      description: `Severity: ${(e.severity * 100).toFixed(0)}% · Duration: ${e.durationDays} days`,
      market_impact: {},
      created_at: Date.now(),
    }));

    useCampaignStore.setState(s => ({
      prices: updatedPrices,
      gameTick: tick.tick,
      gameDay: tick.day,
      gameMonth: Math.floor(tick.day / 30) + 1,
      worldEvents: [...worldEvents, ...s.worldEvents].slice(0, MAX_EVENTS),
    }));
  }, tickInterval);
}

/**
 * Stop the local simulation.
 */
export function stopLocalSimulation() {
  if (_localSimInterval) {
    clearInterval(_localSimInterval);
    _localSimInterval = null;
  }
  _localSim = null;
}

/**
 * Get prediction for a simulated instrument.
 * Used to train and benchmark the prediction engine.
 */
export function getSimulationPrediction(assetIndex: number): PredictionResult | null {
  if (!_localSim || assetIndex >= _localSim.config.numAssets) return null;

  const prices = _localSim.priceHistory[assetIndex];
  if (prices.length < 30) return null;

  const symbol = _localSim.config.assetNames[assetIndex];
  const result = predict(symbol, prices, '1w');

  // Log for accuracy tracking
  const target = result.monteCarloStats.median;
  logPrediction(symbol, prices[prices.length - 1], target, Math.abs(result.consensusScore), 5);

  return result;
}

/**
 * Get benchmark results for the current simulation run.
 */
export function getSimulationBenchmark() {
  if (!_localSim) return null;
  return computeBenchmark(_localSim);
}

/**
 * Get prediction accuracy benchmark using actual simulated prices.
 */
export function getPredictionAccuracy() {
  if (!_localSim) return null;

  const currentPrices: Record<string, number> = {};
  _localSim.config.assetNames.forEach((name, i) => {
    currentPrices[name] = _localSim!.prices[i][_localSim!.prices[i].length - 1];
  });

  return benchmarkAccuracy(currentPrices);
}

// ── Helpers ──────────────────────────────────────────────────────

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
