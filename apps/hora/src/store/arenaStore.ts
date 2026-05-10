// ── Multiplayer Arena ───────────────────────────────────────────────
// 10 real players compete in a 10-minute match with 10x time speed.
// Winner gets money, XP, and ECFL level progression.
// Uses Supabase Realtime for player synchronization.

import { create } from 'zustand';
import { globalRNG } from '../lib/rng';

// ── Types ────────────────────────────────────────────────────────

export interface ArenaPlayer {
  id: string;                    // auth user ID
  displayName: string;
  netWorth: number;              // Tracked during match
  income: number;                // Per-tick income
  nodesOwned: number;
  tradesExecuted: number;
  bestTrade: number;             // Biggest single trade profit
  agentsDeployed: number;
  score: number;                 // Composite score for ranking
  isReady: boolean;
  isConnected: boolean;
  joinedAt: number;
  avatar?: string;               // Icon/glyph
}

export type ArenaDurationKey = '10min' | '20min' | '30min' | '45min' | '60min' | '3h' | '6h' | '12h' | '24h' | '72h' | '1week';

export const ARENA_DURATIONS: Record<ArenaDurationKey, { ms: number; ticks: number; label: string; tickIntervalMs: number }> = {
  '10min':  { ms: 600_000,       ticks: 200,    label: '10 Minutes',  tickIntervalMs: 3000 },
  '20min':  { ms: 1_200_000,     ticks: 400,    label: '20 Minutes',  tickIntervalMs: 3000 },
  '30min':  { ms: 1_800_000,     ticks: 600,    label: '30 Minutes',  tickIntervalMs: 3000 },
  '45min':  { ms: 2_700_000,     ticks: 900,    label: '45 Minutes',  tickIntervalMs: 3000 },
  '60min':  { ms: 3_600_000,     ticks: 1200,   label: '1 Hour',      tickIntervalMs: 3000 },
  '3h':     { ms: 10_800_000,    ticks: 360,    label: '3 Hours',     tickIntervalMs: 30000 },
  '6h':     { ms: 21_600_000,    ticks: 720,    label: '6 Hours',     tickIntervalMs: 30000 },
  '12h':    { ms: 43_200_000,    ticks: 1440,   label: '12 Hours',    tickIntervalMs: 30000 },
  '24h':    { ms: 86_400_000,    ticks: 2880,   label: '24 Hours',    tickIntervalMs: 30000 },
  '72h':    { ms: 259_200_000,   ticks: 8640,   label: '3 Days',      tickIntervalMs: 30000 },
  '1week':  { ms: 604_800_000,   ticks: 20160,  label: '1 Week',      tickIntervalMs: 30000 },
};

export interface ArenaMatch {
  id: string;
  status: 'lobby' | 'countdown' | 'active' | 'finished' | 'cancelled';
  players: ArenaPlayer[];
  maxPlayers: 10;
  minPlayers: 2;                 // Min to start
  timeMultiplier: 10;            // 10x real time
  durationMs: number;            // Variable duration
  durationKey: ArenaDurationKey; // Duration selection key
  isBotMatch: boolean;           // True = vs AI bots, skip matchmaking
  startedAt: number | null;
  endsAt: number | null;
  currentTick: number;           // Game tick within the match
  totalTicks: number;            // Total ticks in the match
  tickIntervalMs: number;        // Tick speed (3s for short, 30s for long)
  mode: ArenaMode;
  rewards: ArenaRewards;
  countdownSeconds: number;      // Countdown before match starts
}

export type ArenaMode =
  | 'free_for_all'       // Highest net worth wins
  | 'trading_blitz'      // Most profitable trades win
  | 'empire_rush'        // Most nodes owned wins
  | 'agent_wars';        // Best agent deployment score wins

export interface ArenaRewards {
  // Distributed by placement (1st, 2nd, 3rd, participation)
  first:  { money: number; xp: number; ecflPoints: number; ap: number; pack?: string; title?: string };
  second: { money: number; xp: number; ecflPoints: number; ap: number };
  third:  { money: number; xp: number; ecflPoints: number; ap: number };
  participation: { money: number; xp: number; ecflPoints: number; ap: number };
}

