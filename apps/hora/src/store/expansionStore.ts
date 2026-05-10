/**
 * expansionStore.ts — Dynamic game expansion engine.
 *
 * Athena uses this store to inject new content into the game in real-time:
 * - Custom instruments (stocks, crypto, etc.)
 * - Dynamic events with player-driven outcomes
 * - New nodes on the map
 * - Missions / challenges
 * - Market regime shifts
 * - Custom news articles
 *
 * All generated content is persisted and integrates with existing systems.
 */

import { createPersistedStore } from './createPersistedStore';
import { eventBridge, EVENTS } from '../lib/eventBridge';
import type { Instrument } from '../data/instruments';

// ── Dynamic Instrument ──

export interface DynamicInstrument extends Instrument {
  createdAt: number;
  createdBy: 'athena' | 'system';
  backstory: string;           // AI-generated lore for this instrument
  volatility: 'low' | 'medium' | 'high' | 'extreme';
  priceHistory: number[];      // last 50 ticks
  isIPO?: boolean;             // freshly spawned
  ipoPrice?: number;
}

// ── Dynamic Event ──

export interface DynamicEvent {
  id: string;
  title: string;
  description: string;
  options: {
    label: string;
    effects: Record<string, number>;  // axis/balance multipliers
    description: string;
  }[];
  minNetWorth?: number;
  cooldownMs: number;
  resolved: boolean;
  resolvedAt?: number;
  chosenOption?: number;
  createdAt: number;
  createdBy: 'athena' | 'system';
  expiresAt?: number;          // auto-expire if not resolved
}

// ── Dynamic Node ──

export interface DynamicNode {
  id: string;
  name: string;
  type: string;                // sector
  lat: number;
  lng: number;
  country: string;
  capex: number;
  opex: number;
  income: number;
  description: string;
  createdAt: number;
  createdBy: 'athena' | 'system';
  injected: boolean;           // has it been pushed to empireStore?
}

// ── Dynamic Mission ──

export interface DynamicMission {
  id: string;
  title: string;
  description: string;
  objective: string;           // what the player must do
  targetValue: number;         // goal threshold
  currentValue: number;        // tracked progress
  reward: {
    cash?: number;
    xp?: number;
    ap?: number;
  };
  deadline?: number;           // optional expiry timestamp
  completed: boolean;
  completedAt?: number;
  createdAt: number;
  createdBy: 'athena' | 'system';
  checkType: 'balance' | 'net_worth' | 'nodes' | 'portfolio_value' | 'trade_count' | 'heat' | 'custom';
}

// ── Market Regime ──

export type MarketRegime = 'bull' | 'bear' | 'volatile' | 'crash' | 'recovery' | 'bubble' | 'stable';

export interface RegimeShift {
  id: string;
  fromRegime: MarketRegime;
  toRegime: MarketRegime;
  reason: string;
  driftMultiplier: number;     // global price drift (e.g. 1.02 = +2% trend)
  volatilityMultiplier: number; // how much random noise increases
  duration: number;             // ms until regime reverts
  startedAt: number;
  expiresAt: number;
  active: boolean;
}

// ── Expansion Log ──

export interface ExpansionLogEntry {
  id: string;
  type: 'instrument' | 'event' | 'node' | 'mission' | 'regime' | 'news';
  action: string;
  details: string;
  timestamp: number;
}

// ── Store ──

interface ExpansionState {
  // Dynamic content pools
  dynamicInstruments: DynamicInstrument[];
  dynamicEvents: DynamicEvent[];
  dynamicNodes: DynamicNode[];
  dynamicMissions: DynamicMission[];

  // Market regime
  currentRegime: MarketRegime;
  regimeHistory: RegimeShift[];
  activeRegimeShift: RegimeShift | null;

  // Expansion log
  log: ExpansionLogEntry[];
  maxLog: number;

  // Expansion stats
  totalExpansions: number;
  lastExpansionAt: number;

  // Actions
  spawnInstrument: (params: {
    symbol: string; name: string; type: string; price: number;
    sector?: string; description?: string; backstory?: string;
    volatility?: string; marketCapB?: number;
  }) => DynamicInstrument | null;

