/**
 * Living World Tick Processor
 *
 * Runs alongside empireStore.processTick() to handle:
 * - Emergent supply chain formation between nearby ventures
 * - Route traffic boosting for active connections
 * - Franchise eligibility detection
 *
 * Called from the game's tick loop. Operates on livingWorldStore data.
 */

import { distance } from '@turf/distance';
import {
  getAllWorldNodes,
  createOrBoostRoute,
  type WorldNode,
  type WorldRoute,
} from './livingWorldSync';

const MAX_SUPPLY_CHAIN_DISTANCE_KM = 5000;
const COMPATIBLE_SECTORS: Record<string, string[]> = {
  tech:          ['manufacturing', 'energy', 'finance', 'education'],
  manufacturing: ['tech', 'energy', 'oil_gas', 'defense', 'retail'],
  finance:       ['tech', 'pharma', 'energy', 'retail', 'hospitality'],
  energy:        ['manufacturing', 'oil_gas', 'tech', 'defense'],
  oil_gas:       ['energy', 'manufacturing', 'defense'],
  pharma:        ['healthcare', 'tech', 'finance'],
  healthcare:    ['pharma', 'education', 'tech'],
  education:     ['tech', 'healthcare', 'cultural'],
  cultural:      ['education', 'hospitality', 'venue'],
  hospitality:   ['venue', 'cultural', 'retail', 'finance'],
  venue:         ['hospitality', 'cultural', 'retail'],
  defense:       ['tech', 'manufacturing', 'energy', 'oil_gas'],
  retail:        ['manufacturing', 'hospitality', 'tech', 'finance'],
};

/**
 * Process one world tick for a player's ventures.
 * Should be called once per game tick.
 */
export async function processWorldTick(playerNodeIds: string[]): Promise<void> {
  if (playerNodeIds.length < 2) return;

  const allNodes = getAllWorldNodes();
  const playerNodes = playerNodeIds
    .map(id => allNodes[id])
    .filter(Boolean);

  if (playerNodes.length < 2) return;

  // Auto-form supply chains between compatible nearby ventures
  for (let i = 0; i < playerNodes.length; i++) {
    for (let j = i + 1; j < playerNodes.length; j++) {
      const a = playerNodes[i];
      const b = playerNodes[j];

      const dist = distance(
        [a.lng, a.lat],
        [b.lng, b.lat],
        { units: 'kilometers' }
      );

      if (dist > MAX_SUPPLY_CHAIN_DISTANCE_KM) continue;

      // Determine route type based on sector compatibility
      const routeType = getRouteType(a.sector, b.sector);
      if (!routeType) continue;

      // Boost existing route or create new one
      await createOrBoostRoute(a.id, b.id, routeType, 0.5);
    }
  }
}

/**
 * Determine route type based on sector pairing.
 */
function getRouteType(sectorA: string, sectorB: string): WorldRoute['route_type'] | null {
  if (sectorA === sectorB) return 'distribution';

  const compatA = COMPATIBLE_SECTORS[sectorA] || [];
  const compatB = COMPATIBLE_SECTORS[sectorB] || [];

  if (compatA.includes(sectorB) || compatB.includes(sectorA)) {
    return 'supply_chain';
  }

  return null;
}

/**
 * Check franchise eligibility for a node.
 * Eligible if level >= 3 and investor_count >= 10.
 */
export function isFranchiseEligible(node: WorldNode): boolean {
  return node.level >= 3 && node.investor_count >= 10;
}

/**
 * Get early investor bonus multiplier.
 * First 5 investors get +10% income bonus.
 */
export function getEarlyInvestorBonus(investorPosition: number): number {
  if (investorPosition <= 5) return 1.10;
  return 1.0;
}

/**
 * Get route visual tier based on traffic score.
 */
export function getRouteVisualTier(trafficScore: number): 'hidden' | 'emerging' | 'established' | 'dominant' {
  if (trafficScore < 10) return 'hidden';
  if (trafficScore < 50) return 'emerging';
  if (trafficScore < 200) return 'established';
  return 'dominant';
}
