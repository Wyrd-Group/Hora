/**
 * useWorldEngineTicker — Runs Living World Engine alongside main game loop.
 *
 * Every tick:
 * 1. processWorldTick: auto-forms supply chains between player ventures
 * 2. runWorldSimulation: computes AI modifiers (regional regimes, network centrality, event effects)
 *
 * Runs every 2nd game tick (60s) to reduce Supabase API calls.
 */

import { useEffect, useRef } from 'react';
import { useEmpireStore } from '../store/empireStore';
import { useLivingWorldStore } from '../store/livingWorldStore';
import { useWorldSimStore } from '../store/worldSimStore';
import { processWorldTick } from '../lib/worldTickProcessor';
import {
  getAllWorldNodes,
  getAllWorldRoutes,
  getActiveWorldEvents,
  type WorldEvent,
  type WorldNode,
} from '../lib/livingWorldSync';
import { processAgentTick } from '../lib/agentEngine';

/** Derive macro data from live world state instead of using static values. */
function deriveMacroData(nodes: WorldNode[], events: WorldEvent[]) {
  const nodeCount = nodes.length;
  nodes.reduce((s, n) => s + n.investor_count, 0);

  // Events shift macro conditions
  let inflationShift = 0;
  let unemploymentShift = 0;
  let growthShift = 0;
  for (const e of events) {
    if (e.event_type === 'boom' || e.event_type === 'opportunity') {
      growthShift += 0.3 * e.severity;
      unemploymentShift -= 0.2 * e.severity;
    } else if (e.event_type === 'bust' || e.event_type === 'crisis') {
      growthShift -= 0.4 * e.severity;
      unemploymentShift += 0.3 * e.severity;
      inflationShift += 0.2 * e.severity;
    } else if (e.event_type === 'disruption') {
      inflationShift += 0.15 * e.severity;
    }
  }

  // More nodes/investors = stronger economy
  const densityFactor = Math.min(nodeCount / 100, 1); // 0-1 scale
  const phase = growthShift > 0.2 ? 'expansion'
    : growthShift < -0.2 ? 'contraction'
    : densityFactor > 0.5 ? 'expansion' : 'recovery';

  return {
    inflation: Math.max(0, 2.5 + inflationShift + densityFactor * 1.5),
    inflationExpectations: Math.max(0, 2.8 + inflationShift * 0.6),
    gdpGap: -0.5 + growthShift + densityFactor * 0.8,
    unemployment: Math.max(2, 5.0 + unemploymentShift - densityFactor * 1.5),
    policyRate: Math.max(0, 4.0 + inflationShift * 0.5),
    creditGrowth: [2.0 + growthShift, 2.2 + growthShift, 2.1 + growthShift],
    defaults: [Math.max(0, 0.02 - growthShift * 0.01), Math.max(0, 0.03 - growthShift * 0.01)],
    economicPhase: phase,
    yieldRates: [4.5 + inflationShift * 0.3, 4.2 + inflationShift * 0.2, 3.8 + inflationShift * 0.1],
  };
}

export function useWorldEngineTicker() {
  const gameTick = useEmpireStore(s => s.gameTick);
  const nodes = useEmpireStore(s => s.nodes);
  const worldNodes = useLivingWorldStore(s => s.worldNodes);
  const runWorldSimulation = useWorldSimStore(s => s.runWorldSimulation);
  const tickRef = useRef(0);

  useEffect(() => {
    // Only run every 2nd tick
    if (gameTick === tickRef.current) return;
    tickRef.current = gameTick;
    if (gameTick % 2 !== 0) return;

    // Collect player's world-linked node IDs
    const playerWorldNodeIds = Object.values(nodes)
      .filter(n => n.owner === 'player' && n.worldNodeId)
      .map(n => n.worldNodeId!);

    // 1. Process world tick (auto-form supply chains)
    if (playerWorldNodeIds.length >= 2) {
      processWorldTick(playerWorldNodeIds).catch(err => {
        console.warn('[WorldTick] Supply chain processing failed:', err?.message || err);
      });
    }

    // 2. Run AI simulation if we have world data
    const allNodes = getAllWorldNodes();
    const allRoutes = getAllWorldRoutes();
    const activeEvents = getActiveWorldEvents();
    const worldNodeArray = Object.values(allNodes);

    if (worldNodeArray.length > 0) {
      runWorldSimulation({
        macroData: deriveMacroData(worldNodeArray, activeEvents),
        worldNodes: worldNodeArray.map(n => ({
          id: n.id,
          sector: n.sector,
          h3_index: n.h3_index,
          investor_count: n.investor_count,
          base_income: n.base_income,
          lat: n.lat,
          lng: n.lng,
        })),
        worldRoutes: Object.values(allRoutes).map(r => ({
          id: r.id,
          from_node_id: r.from_node_id,
          to_node_id: r.to_node_id,
          route_type: r.route_type,
          traffic_score: r.traffic_score,
        })),
        worldEvents: activeEvents.map(e => ({
          event_type: e.event_type,
          region_h3: e.region_h3,
          sector: e.sector,
          severity: e.severity,
          effects: (e.effects || {}) as Record<string, number>,
        })),
      });
    }

    // 3. Process agent card behaviors (autonomous decision-making)
    processAgentTick(gameTick);
  }, [gameTick, nodes, worldNodes, runWorldSimulation]);
}