  createEvent: (params: {
    title: string; description: string;
    options: { label: string; effects: Record<string, number>; description: string }[];
    minNetWorth?: number; cooldownMs?: number; expiresInMs?: number;
  }) => DynamicEvent | null;

  resolveEvent: (eventId: string, choiceIndex: number) => Record<string, number> | null;

  spawnNode: (params: {
    name: string; type: string; lat: number; lng: number; country: string;
    capex: number; opex?: number; income?: number; description?: string;
  }) => DynamicNode | null;

  createMission: (params: {
    title: string; description: string; objective: string;
    checkType: string; targetValue: number;
    reward: { cash?: number; xp?: number; ap?: number };
    deadlineMs?: number;
  }) => DynamicMission | null;

  updateMissionProgress: (missionId: string, value: number) => void;
  completeMission: (missionId: string) => { cash?: number; xp?: number; ap?: number } | null;

  shiftRegime: (params: {
    toRegime: MarketRegime; reason: string;
    driftMultiplier?: number; volatilityMultiplier?: number; durationMs?: number;
  }) => RegimeShift | null;

  injectNews: (params: {
    headline: string; body: string; source?: string;
    sentiment: 'bullish' | 'bearish' | 'neutral'; category?: string;
  }) => void;

  tickPrices: () => void;      // update dynamic instrument prices
  getActiveMissions: () => DynamicMission[];
  getPendingEvents: () => DynamicEvent[];
  getAllInstruments: () => DynamicInstrument[];
}

// ── Helpers ──

