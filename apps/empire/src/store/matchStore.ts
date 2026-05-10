/**
 * Match Store — Real-time match state for private server gameplay.
 * Manages: timer/day timeline, leaderboard (Presence), activity feed (Broadcast),
 * intel visibility, PvP confrontations, and match scoring.
 * Uses Supabase Realtime channels per match room.
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { globalRNG } from '../lib/rng';

// ── Types ────────────────────────────────────────────────────────

export interface MatchPlayer {
  playerId: string;
  displayName: string;
  netWorth: number;
  tradesExecuted: number;
  nodesOwned: number;
  trend: 'up' | 'down' | 'flat';
  rank: number;
  isBot: boolean;
  // PvP confrontation stats
  pvpWins: number;
  pvpLosses: number;
  nodesStolen: number;
  nodesLost: number;
  agentsPoached: number;
}

export type MatchAction = 'buy' | 'sell' | 'acquire_node' | 'deploy_agent' | 'recall_agent' | 'take_loan' | 'fund_invest' | 'shadow_op' | 'milestone' | 'pvp_attack' | 'pvp_defend' | 'steal_node' | 'poach_agent';

export interface ActivityEntry {
  id: string;
  playerName: string;
  playerId: string;
  action: MatchAction;
  detail: string;
  timestamp: number;
}

// ── Intel Visibility Levels ──────────────────────────────────────
// Based on how many Infiltrator/Scout agents the player has deployed

export type IntelLevel = 0 | 1 | 2 | 3 | 4;
// Level 0: Name + rank only
// Level 1: + approximate net worth (rounded to nearest 100K)
// Level 2: + exact net worth + trade count
// Level 3: + nodes owned + trend + P&L%
// Level 4: + full activity feed visibility + recent actions

export interface PvPAttack {
  id: string;
  attackerId: string;
  attackerName: string;
  defenderId: string;
  defenderName: string;
  targetType: 'node' | 'agent';
  targetName: string;
  attackPower: number;
  defensePower: number;
  startedAt: number;
  resolvesAt: number;
  resolved: boolean;
  won?: boolean;
}

// ── Match Scoring Breakdown ──────────────────────────────────────

export interface MatchScoreBreakdown {
  playerId: string;
  displayName: string;
  // Category scores (0-100 each)
  wealthScore: number;       // Based on final net worth vs starting
  tradingScore: number;      // Based on trade volume + P&L
  empireScore: number;       // Based on nodes owned
  pvpScore: number;          // Based on PvP wins/losses
  consistencyScore: number;  // Based on trend stability
  totalScore: number;        // Weighted composite
  // Key moments
  biggestTrade: string;
  peakNetWorth: number;
  peakRank: number;
}

export interface MatchTimerState {
  realElapsedMs: number;
  realRemainingMs: number;
  progress: number;       // 0.0 – 1.0
  currentTick: number;
  totalTicks: number;
  gameDay: number;        // 1-indexed trading day
  gameWeek: number;
  gameMonth: number;
  isFinished: boolean;
}

interface MatchState {
  // ── Config ─────────────────────────────────────────
  active: boolean;
  roomId: string;
  roomCode: string;
  mode: string;
  startedAt: number;
  durationMs: number;
  totalTicks: number;
  tickIntervalMs: number;
  timeMultiplier: number;
  startingCapital: number;
  myColorId: string;                                // Player's chosen color id
  myColorRgb: [number, number, number];             // RGB tuple for map rendering
  myColorHex: string;                               // Hex for UI elements

  // ── Timer ──────────────────────────────────────────
  timer: MatchTimerState;

  // ── Leaderboard ────────────────────────────────────
  leaderboard: MatchPlayer[];
  myRank: number;

  // ── Activity Feed ──────────────────────────────────
  activityFeed: ActivityEntry[];

  // ── Intel ──────────────────────────────────────────
  intelLevel: IntelLevel;                           // Current intel level based on deployed agents
  intelAgentCount: number;                          // Number of intel-class agents deployed

  // ── PvP Confrontations ─────────────────────────────
  activePvPAttack: PvPAttack | null;
  pvpCooldownUntil: number;                         // Timestamp — can't attack again until this

  // ── Match Scoring ──────────────────────────────────
  peakNetWorth: number;
  peakRank: number;
  biggestTrade: string;
  scoreBreakdowns: MatchScoreBreakdown[];

  // ── Actions ────────────────────────────────────────
  startMatch: (config: {
    roomId: string;
    roomCode: string;
    mode: string;
    duration: number;       // minutes
    timeMultiplier: number;
    startingCapital: number;
    players: Array<{ userId?: string; name: string; isBot: boolean }>;
    myUserId: string;
    myDisplayName: string;
    myColor?: string;        // Color id from PLAYER_COLORS
  }) => void;

  endMatch: () => { leaderboard: MatchPlayer[]; timer: MatchTimerState; scoreBreakdowns: MatchScoreBreakdown[] };
  pushActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void;
  updateMyScore: (stats: { netWorth: number; tradesExecuted: number; nodesOwned: number }) => void;
  updateBotScores: () => void;
  tickTimer: () => void;
  cleanup: () => void;

  // Intel
  updateIntelLevel: (infiltratorCount: number, scoutCount: number) => void;
  getIntelLevel: () => IntelLevel;

  // PvP
  launchPvPAttack: (targetPlayerId: string, targetType: 'node' | 'agent', targetName: string, myNetWorth: number) => boolean;
  resolvePvPAttack: () => PvPAttack | null;

  // Scoring
  computeScoreBreakdowns: () => MatchScoreBreakdown[];
  recordBiggestTrade: (detail: string) => void;
}

// ── Constants ─────────────────────────────────────────────────

const MAX_FEED = 80;

// Player color definitions (must match PrivateServerPanel PLAYER_COLORS)
const COLOR_MAP: Record<string, { hex: string; rgb: [number, number, number] }> = {
  emerald:  { hex: '#10b981', rgb: [16, 185, 129] },
  cyan:     { hex: '#06b6d4', rgb: [6, 182, 212] },
  violet:   { hex: '#8b5cf6', rgb: [139, 92, 246] },
  rose:     { hex: '#f43f5e', rgb: [244, 63, 94] },
  amber:    { hex: '#f59e0b', rgb: [245, 158, 11] },
  sky:      { hex: '#0ea5e9', rgb: [14, 165, 233] },
  lime:     { hex: '#84cc16', rgb: [132, 204, 22] },
  fuchsia:  { hex: '#d946ef', rgb: [217, 70, 239] },
  orange:   { hex: '#f97316', rgb: [249, 115, 22] },
  teal:     { hex: '#14b8a6', rgb: [20, 184, 166] },
};

// PvP attack resolution time (ms)
const PVP_RESOLVE_TIME = 8_000;
const PVP_COOLDOWN = 30_000; // 30s between attacks

// ── Store ─────────────────────────────────────────────────────

let scoreChannel: ReturnType<typeof supabase.channel> | null = null;
let feedChannel: ReturnType<typeof supabase.channel> | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let botInterval: ReturnType<typeof setInterval> | null = null;

const FRESH_TIMER: MatchTimerState = {
  realElapsedMs: 0,
  realRemainingMs: 0,
  progress: 0,
  currentTick: 0,
  totalTicks: 0,
  gameDay: 1,
  gameWeek: 1,
  gameMonth: 1,
  isFinished: false,
};

export const useMatchStore = create<MatchState>()((set, get) => ({
  active: false,
  roomId: '',
  roomCode: '',
  mode: '',
  startedAt: 0,
  durationMs: 0,
  totalTicks: 0,
  tickIntervalMs: 3000,
  timeMultiplier: 10,
  startingCapital: 500_000,
  myColorId: 'emerald',
  myColorRgb: [16, 185, 129],
  myColorHex: '#10b981',
  timer: { ...FRESH_TIMER },
  leaderboard: [],
  myRank: 0,
  activityFeed: [],
  intelLevel: 0 as IntelLevel,
  intelAgentCount: 0,
  activePvPAttack: null,
  pvpCooldownUntil: 0,
  peakNetWorth: 0,
  peakRank: 1,
  biggestTrade: '',
  scoreBreakdowns: [],

  // ── Start Match ───────────────────────────────────────────
  startMatch: (config) => {
    const { roomId, roomCode, mode, duration, timeMultiplier, startingCapital, players, myUserId, myDisplayName, myColor } = config;

    // Resolve player color
    const colorEntry = COLOR_MAP[myColor || 'emerald'] || COLOR_MAP.emerald;

    // Compute timing — duration 0 means unlimited
    const isUnlimited = duration === 0;
    const durationMs = isUnlimited ? 0 : duration * 60 * 1000;
    // Short matches (<=20 min) get 3s ticks, longer/unlimited get 30s ticks
    const tickIntervalMs = (!isUnlimited && duration <= 20) ? 3000 : 30000;
    const totalTicks = isUnlimited ? Infinity : Math.floor(durationMs / tickIntervalMs);
    const startedAt = Date.now();

    // Build initial leaderboard from lobby players
    const initialLeaderboard: MatchPlayer[] = players.map((p, i) => ({
      playerId: p.userId || `bot-${i}`,
      displayName: p.name,
      netWorth: startingCapital,
      tradesExecuted: 0,
      nodesOwned: 0,
      trend: 'flat' as const,
      rank: i + 1,
      isBot: p.isBot,
      pvpWins: 0,
      pvpLosses: 0,
      nodesStolen: 0,
      nodesLost: 0,
      agentsPoached: 0,
    }));

    set({
      active: true,
      roomId,
      roomCode,
      mode,
      startedAt,
      durationMs,
      totalTicks,
      tickIntervalMs,
      timeMultiplier,
      startingCapital,
      myColorId: myColor || 'emerald',
      myColorRgb: colorEntry.rgb,
      myColorHex: colorEntry.hex,
      leaderboard: initialLeaderboard,
      myRank: initialLeaderboard.findIndex(p => p.playerId === myUserId) + 1 || 1,
      activityFeed: [{
        id: `start-${Date.now()}`,
        playerName: 'SYSTEM',
        playerId: 'system',
        action: 'milestone',
        detail: `Match started — ${mode.replace(/_/g, ' ').toUpperCase()} — ${duration === 0 ? 'UNLIMITED' : `${duration} min`} at ${timeMultiplier}x`,
        timestamp: Date.now(),
      }],
      timer: {
        ...FRESH_TIMER,
        totalTicks,
        realRemainingMs: durationMs,
      },
      intelLevel: 0 as IntelLevel,
      intelAgentCount: 0,
      activePvPAttack: null,
      pvpCooldownUntil: 0,
      peakNetWorth: startingCapital,
      peakRank: 1,
      biggestTrade: '',
      scoreBreakdowns: [],
    });

    // ── Supabase Presence (leaderboard scores) ──────────
    scoreChannel = supabase.channel(`match-scores-${roomId}`, {
      config: { presence: { key: myUserId } },
    });

    scoreChannel.on('presence', { event: 'sync' }, () => {
      const state = scoreChannel!.presenceState();
      const { leaderboard: currentLb } = get();
      const updatedLb = [...currentLb];

      for (const [playerId, presences] of Object.entries(state)) {
        const latest = (presences as any[])[0];
        if (!latest) continue;
        const idx = updatedLb.findIndex(p => p.playerId === playerId);
        if (idx >= 0) {
          const prev = updatedLb[idx].netWorth;
          updatedLb[idx] = {
            ...updatedLb[idx],
            netWorth: latest.netWorth ?? updatedLb[idx].netWorth,
            tradesExecuted: latest.tradesExecuted ?? updatedLb[idx].tradesExecuted,
            nodesOwned: latest.nodesOwned ?? updatedLb[idx].nodesOwned,
            trend: (latest.netWorth ?? prev) > prev ? 'up' : (latest.netWorth ?? prev) < prev ? 'down' : 'flat',
          };
        }
      }

      // Sort and rank
      updatedLb.sort((a, b) => b.netWorth - a.netWorth);
      updatedLb.forEach((p, i) => { p.rank = i + 1; });
      const myRank = updatedLb.findIndex(p => p.playerId === myUserId) + 1;

      set({ leaderboard: updatedLb, myRank });
    });

    scoreChannel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      await scoreChannel!.track({
        displayName: myDisplayName,
        netWorth: startingCapital,
        tradesExecuted: 0,
        nodesOwned: 0,
      });
    });

    // ── Supabase Broadcast (activity feed) ──────────────
    feedChannel = supabase.channel(`match-feed-${roomId}`, {
      config: { broadcast: { self: false } },
    });

    feedChannel.on('broadcast', { event: 'player_action' }, ({ payload }) => {
      if (!payload) return;
      const entry: ActivityEntry = {
        id: `${payload.playerId}-${payload.timestamp}`,
        playerName: payload.playerName,
        playerId: payload.playerId,
        action: payload.action,
        detail: payload.detail,
        timestamp: payload.timestamp,
      };
      set(s => ({
        activityFeed: [entry, ...s.activityFeed].slice(0, MAX_FEED),
      }));
    });

    feedChannel.subscribe();

    // ── Timer interval ──────────────────────────────────
    timerInterval = setInterval(() => {
      get().tickTimer();
    }, 1000);

    // ── Bot score simulation interval ───────────────────
    botInterval = setInterval(() => {
      get().updateBotScores();
    }, tickIntervalMs);
  },

  // ── Tick Timer ────────────────────────────────────────────
  tickTimer: () => {
    const { startedAt, durationMs, totalTicks, active, tickIntervalMs } = get();
    if (!active) return;

    const realElapsed = Date.now() - startedAt;
    const isUnlimited = durationMs === 0;

    // Unlimited: progress is always 0, ticks count up from elapsed time
    const progress = isUnlimited ? 0 : Math.min(realElapsed / durationMs, 1.0);
    const currentTick = isUnlimited
      ? Math.floor(realElapsed / tickIntervalMs)
      : Math.floor(progress * totalTicks);
    const realRemaining = isUnlimited ? Infinity : Math.max(0, durationMs - realElapsed);
    // 1 in-game day = 1 real hour → ticksPerDay depends on tick interval
    const ticksPerDay = Math.max(1, Math.round(3_600_000 / tickIntervalMs));
    const gameDay = Math.floor(currentTick / ticksPerDay) + 1;
    const gameWeek = Math.floor(currentTick / (ticksPerDay * 5)) + 1;
    const gameMonth = Math.floor(currentTick / (ticksPerDay * 21)) + 1;
    const isFinished = !isUnlimited && progress >= 1.0;

    set({
      timer: {
        realElapsedMs: realElapsed,
        realRemainingMs: isUnlimited ? 0 : realRemaining,
        progress,
        currentTick,
        totalTicks: isUnlimited ? 0 : totalTicks,
        gameDay,
        gameWeek,
        gameMonth,
        isFinished,
      },
    });

    if (isFinished) {
      // Auto-end (never triggers for unlimited)
      get().endMatch();
    }
  },

  // ── Update My Score (called from gameplay hooks) ──────────
  updateMyScore: (stats) => {
    // Track peak stats for scoring
    const { peakNetWorth, peakRank, myRank } = get();
    const updates: Partial<MatchState> = {};
    if (stats.netWorth > peakNetWorth) updates.peakNetWorth = stats.netWorth;
    if (myRank > 0 && myRank < peakRank) updates.peakRank = myRank;
    if (Object.keys(updates).length > 0) set(updates as any);

    if (!scoreChannel) return;
    scoreChannel.track({
      netWorth: stats.netWorth,
      tradesExecuted: stats.tradesExecuted,
      nodesOwned: stats.nodesOwned,
    }).catch(() => {});
  },

  // ── Simulate Bot Scores ───────────────────────────────────
  updateBotScores: () => {
    const { leaderboard, active, startingCapital, mode: _mode } = get();
    if (!active) return;

    const updatedLb = leaderboard.map(p => {
      if (!p.isBot) return p;

      // Bots have varied skill: some grow fast, some slow
      const seed = p.playerId.charCodeAt(4) || 50;
      const skill = 0.3 + (seed % 70) / 100; // 0.3 – 1.0
      const volatility = 0.02 + (seed % 30) / 1000; // 0.02 – 0.05

      // Random walk biased toward growth
      const change = p.netWorth * volatility * (globalRNG.next() * 2 - 0.5) * skill;
      const newNetWorth = Math.max(startingCapital * 0.1, p.netWorth + change);
      const newTrades = p.tradesExecuted + (globalRNG.chance(0.4) ? 1 : 0);
      const newNodes = p.nodesOwned + (globalRNG.chance(0.05) ? 1 : 0);

      return {
        ...p,
        trend: newNetWorth > p.netWorth ? 'up' as const : newNetWorth < p.netWorth ? 'down' as const : 'flat' as const,
        netWorth: Math.round(newNetWorth),
        tradesExecuted: newTrades,
        nodesOwned: newNodes,
      };
    });

    // Re-sort and rank
    updatedLb.sort((a, b) => b.netWorth - a.netWorth);
    updatedLb.forEach((p, i) => { p.rank = i + 1; });

    set({ leaderboard: updatedLb, myRank: updatedLb.findIndex(p => !p.isBot) + 1 });

    // Generate bot activity feed entries
    const activeBots = updatedLb.filter(p => p.isBot);
    if (activeBots.length > 0 && globalRNG.chance(0.6)) {
      const bot = globalRNG.pick(activeBots);
      const actions: Array<{ action: ActivityEntry['action']; detail: string }> = [
        { action: 'buy', detail: `${globalRNG.pick(['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'BTC', 'ETH', 'GOOG'])} x${globalRNG.int(10, 109)}` },
        { action: 'sell', detail: `${globalRNG.pick(['META', 'JPM', 'V', 'AMD', 'NFLX', 'SOL', 'XRP'])} x${globalRNG.int(5, 54)}` },
        { action: 'acquire_node', detail: `${globalRNG.pick(['Tech Hub', 'Mining Op', 'Logistics', 'Media Co', 'Bank Branch', 'Data Center'])}` },
        { action: 'fund_invest', detail: `${globalRNG.pick(['Alpha Fund', 'Quant Strategy', 'Macro Fund', 'Growth ETF'])}` },
      ];
      const a = globalRNG.pick(actions);
      const entry: ActivityEntry = {
        id: `bot-${bot.playerId}-${Date.now()}`,
        playerName: bot.displayName,
        playerId: bot.playerId,
        action: a.action,
        detail: a.detail,
        timestamp: Date.now(),
      };
      set(s => ({
        activityFeed: [entry, ...s.activityFeed].slice(0, MAX_FEED),
      }));
    }
  },

  // ── Push Activity (broadcast to other players) ────────────
  pushActivity: (entry) => {
    const timestamp = Date.now();
    const fullEntry: ActivityEntry = {
      ...entry,
      id: `${entry.playerId}-${timestamp}`,
      timestamp,
    };

    // Add locally
    set(s => ({
      activityFeed: [fullEntry, ...s.activityFeed].slice(0, MAX_FEED),
    }));

    // Broadcast to others
    if (feedChannel) {
      feedChannel.send({
        type: 'broadcast',
        event: 'player_action',
        payload: {
          playerName: entry.playerName,
          playerId: entry.playerId,
          action: entry.action,
          detail: entry.detail,
          timestamp,
        },
      }).catch(() => {});
    }
  },

  // ── Intel Visibility ──────────────────────────────────────
  updateIntelLevel: (infiltratorCount, scoutCount) => {
    const total = infiltratorCount + scoutCount;
    let level: IntelLevel = 0;
    if (total >= 5) level = 4;
    else if (total >= 3) level = 3;
    else if (total >= 2) level = 2;
    else if (total >= 1) level = 1;
    set({ intelLevel: level, intelAgentCount: total });
  },

  getIntelLevel: () => get().intelLevel,

  // ── PvP Confrontations ──────────────────────────────────
  launchPvPAttack: (targetPlayerId, targetType, targetName, myNetWorth) => {
    const { leaderboard, pvpCooldownUntil, activePvPAttack, active } = get();
    if (!active) return false;
    if (activePvPAttack && !activePvPAttack.resolved) return false;
    if (Date.now() < pvpCooldownUntil) return false;

    const target = leaderboard.find(p => p.playerId === targetPlayerId);
    if (!target) return false;

    const me = leaderboard.find(p => !p.isBot) || leaderboard[0];

    // Attack power: based on net worth advantage + randomness
    const nwRatio = myNetWorth / Math.max(target.netWorth, 1);
    const baseAttack = 40 + Math.min(30, nwRatio * 20);
    const attackPower = Math.floor(baseAttack + globalRNG.next() * 25);

    // Defense power: based on target's net worth + nodes + randomness
    const baseDefense = 40 + Math.min(25, target.nodesOwned * 3);
    const defensePower = Math.floor(baseDefense + globalRNG.next() * 20);

    const attack: PvPAttack = {
      id: `pvp-${Date.now()}`,
      attackerId: me.playerId,
      attackerName: me.displayName,
      defenderId: targetPlayerId,
      defenderName: target.displayName,
      targetType,
      targetName,
      attackPower,
      defensePower,
      startedAt: Date.now(),
      resolvesAt: Date.now() + PVP_RESOLVE_TIME,
      resolved: false,
    };

    set({ activePvPAttack: attack });

    // Broadcast the attack
    get().pushActivity({
      playerName: me.displayName,
      playerId: me.playerId,
      action: 'pvp_attack',
      detail: `${targetType === 'node' ? 'hostile takeover on' : 'agent poach from'} ${target.displayName} — ${targetName}`,
    });

    return true;
  },

  resolvePvPAttack: () => {
    const { activePvPAttack, leaderboard } = get();
    if (!activePvPAttack || activePvPAttack.resolved) return null;

    const won = activePvPAttack.attackPower > activePvPAttack.defensePower;
    const resolved: PvPAttack = { ...activePvPAttack, resolved: true, won };

    // Update leaderboard PvP stats
    const updatedLb = leaderboard.map(p => {
      if (p.playerId === activePvPAttack.attackerId) {
        return {
          ...p,
          pvpWins: p.pvpWins + (won ? 1 : 0),
          pvpLosses: p.pvpLosses + (won ? 0 : 1),
          nodesStolen: p.nodesStolen + (won && activePvPAttack.targetType === 'node' ? 1 : 0),
          agentsPoached: p.agentsPoached + (won && activePvPAttack.targetType === 'agent' ? 1 : 0),
        };
      }
      if (p.playerId === activePvPAttack.defenderId) {
        return {
          ...p,
          pvpLosses: p.pvpLosses + (won ? 1 : 0),
          pvpWins: p.pvpWins + (won ? 0 : 1),
          nodesLost: p.nodesLost + (won && activePvPAttack.targetType === 'node' ? 1 : 0),
        };
      }
      return p;
    });

    set({
      activePvPAttack: resolved,
      leaderboard: updatedLb,
      pvpCooldownUntil: Date.now() + PVP_COOLDOWN,
    });

    // Broadcast result
    get().pushActivity({
      playerName: 'SYSTEM',
      playerId: 'system',
      action: 'milestone',
      detail: won
        ? `⚔ ${activePvPAttack.attackerName} defeated ${activePvPAttack.defenderName} — ${activePvPAttack.targetName} seized!`
        : `🛡 ${activePvPAttack.defenderName} repelled ${activePvPAttack.attackerName}'s attack on ${activePvPAttack.targetName}`,
    });

    return resolved;
  },

  // ── Match Scoring ───────────────────────────────────────
  recordBiggestTrade: (detail) => {
    set({ biggestTrade: detail });
  },

  computeScoreBreakdowns: () => {
    const { leaderboard, startingCapital, peakNetWorth, peakRank, biggestTrade } = get();

    const maxNetWorth = Math.max(...leaderboard.map(p => p.netWorth), startingCapital);

    const breakdowns: MatchScoreBreakdown[] = leaderboard.map(p => {
      // Wealth score: 0-100 based on final net worth relative to max player
      const wealthScore = Math.round((p.netWorth / Math.max(maxNetWorth, 1)) * 100);

      // Trading score: 0-100 based on trades executed (capped at 50 trades = 100)
      const tradingScore = Math.min(100, Math.round((p.tradesExecuted / 50) * 100));

      // Empire score: 0-100 based on nodes owned (capped at 20 nodes = 100)
      const empireScore = Math.min(100, Math.round((p.nodesOwned / 20) * 100));

      // PvP score: 0-100 based on wins vs losses
      const pvpTotal = p.pvpWins + p.pvpLosses;
      const pvpScore = pvpTotal === 0 ? 50 : Math.round((p.pvpWins / pvpTotal) * 100);

      // Consistency: higher if trend is up, penalized for down
      const consistencyScore = p.trend === 'up' ? 80 : p.trend === 'flat' ? 60 : 30;

      // Weighted total
      const totalScore = Math.round(
        wealthScore * 0.35 +
        tradingScore * 0.15 +
        empireScore * 0.20 +
        pvpScore * 0.20 +
        consistencyScore * 0.10
      );

      return {
        playerId: p.playerId,
        displayName: p.displayName,
        wealthScore,
        tradingScore,
        empireScore,
        pvpScore,
        consistencyScore,
        totalScore,
        biggestTrade: p.playerId === leaderboard.find(lp => !lp.isBot)?.playerId ? biggestTrade : `${p.tradesExecuted} trades`,
        peakNetWorth: p.playerId === leaderboard.find(lp => !lp.isBot)?.playerId ? peakNetWorth : Math.round(p.netWorth * (1 + globalRNG.next() * 0.15)),
        peakRank: p.playerId === leaderboard.find(lp => !lp.isBot)?.playerId ? peakRank : Math.max(1, p.rank - globalRNG.int(0, 1)),
      };
    });

    // Sort by total score
    breakdowns.sort((a, b) => b.totalScore - a.totalScore);
    set({ scoreBreakdowns: breakdowns });
    return breakdowns;
  },

  // ── End Match ─────────────────────────────────────────────
  endMatch: () => {
    const { leaderboard, timer } = get();

    // Compute final score breakdowns
    const scoreBreakdowns = get().computeScoreBreakdowns();

    // Add final system message
    set(s => ({
      active: false as const,
      activityFeed: [{
        id: `end-${Date.now()}`,
        playerName: 'SYSTEM',
        playerId: 'system',
        action: 'milestone' as MatchAction,
        detail: `Match complete! Winner: ${leaderboard[0]?.displayName || 'N/A'} with €${(leaderboard[0]?.netWorth || 0).toLocaleString()}`,
        timestamp: Date.now(),
      }, ...s.activityFeed].slice(0, MAX_FEED),
    }));

    // Cleanup channels + intervals
    get().cleanup();

    return { leaderboard, timer, scoreBreakdowns };
  },

  // ── Cleanup ───────────────────────────────────────────────
  cleanup: () => {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (botInterval) { clearInterval(botInterval); botInterval = null; }
    if (scoreChannel) { supabase.removeChannel(scoreChannel); scoreChannel = null; }
    if (feedChannel) { supabase.removeChannel(feedChannel); feedChannel = null; }
  },
}));