export interface ArenaLeaderboardEntry {
  playerId: string;
  displayName: string;
  wins: number;
  totalMatches: number;
  winRate: number;
  totalEarnings: number;
  bestScore: number;
  rank: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Champion';
}

interface ArenaState {
  // Current match
  currentMatch: ArenaMatch | null;
  myPlayerId: string | null;

  // Matchmaking
  isSearching: boolean;
  searchStartedAt: number | null;
  estimatedWaitTime: number;     // Seconds

  // History
  matchHistory: {
    matchId: string;
    mode: ArenaMode;
    placement: number;
    score: number;
    reward: { money: number; xp: number; ecflPoints: number; ap: number };
    playedAt: number;
    playerCount: number;
  }[];

  // Leaderboard
  leaderboard: ArenaLeaderboardEntry[];

  // Stats
  totalWins: number;
  totalMatches: number;
  currentStreak: number;
  bestStreak: number;
  arenaRating: number;           // ELO-like rating
  arenaTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Champion';

  // Actions
  searchForMatch: (mode: ArenaMode, duration?: ArenaDurationKey, isBotMatch?: boolean) => void;
  cancelSearch: () => void;
  joinMatch: (matchId: string) => void;
  leaveMatch: () => void;
  setReady: () => void;
  submitTick: (netWorth: number, income: number, nodesOwned: number, tradesExecuted: number, bestTrade: number, agentsDeployed: number) => void;
  processMatchEnd: () => void;
  getPlacement: () => number;
  getTimeRemaining: () => number;
  getGameTime: () => number;
}

// ── Reward Tiers by Mode ─────────────────────────────────────────

const ARENA_REWARDS: Record<ArenaMode, ArenaRewards> = {
  free_for_all: {
    first:  { money: 5_000_000, xp: 5000, ecflPoints: 50, ap: 2000, pack: 'elite', title: 'Arena Champion' },
    second: { money: 2_500_000, xp: 3000, ecflPoints: 30, ap: 1000 },
    third:  { money: 1_000_000, xp: 1500, ecflPoints: 15, ap: 500 },
    participation: { money: 250_000, xp: 500, ecflPoints: 5, ap: 100 },
  },
  trading_blitz: {
    first:  { money: 3_000_000, xp: 4000, ecflPoints: 40, ap: 1500, pack: 'premium', title: 'Trading Ace' },
    second: { money: 1_500_000, xp: 2500, ecflPoints: 25, ap: 750 },
    third:  { money: 750_000, xp: 1000, ecflPoints: 10, ap: 400 },
    participation: { money: 200_000, xp: 400, ecflPoints: 3, ap: 75 },
  },
  empire_rush: {
    first:  { money: 4_000_000, xp: 4500, ecflPoints: 45, ap: 1800, pack: 'elite', title: 'Empire Builder' },
    second: { money: 2_000_000, xp: 2800, ecflPoints: 28, ap: 900 },
    third:  { money: 800_000, xp: 1200, ecflPoints: 12, ap: 450 },
    participation: { money: 200_000, xp: 450, ecflPoints: 4, ap: 80 },
  },
  agent_wars: {
    first:  { money: 3_500_000, xp: 4200, ecflPoints: 42, ap: 1600, pack: 'legendary', title: 'Agent Master' },
    second: { money: 1_800_000, xp: 2600, ecflPoints: 26, ap: 800 },
    third:  { money: 700_000, xp: 1100, ecflPoints: 11, ap: 420 },
    participation: { money: 180_000, xp: 420, ecflPoints: 4, ap: 70 },
  },
};

// ── Rating Tiers ─────────────────────────────────────────────────

function getTierFromRating(rating: number): ArenaLeaderboardEntry['tier'] {
  if (rating >= 2400) return 'Champion';
  if (rating >= 2000) return 'Diamond';
  if (rating >= 1600) return 'Platinum';
  if (rating >= 1200) return 'Gold';
  if (rating >= 800) return 'Silver';
  return 'Bronze';
}

function calculateEloChange(myRating: number, avgOpponentRating: number, placement: number, playerCount: number): number {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (avgOpponentRating - myRating) / 400));
  // Score: 1st = 1.0, 2nd = 0.85, 3rd = 0.7, mid = 0.5, last = 0
  const normalizedPlacement = 1 - (placement - 1) / (playerCount - 1);
  const actual = Math.pow(normalizedPlacement, 0.7); // Slightly favor higher placements
  return Math.round(K * (actual - expected));
}