let _ctr = 0;
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${++_ctr}`;
}

function addLog(state: ExpansionState, type: ExpansionLogEntry['type'], action: string, details: string): ExpansionLogEntry[] {
  const entry: ExpansionLogEntry = { id: uid('log'), type, action, details, timestamp: Date.now() };
  return [entry, ...state.log].slice(0, state.maxLog);
}

// ── Store Implementation ──

export const useExpansionStore = createPersistedStore<ExpansionState>(
  'expansion',
  (set, get) => ({
    dynamicInstruments: [],
    dynamicEvents: [],
    dynamicNodes: [],
    dynamicMissions: [],
    currentRegime: 'stable',
    regimeHistory: [],
    activeRegimeShift: null,
    log: [],
    maxLog: 200,
    totalExpansions: 0,
    lastExpansionAt: 0,

    // ── Spawn Instrument ──
    spawnInstrument: (params) => {
      const state = get();

      // Prevent duplicates
      if (state.dynamicInstruments.find(i => i.symbol === params.symbol)) return null;

      const inst: DynamicInstrument = {
        id: `dyn-${params.symbol.toLowerCase()}`,
        symbol: params.symbol.toUpperCase(),
        name: params.name,
        type: params.type as any,
        price: params.price,
        change24h: 0,
        marketCapB: params.marketCapB,
        sector: params.sector,
        description: params.description || `Dynamically generated ${params.type} instrument.`,
        createdAt: Date.now(),
        createdBy: 'athena',
        backstory: params.backstory || '',
        volatility: (params.volatility || 'medium') as any,
        priceHistory: [params.price],
        isIPO: true,
        ipoPrice: params.price,
      };

      set({
        dynamicInstruments: [...state.dynamicInstruments, inst],
        log: addLog(state, 'instrument', 'SPAWN', `${inst.symbol} — ${inst.name} @ €${inst.price}`),
        totalExpansions: state.totalExpansions + 1,
        lastExpansionAt: Date.now(),
      });

      eventBridge.emit(EVENTS.EXPANSION_INSTRUMENT_SPAWNED, { instrument: inst });
      return inst;
    },

    // ── Create Event ──
    createEvent: (params) => {
      const event: DynamicEvent = {
        id: uid('evt'),
        title: params.title,
        description: params.description,
        options: params.options,
        minNetWorth: params.minNetWorth,
        cooldownMs: params.cooldownMs || 120_000,
        resolved: false,
        createdAt: Date.now(),
        createdBy: 'athena',
        expiresAt: params.expiresInMs ? Date.now() + params.expiresInMs : undefined,
      };

      const state = get();
      set({
        dynamicEvents: [...state.dynamicEvents, event],
        log: addLog(state, 'event', 'CREATE', `${event.title} — ${event.options.length} choices`),
        totalExpansions: state.totalExpansions + 1,
        lastExpansionAt: Date.now(),
      });

      eventBridge.emit(EVENTS.EXPANSION_EVENT_CREATED, { event });
      return event;
    },

    // ── Resolve Event ──
    resolveEvent: (eventId, choiceIndex) => {
      const state = get();
      const event = state.dynamicEvents.find(e => e.id === eventId);
      if (!event || event.resolved) return null;
      if (choiceIndex < 0 || choiceIndex >= event.options.length) return null;

      const choice = event.options[choiceIndex];
      set({
        dynamicEvents: state.dynamicEvents.map(e =>
          e.id === eventId ? { ...e, resolved: true, resolvedAt: Date.now(), chosenOption: choiceIndex } : e
        ),
        log: addLog(state, 'event', 'RESOLVE', `${event.title} → ${choice.label}`),
      });

      return choice.effects;
    },

    // ── Spawn Node ──
    spawnNode: (params) => {
      const node: DynamicNode = {
        id: uid('node'),
        name: params.name,
        type: params.type,
        lat: params.lat,
        lng: params.lng,
        country: params.country,
        capex: params.capex,
        opex: params.opex || Math.round(params.capex * 0.08),
        income: params.income || Math.round(params.capex * 0.2),
        description: params.description || `A new ${params.type} operation in ${params.country}.`,
        createdAt: Date.now(),
        createdBy: 'athena',
        injected: false,
      };

      const state = get();
      set({
        dynamicNodes: [...state.dynamicNodes, node],
        log: addLog(state, 'node', 'SPAWN', `${node.name} (${node.type}) in ${node.country}`),
        totalExpansions: state.totalExpansions + 1,
        lastExpansionAt: Date.now(),
      });

      eventBridge.emit(EVENTS.EXPANSION_NODE_SPAWNED, { node });
      return node;
    },

    // ── Create Mission ──
    createMission: (params) => {
      const mission: DynamicMission = {
        id: uid('msn'),
        title: params.title,
        description: params.description,
        objective: params.objective,
        checkType: params.checkType as any,
        targetValue: params.targetValue,
        currentValue: 0,
        reward: params.reward,
        deadline: params.deadlineMs ? Date.now() + params.deadlineMs : undefined,
        completed: false,
        createdAt: Date.now(),
        createdBy: 'athena',
      };

      const state = get();
      set({
        dynamicMissions: [...state.dynamicMissions, mission],
        log: addLog(state, 'mission', 'CREATE', `${mission.title} — target: ${mission.targetValue}`),
        totalExpansions: state.totalExpansions + 1,
        lastExpansionAt: Date.now(),
      });

      eventBridge.emit(EVENTS.EXPANSION_MISSION_CREATED, { mission });
      return mission;
    },

    // ── Update Mission Progress ──
    updateMissionProgress: (missionId, value) => {
      const state = get();
      const mission = state.dynamicMissions.find(m => m.id === missionId);
      if (!mission || mission.completed) return;

      const newValue = Math.max(mission.currentValue, value);
      const isComplete = newValue >= mission.targetValue;

      set({
        dynamicMissions: state.dynamicMissions.map(m =>
          m.id === missionId ? { ...m, currentValue: newValue, completed: isComplete, completedAt: isComplete ? Date.now() : undefined } : m
        ),
      });

      if (isComplete) {
        eventBridge.emit(EVENTS.EXPANSION_MISSION_COMPLETED, { mission: { ...mission, completed: true, currentValue: newValue } });
      }
    },

    // ── Complete Mission (claim reward) ──
    completeMission: (missionId) => {
      const state = get();
      const mission = state.dynamicMissions.find(m => m.id === missionId && m.completed);
      if (!mission) return null;

      set({
        log: addLog(state, 'mission', 'COMPLETE', `${mission.title} — reward claimed`),
      });

      return mission.reward;
    },

    // ── Shift Market Regime ──
    shiftRegime: (params) => {
      const state = get();
      const shift: RegimeShift = {
        id: uid('rgm'),
        fromRegime: state.currentRegime,
        toRegime: params.toRegime,
        reason: params.reason,
        driftMultiplier: params.driftMultiplier || getDefaultDrift(params.toRegime),
        volatilityMultiplier: params.volatilityMultiplier || getDefaultVolatility(params.toRegime),
        duration: params.durationMs || 300_000, // 5 min default
        startedAt: Date.now(),
        expiresAt: Date.now() + (params.durationMs || 300_000),
        active: true,
      };

      // Deactivate previous shift
      const updatedHistory = state.regimeHistory.map(r => ({ ...r, active: false }));

      set({
        currentRegime: params.toRegime,
        activeRegimeShift: shift,
        regimeHistory: [...updatedHistory, shift].slice(-20),
        log: addLog(state, 'regime', 'SHIFT', `${shift.fromRegime} → ${shift.toRegime}: ${params.reason}`),
        totalExpansions: state.totalExpansions + 1,
        lastExpansionAt: Date.now(),
      });

      eventBridge.emit(EVENTS.EXPANSION_REGIME_SHIFT, { shift });

      // Auto-revert after duration
      setTimeout(() => {
        const current = useExpansionStore.getState();
        if (current.activeRegimeShift?.id === shift.id) {
          useExpansionStore.setState({
            currentRegime: 'stable',
            activeRegimeShift: null,
          });
          eventBridge.emit(EVENTS.EXPANSION_REGIME_SHIFT, {
            shift: { ...shift, active: false, toRegime: 'stable', reason: 'Regime expired — returning to stable' },
          });
        }
      }, shift.duration);

      return shift;
    },

    // ── Inject News ──
    injectNews: (params) => {
      const state = get();
      set({
        log: addLog(state, 'news', 'INJECT', params.headline),
        totalExpansions: state.totalExpansions + 1,
        lastExpansionAt: Date.now(),
      });

      eventBridge.emit(EVENTS.EXPANSION_NEWS_INJECTED, {
        headline: params.headline,
        body: params.body,
        source: params.source || 'ATHENA INTELLIGENCE',
        sentiment: params.sentiment,
        category: params.category || 'macro',
      });
    },

    // ── Tick dynamic instrument prices ──
    tickPrices: () => {
      const state = get();
      if (state.dynamicInstruments.length === 0) return;

      const regime = state.activeRegimeShift;
      const driftMult = regime?.active ? regime.driftMultiplier : 1.0;
      const volMult = regime?.active ? regime.volatilityMultiplier : 1.0;

      const updated = state.dynamicInstruments.map(inst => {
        const volMap = { low: 0.002, medium: 0.008, high: 0.02, extreme: 0.05 };
        const baseVol = volMap[inst.volatility] || 0.008;
        const vol = baseVol * volMult;

        // Random walk with drift
        const noise = (Math.random() - 0.5) * 2 * vol;
        const drift = (driftMult - 1.0) * 0.1; // scale drift down
        const changePercent = noise + drift;
        const newPrice = Math.max(0.01, inst.price * (1 + changePercent));
        const change24h = ((newPrice - (inst.ipoPrice || inst.price)) / (inst.ipoPrice || inst.price)) * 100;

        return {
          ...inst,
          price: Math.round(newPrice * 100) / 100,
          change24h: Math.round(change24h * 100) / 100,
          priceHistory: [...inst.priceHistory.slice(-49), Math.round(newPrice * 100) / 100],
          isIPO: false,
        };
      });

      set({ dynamicInstruments: updated });
    },

    // ── Getters ──
    getActiveMissions: () => get().dynamicMissions.filter(m => !m.completed && (!m.deadline || m.deadline > Date.now())),
    getPendingEvents: () => get().dynamicEvents.filter(e => !e.resolved && (!e.expiresAt || e.expiresAt > Date.now())),
    getAllInstruments: () => get().dynamicInstruments,
  }),
);

// ── Default regime parameters ──

function getDefaultDrift(regime: MarketRegime): number {
  const map: Record<MarketRegime, number> = {
    bull: 1.015, bear: 0.985, volatile: 1.0, crash: 0.95,
    recovery: 1.01, bubble: 1.03, stable: 1.0,
  };
  return map[regime] || 1.0;
}

function getDefaultVolatility(regime: MarketRegime): number {
  const map: Record<MarketRegime, number> = {
    bull: 1.2, bear: 1.5, volatile: 2.5, crash: 4.0,
    recovery: 1.3, bubble: 3.0, stable: 1.0,
  };
  return map[regime] || 1.0;
}
