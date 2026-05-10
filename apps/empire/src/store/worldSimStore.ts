/**
 * worldSimStore.ts — AI Simulation Outputs Store
 *
 * Orchestrates all AI engines for the Living World Engine.
 * Stores computed regional regimes, network analysis,
 * and income/cost modifiers applied during processTick().
 */

import { create } from 'zustand';
import {
  type MacroData,
  type RegionalMacroRegime,
  getRegionalRegime,
} from '../lib/engines/macroEngine';
import {
  type WorldNetworkAnalysis,
  worldNetworkAnalysis,
} from '../lib/engines/gnnEngine';
import {
  type WorldSignal,
  generateWorldSignals,
} from '../lib/engines/aiController';
import { eventBridge, EVENTS } from '../lib/eventBridge';

interface WorldSimState {
  // Regional macro regimes (h3 → regime)
  regionalRegimes: Record<string, RegionalMacroRegime>;

  // Network analysis results
  networkAnalysis: WorldNetworkAnalysis | null;

  // Computed modifiers for processTick integration
  incomeModifiers: Record<string, number>;  // nodeId → multiplier
  costModifiers: Record<string, number>;    // nodeId → multiplier

  // World-level AI signals
  worldSignals: WorldSignal[];

  // Last computation timestamp
  lastSimTick: number;

  // Actions
  runWorldSimulation: (params: {
    macroData: MacroData;
    worldNodes: Array<{ id: string; sector: string; h3_index: string; investor_count: number; base_income: number; lat: number; lng: number }>;
    worldRoutes: Array<{ id: string; from_node_id: string; to_node_id: string; route_type: string; traffic_score: number }>;
    worldEvents: Array<{ event_type: string; region_h3: string | null; sector: string | null; severity: number; effects: Record<string, number> }>;
    playerRegion?: string;
  }) => void;

  getNodeModifier: (nodeId: string) => { income: number; cost: number };
}

export const useWorldSimStore = create<WorldSimState>()((set, get) => ({
  regionalRegimes: {},
  networkAnalysis: null,
  incomeModifiers: {},
  costModifiers: {},
  worldSignals: [],
  lastSimTick: 0,

  runWorldSimulation: ({ macroData, worldNodes, worldRoutes, worldEvents, playerRegion }) => {
    if (worldNodes.length === 0) return;

    // 1. Compute regional regimes
    const h3Set = new Set(worldNodes.map(n => n.h3_index));
    const regionalRegimes: Record<string, RegionalMacroRegime> = {};

    for (const h3 of h3Set) {
      const regionEvents = worldEvents.filter(
        e => e.region_h3 === h3 || e.region_h3 === null
      );
      regionalRegimes[h3] = getRegionalRegime(macroData, h3, regionEvents);
    }

    // 2. Network analysis
    const nodeIdToIdx: Record<string, number> = {};
    const nodeIds: string[] = [];
    worldNodes.forEach((n, i) => {
      nodeIdToIdx[n.id] = i;
      nodeIds.push(n.id);
    });

    const routeTuples = worldRoutes
      .map(r => ({
        fromIdx: nodeIdToIdx[r.from_node_id],
        toIdx: nodeIdToIdx[r.to_node_id],
        traffic: r.traffic_score,
      }))
      .filter(r => r.fromIdx !== undefined && r.toIdx !== undefined);

    const networkResult = worldNetworkAnalysis(nodeIds, routeTuples);

    // 3. Compute per-node income/cost modifiers
    const incomeModifiers: Record<string, number> = {};
    const costModifiers: Record<string, number> = {};

    for (const node of worldNodes) {
      const regime = regionalRegimes[node.h3_index];
      let incomeMod = regime ? regime.incomeMultiplier : 1.0;
      let costMod = regime ? regime.costMultiplier : 1.0;

      // Network centrality bonus: well-connected nodes earn more
      const centrality = networkResult.centrality[node.id] || 0;
      const avgCentrality = nodeIds.length > 0
        ? Object.values(networkResult.centrality).reduce((s, v) => s + v, 0) / nodeIds.length
        : 0;
      if (centrality > avgCentrality * 1.5) {
        incomeMod *= 1.15; // 15% network effect bonus
      }

      // Community synergy: nodes in larger communities get bonus
      const communityId = networkResult.communities[node.id];
      if (communityId !== undefined) {
        const communitySize = Object.values(networkResult.communities).filter(c => c === communityId).length;
        if (communitySize >= 5) {
          incomeMod *= 1.10; // 10% ecosystem synergy
        }
      }

      // Sector-specific event modifiers
      const sectorEvents = worldEvents.filter(
        e => (e.sector === node.sector || e.sector === null) &&
             (e.region_h3 === node.h3_index || e.region_h3 === null)
      );
      for (const evt of sectorEvents) {
        if (evt.effects.income_modifier) incomeMod *= (1 + evt.effects.income_modifier * evt.severity);
        if (evt.effects.cost_modifier) costMod *= (1 + evt.effects.cost_modifier * evt.severity);
      }

      incomeModifiers[node.id] = Math.round(incomeMod * 100) / 100;
      costModifiers[node.id] = Math.round(costMod * 100) / 100;
    }

    // 4. Generate world signals
    const worldSignals = generateWorldSignals({
      macro: macroData,
      worldNodes,
      worldRoutes,
      worldEvents,
      playerRegion,
    });

    set({
      regionalRegimes,
      networkAnalysis: networkResult,
      incomeModifiers,
      costModifiers,
      worldSignals,
      lastSimTick: Date.now(),
    });

    eventBridge.emit(EVENTS.WORLD_SIM_UPDATED, {
      incomeModifiers,
      costModifiers,
      networkAnalysis: networkResult,
    });
  },

  getNodeModifier: (nodeId: string) => {
    const state = get();
    return {
      income: state.incomeModifiers[nodeId] ?? 1.0,
      cost: state.costModifiers[nodeId] ?? 1.0,
    };
  },
}));