// ── Score Calculation ────────────────────────────────────────────

function calculateScore(player: ArenaPlayer, mode: ArenaMode): number {
  switch (mode) {
    case 'free_for_all':
      return player.netWorth;
    case 'trading_blitz':
      return player.tradesExecuted * 1000 + player.bestTrade;
    case 'empire_rush':
      return player.nodesOwned * 100_000 + player.income;
    case 'agent_wars':
      return player.agentsDeployed * 50_000 + player.netWorth * 0.3;
    default:
      return player.netWorth;
  }
}

// ── Store ────────────────────────────────────────────────────────

export const useArenaStore = create<ArenaState>()((set, get) => ({
  currentMatch: null,
  myPlayerId: null,
  isSearching: false,
  searchStartedAt: null,
  estimatedWaitTime: 30,
  matchHistory: [],
  leaderboard: [],
  totalWins: 0,
  totalMatches: 0,
  currentStreak: 0,
  bestStreak: 0,
  arenaRating: 1000,
  arenaTier: 'Bronze',

  searchForMatch: (mode, duration = '10min', isBotMatch = false) => {
    const durConfig = ARENA_DURATIONS[duration];

    if (isBotMatch) {
      // Bot matches skip matchmaking entirely — instant match creation
      const matchId = `arena-bot-${Date.now()}-${globalRNG.next().toString(36).slice(2, 8)}`;
      const myId = `player-${Date.now()}`;

      const aiPlayers: ArenaPlayer[] = Array.from({ length: 9 }, (_, i) => ({
        id: `bot-${i + 1}`,
        displayName: [
          'TradingTitan', 'WallStreetWolf', 'CryptoKing', 'QuantumTrader',
          'AlphaSeeker', 'BullishBaron', 'DarkPoolDiver', 'HedgeMaster',
          'ProfitProphet',
        ][i],
        netWorth: 100_000 + globalRNG.int(0, 49_999),
        income: 0, nodesOwned: 0, tradesExecuted: 0, bestTrade: 0, agentsDeployed: 0, score: 0,
        isReady: true, isConnected: true, joinedAt: Date.now(),
        avatar: ['🐺', '👑', '🦅', '⚡', '🎯', '🐂', '🌊', '🛡️', '🔮'][i],
      }));

      const match: ArenaMatch = {
        id: matchId, status: 'lobby',
        players: [{
          id: myId, displayName: 'You', netWorth: 100_000,
          income: 0, nodesOwned: 0, tradesExecuted: 0, bestTrade: 0, agentsDeployed: 0, score: 0,
          isReady: false, isConnected: true, joinedAt: Date.now(), avatar: '🎮',
        }, ...aiPlayers],
        maxPlayers: 10, minPlayers: 2, timeMultiplier: 10,
        durationMs: durConfig.ms, durationKey: duration, isBotMatch: true,
        startedAt: null, endsAt: null, currentTick: 0, totalTicks: durConfig.ticks,
        tickIntervalMs: durConfig.tickIntervalMs,
        mode, rewards: ARENA_REWARDS[mode], countdownSeconds: 5,
      };

      set({ currentMatch: match, myPlayerId: myId, isSearching: false });
      return;
    }

    set({ isSearching: true, searchStartedAt: Date.now(), estimatedWaitTime: 30 });

    // In production: connect to Supabase Realtime channel 'arena-matchmaking'
    setTimeout(() => {
      const state = get();
      if (!state.isSearching) return;

      const matchId = `arena-${Date.now()}-${globalRNG.next().toString(36).slice(2, 8)}`;
      const myId = `player-${Date.now()}`;

      const aiPlayers: ArenaPlayer[] = Array.from({ length: 9 }, (_, i) => ({
        id: `ai-${i + 1}`,
        displayName: [
          'TradingTitan', 'WallStreetWolf', 'CryptoKing', 'QuantumTrader',
          'AlphaSeeker', 'BullishBaron', 'DarkPoolDiver', 'HedgeMaster',
          'ProfitProphet',
        ][i],
        netWorth: 100_000 + globalRNG.int(0, 49_999),
        income: 0, nodesOwned: 0, tradesExecuted: 0, bestTrade: 0, agentsDeployed: 0, score: 0,
        isReady: true, isConnected: true, joinedAt: Date.now(),
        avatar: ['🐺', '👑', '🦅', '⚡', '🎯', '🐂', '🌊', '🛡️', '🔮'][i],
      }));

      const match: ArenaMatch = {
        id: matchId, status: 'lobby',
        players: [{
          id: myId, displayName: 'You', netWorth: 100_000,
          income: 0, nodesOwned: 0, tradesExecuted: 0, bestTrade: 0, agentsDeployed: 0, score: 0,
          isReady: false, isConnected: true, joinedAt: Date.now(), avatar: '🎮',
        }, ...aiPlayers],
        maxPlayers: 10, minPlayers: 2, timeMultiplier: 10,
        durationMs: durConfig.ms, durationKey: duration, isBotMatch: false,
        startedAt: null, endsAt: null, currentTick: 0, totalTicks: durConfig.ticks,
        tickIntervalMs: durConfig.tickIntervalMs,
        mode, rewards: ARENA_REWARDS[mode], countdownSeconds: 10,
      };

      set({ currentMatch: match, myPlayerId: myId, isSearching: false });
    }, 2000 + globalRNG.next() * 3000);
  },

  cancelSearch: () => {
    set({ isSearching: false, searchStartedAt: null });
  },

  joinMatch: (_matchId) => {
    // In production: join Supabase Realtime channel for this match
  },

  leaveMatch: () => {
    set({ currentMatch: null, myPlayerId: null });
  },

  setReady: () => {
    const state = get();
    if (!state.currentMatch || !state.myPlayerId) return;

    const updatedPlayers = state.currentMatch.players.map(p =>
      p.id === state.myPlayerId ? { ...p, isReady: true } : p
    );

    const allReady = updatedPlayers.every(p => p.isReady);

    set({
      currentMatch: {
        ...state.currentMatch,
        players: updatedPlayers,
        status: allReady ? 'countdown' : 'lobby',
      },
    });

    // If all ready, start countdown then begin match
    if (allReady) {
      let countdown = 10;
      const countdownInterval = setInterval(() => {
        countdown--;
        const current = get().currentMatch;
        if (!current) { clearInterval(countdownInterval); return; }

        if (countdown <= 0) {
          clearInterval(countdownInterval);
          const now = Date.now();
          const cm = get().currentMatch!;
          set({
            currentMatch: {
              ...current,
              status: 'active',
              startedAt: now,
              endsAt: now + cm.durationMs,
              countdownSeconds: 0,
            },
          });

          // Start the accelerated tick loop (interval varies by duration)
          const tickInterval = setInterval(() => {
            const m = get().currentMatch;
            if (!m || m.status !== 'active') { clearInterval(tickInterval); return; }

            const newTick = m.currentTick + 1;

            // Simulate AI player progress
            const updatedPlayers = m.players.map(p => {
              if (p.id === get().myPlayerId) return p; // Player updates themselves
              // AI opponents grow at varied rates
              const growthRate = 0.5 + globalRNG.next() * 1.5;
              return {
                ...p,
                netWorth: p.netWorth + Math.floor(p.netWorth * 0.01 * growthRate),
                income: Math.floor(p.netWorth * 0.005 * growthRate),
                nodesOwned: p.nodesOwned + (globalRNG.chance(0.3) ? 1 : 0),
                tradesExecuted: p.tradesExecuted + (globalRNG.chance(0.5) ? 1 : 0),
                bestTrade: Math.max(p.bestTrade, globalRNG.chance(0.1) ? globalRNG.int(0, 99_999) : 0),
                agentsDeployed: Math.min(p.agentsDeployed + (globalRNG.chance(0.2) ? 1 : 0), 5),
                score: 0, // Recalculated below
              };
            });

            // Recalculate scores
            for (const p of updatedPlayers) {
              p.score = calculateScore(p, m.mode);
            }

            if (newTick >= m.totalTicks) {
              clearInterval(tickInterval);
              set({
                currentMatch: {
                  ...m,
                  status: 'finished',
                  currentTick: newTick,
                  players: updatedPlayers.sort((a, b) => b.score - a.score),
                },
              });
              get().processMatchEnd();
            } else {
              set({
                currentMatch: {
                  ...m,
                  currentTick: newTick,
                  players: updatedPlayers,
                },
              });
            }
          }, cm.tickIntervalMs); // Tick interval varies by duration
        } else {
          set({
            currentMatch: {
              ...current,
              countdownSeconds: countdown,
            },
          });
        }
      }, 1000);
    }
  },

  submitTick: (netWorth, income, nodesOwned, tradesExecuted, bestTrade, agentsDeployed) => {
    const state = get();
    if (!state.currentMatch || !state.myPlayerId) return;

    set({
      currentMatch: {
        ...state.currentMatch,
        players: state.currentMatch.players.map(p =>
          p.id === state.myPlayerId
            ? {
                ...p,
                netWorth,
                income,
                nodesOwned,
                tradesExecuted,
                bestTrade: Math.max(p.bestTrade, bestTrade),
                agentsDeployed,
                score: calculateScore({ ...p, netWorth, income, nodesOwned, tradesExecuted, bestTrade, agentsDeployed }, state.currentMatch!.mode),
              }
            : p
        ),
      },
    });
  },

  processMatchEnd: () => {
    const state = get();
    if (!state.currentMatch || !state.myPlayerId) return;

    const match = state.currentMatch;
    const sortedPlayers = [...match.players].sort((a, b) => b.score - a.score);
    const myIndex = sortedPlayers.findIndex(p => p.id === state.myPlayerId);
    const placement = myIndex + 1;

    // Determine reward tier
    let reward: ArenaRewards[keyof ArenaRewards];
    if (placement === 1) reward = match.rewards.first;
    else if (placement === 2) reward = match.rewards.second;
    else if (placement === 3) reward = match.rewards.third;
    else reward = match.rewards.participation;

    // Calculate ELO change
    const avgOpponentRating = 1000; // In production: use actual opponent ratings
    const eloChange = calculateEloChange(state.arenaRating, avgOpponentRating, placement, match.players.length);
    const newRating = Math.max(0, state.arenaRating + eloChange);

    // Update streaks
    const isWin = placement === 1;
    const newStreak = isWin ? state.currentStreak + 1 : 0;

    // Record match history
    const historyEntry = {
      matchId: match.id,
      mode: match.mode,
      placement,
      score: sortedPlayers[myIndex]?.score ?? 0,
      reward: { money: reward.money, xp: reward.xp, ecflPoints: reward.ecflPoints, ap: reward.ap },
      playedAt: Date.now(),
      playerCount: match.players.length,
    };

    set({
      matchHistory: [historyEntry, ...state.matchHistory].slice(0, 50),
      totalWins: state.totalWins + (isWin ? 1 : 0),
      totalMatches: state.totalMatches + 1,
      currentStreak: newStreak,
      bestStreak: Math.max(state.bestStreak, newStreak),
      arenaRating: newRating,
      arenaTier: getTierFromRating(newRating),
    });

    // In production: apply rewards to empireStore + cardEconomyStore + curriculumStore
    // useEmpireStore.setState(s => ({
    //   companyBalance: s.companyBalance + reward.money,
    //   ceoExperience: s.ceoExperience + reward.xp,
    //   ecflScore: s.ecflScore + reward.ecflPoints,
    // }));
  },

  getPlacement: () => {
    const state = get();
    if (!state.currentMatch || !state.myPlayerId) return 0;
    const sorted = [...state.currentMatch.players].sort((a, b) => b.score - a.score);
    return sorted.findIndex(p => p.id === state.myPlayerId) + 1;
  },

  getTimeRemaining: () => {
    const state = get();
    if (!state.currentMatch?.endsAt) return 0;
    return Math.max(0, state.currentMatch.endsAt - Date.now());
  },

  getGameTime: () => {
    const state = get();
    if (!state.currentMatch) return 0;
    // Each tick = 30 game seconds, at 10x speed
    return state.currentMatch.currentTick * 30; // Game seconds elapsed
  },
}));
