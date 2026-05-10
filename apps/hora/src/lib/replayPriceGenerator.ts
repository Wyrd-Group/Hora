/**
 * replayPriceGenerator.ts — Generates correlated price curves for all instruments
 * during a replay scenario, seeded deterministically from the scenario seed.
 */

import { ALL_INSTRUMENTS } from '../data/instruments';
import type { ReplayScenario } from '../data/replayScenarios';

// ── Seeded PRNG (same as replayScenarios.ts) ──
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ── Hash instrument ID to a stable seed offset ──
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Correlation factor: how much this instrument follows the scenario's main asset.
 * Same type = higher correlation, different type = lower.
 */
function getCorrelation(instrumentType: string, scenarioAssetType: string): number {
  if (instrumentType === scenarioAssetType) return 0.5 + seededRandom(42) * 0.3;
  // Cross-asset correlations
  const matrix: Record<string, Record<string, number>> = {
    stock:     { crypto: 0.25, forex: 0.15, commodity: 0.20, bond: 0.10 },
    crypto:    { stock: 0.25, forex: 0.10, commodity: 0.15, bond: 0.05 },
    forex:     { stock: 0.15, crypto: 0.10, commodity: 0.20, bond: 0.25 },
    commodity: { stock: 0.20, crypto: 0.15, forex: 0.20, bond: 0.15 },
    bond:      { stock: 0.10, crypto: 0.05, forex: 0.25, commodity: 0.15 },
  };
  return matrix[instrumentType]?.[scenarioAssetType] ?? 0.15;
}

/**
 * Generate price arrays for ALL instruments for a given scenario.
 * Returns a map: instrumentId → number[] (one price per tick).
 *
 * Price generation: each instrument gets a correlated random walk that loosely
 * follows the scenario's main asset trend, scaled to the instrument's base price.
 */
export function generateAllReplayPrices(
  scenario: ReplayScenario,
): Record<string, number[]> {
  const result: Record<string, number[]> = { ...scenario.priceData };

  // Compute main asset's return series for correlation
  const mainInstrumentId = scenario.instruments[0];
  const mainPrices = scenario.priceData[mainInstrumentId];
  if (!mainPrices || mainPrices.length === 0) return result;

  const mainReturns: number[] = [0];
  for (let t = 1; t < mainPrices.length; t++) {
    mainReturns.push((mainPrices[t] - mainPrices[t - 1]) / mainPrices[t - 1]);
  }

  // Find the main asset's type
  const mainInst = ALL_INSTRUMENTS.find(i => i.id === mainInstrumentId);
  const mainType = mainInst?.type ?? 'stock';

  const scenarioSeed = hashId(scenario.id);
  const duration = scenario.duration;

  for (const instrument of ALL_INSTRUMENTS) {
    // Skip if already in scenario's native price data
    if (result[instrument.id]) continue;

    const idSeed = hashId(instrument.id) + scenarioSeed;
    const correlation = getCorrelation(instrument.type, mainType);

    // Volatility based on asset type
    const baseVol: Record<string, number> = {
      stock: 0.012,
      crypto: 0.025,
      forex: 0.004,
      commodity: 0.015,
      bond: 0.003,
    };
    const vol = baseVol[instrument.type] ?? 0.012;

    const prices: number[] = [instrument.price];
    let price = instrument.price;

    for (let t = 1; t < duration; t++) {
      const rng = seededRandom(idSeed + t * 7 + 3);
      const noise = (rng - 0.5) * 2 * vol;

      // Correlated component from main asset
      const mainReturn = t < mainReturns.length ? mainReturns[t] : 0;
      const correlatedReturn = correlation * mainReturn + (1 - correlation) * noise;

      price = price * (1 + correlatedReturn);
      price = Math.max(price * 0.01, price); // floor at 1% of current

      // Round appropriately
      if (price >= 1000) prices.push(Math.round(price * 100) / 100);
      else if (price >= 1) prices.push(Math.round(price * 10000) / 10000);
      else prices.push(Math.round(price * 100000000) / 100000000);
    }

    result[instrument.id] = prices;
  }

  return result;
}

// ── Cached price data per scenario (computed once on load) ──
const priceCache = new Map<string, Record<string, number[]>>();

export function getCachedReplayPrices(scenario: ReplayScenario, minTicks?: number): Record<string, number[]> {
  if (!priceCache.has(scenario.id)) {
    const prices = generateAllReplayPrices(scenario);
    priceCache.set(scenario.id, prices);
  }
  const cached = priceCache.get(scenario.id)!;

  // For live market (free sim): extend prices on-demand if currentTick exceeds duration
  if (minTicks && scenario.id === '__free_sim__') {
    const firstKey = Object.keys(cached)[0];
    if (firstKey && cached[firstKey].length < minTicks) {
      const needed = minTicks - cached[firstKey].length;
      for (const [id, prices] of Object.entries(cached)) {
        const seed = hashId(id) + 7777;
        let price = prices[prices.length - 1];
        const vol = price > 100 ? 0.012 : price > 1 ? 0.015 : 0.025;
        for (let i = 0; i < needed + 100; i++) {
          const t = prices.length + i;
          const rng = seededRandom(seed + t * 7 + 3);
          const noise = (rng - 0.5) * 2 * vol;
          price = price * (1 + noise);
          price = Math.max(price * 0.01, price);
          if (price >= 1000) prices.push(Math.round(price * 100) / 100);
          else if (price >= 1) prices.push(Math.round(price * 10000) / 10000);
          else prices.push(Math.round(price * 100000000) / 100000000);
        }
      }
    }
  }

  return cached;
}

export function clearPriceCache(): void {
  priceCache.clear();
}
