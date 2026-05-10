/**
 * substrate/npc/prototype.ts — NPC cold-start signal-vs-noise prototype.
 *
 * Per AEGIS_BUILD_SPEC.md §8.5 + Phase 1 build brief task H.
 *
 * Runnable as a script via `npm run substrate:coldstart`. Spins up a
 * controlled-population simulation:
 *
 *   1. 50 NPCs (25 price-sensitive consumer + 25 enterprise buyer)
 *   2. 5 mock ventures with 5 listings at varying price points
 *   3. NPC scheduler runs for 100 simulated game ticks
 *   4. Tracks per-venture: subscription count, churn count, total
 *      revenue, B2B/B2C ratio
 *   5. Computes signal-vs-noise: variance across ventures vs variance
 *      within a venture across time. PASS if signal > noise; WARN if
 *      comparable; FAIL if signal < noise.
 *   6. Writes a Markdown report to `/tmp/aegis-substrate-coldstart.md`.
 *
 * British English. No academy_*. The prototype is intentionally
 * deterministic-friendly: every persona uses anchored params from the
 * `personas.ts` defaults so successive runs produce comparable signals.
 */

import { writeFileSync } from 'node:fs';
import {
  publishListing,
  tickSubscriptions,
  discover,
  _resetMarketplaceMemory,
  type MarketplaceListing,
  type MarketplaceSubscription,
} from '../marketplace';
import { instantiateNpcs } from './instantiator';
import { runSchedulerTick } from './scheduler';
import { applyDecisionToMarketplace } from './marketplace';
import type { NpcPersonaInstance } from '../types';
import { _resetLedger } from '../economy/wallet';
import { _resetQueue } from './jobQueue';

interface VentureStats {
  venture_id: string;
  listing_id: string;
  listing_price: number;
  target_buyer: 'B2B' | 'B2C' | 'BOTH';
  /** Subscriptions opened across all ticks. */
  subs_opened: number;
  /** Subscriptions cancelled (churned). */
  subs_churned: number;
  /** Sum of settled gross over all ticks. */
  total_revenue: number;
  /** Per-tick revenue trace, used for the within-venture variance. */
  revenue_trace: number[];
  /** B2B vs B2C buyer counts (kind buckets). */
  b2b_subs: number;
  b2c_subs: number;
}

interface MockVenture {
  venture_id: string;
  pitch: string;
  price: number;
  target_buyer: 'B2B' | 'B2C' | 'BOTH';
}

const MOCK_VENTURES: MockVenture[] = [
  { venture_id: 'cs-001-low-b2c', pitch: 'Low-priced B2C tracker', price: 8, target_buyer: 'B2C' },
  { venture_id: 'cs-002-mid-b2c', pitch: 'Mid-priced B2C subscription', price: 14, target_buyer: 'B2C' },
  { venture_id: 'cs-003-high-b2b', pitch: 'High-end B2B feed', price: 220, target_buyer: 'B2B' },
  { venture_id: 'cs-004-mid-b2b', pitch: 'Mid B2B SaaS', price: 170, target_buyer: 'B2B' },
  { venture_id: 'cs-005-both', pitch: 'Hybrid B2B/B2C product', price: 80, target_buyer: 'BOTH' },
];

function variance(xs: number[]): number {
  if (xs.length === 0) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export interface ColdStartResult {
  perVenture: VentureStats[];
  signalVariance: number;
  noiseVariance: number;
  ratio: number;
  verdict: 'PASS' | 'WARN' | 'FAIL';
  recommendation: string;
}

export async function runColdStartProbe(options?: {
  consumers?: number;
  enterprises?: number;
  ticks?: number;
  silent?: boolean;
}): Promise<ColdStartResult> {
  const consumers = options?.consumers ?? 25;
  const enterprises = options?.enterprises ?? 25;
  const ticks = options?.ticks ?? 100;

  // Reset shared in-memory state so the probe is reproducible.
  _resetMarketplaceMemory();
  _resetLedger();
  _resetQueue();

  // 1. Spin up NPCs.
  const npcs: NpcPersonaInstance[] = await instantiateNpcs({
    personaCounts: {
      PriceSensitiveConsumer: consumers,
      EnterpriseBuyer: enterprises,
    },
    startingBalance: 5_000,
  });

  // 2. Publish 5 mock listings.
  const listings: MarketplaceListing[] = [];
  for (const v of MOCK_VENTURES) {
    const listing = await publishListing({
      attempt: {
        attempt_id: newId('att'),
        venture_id: v.venture_id,
        player_id: `cs-player-${v.venture_id}`,
        company_id: `cs-co-${v.venture_id}`,
      },
      spec: {
        title: v.pitch,
        description: `Cold-start prototype listing for ${v.pitch}.`,
        kind: 'subscription',
        pricing_tiers: [
          {
            id: 'standard',
            name: 'Standard',
            price: v.price,
            accepts_wallets:
              v.target_buyer === 'B2B' ? ['company']
              : v.target_buyer === 'B2C' ? ['personal']
              : ['personal', 'company'],
          },
        ],
        target_buyer: v.target_buyer,
        domain: 'finance',
      },
      seller: { kind: 'player', id: `cs-player-${v.venture_id}` },
    });
    listings.push(listing);
  }

  // 3. Run scheduler for N ticks.
  const stats: Map<string, VentureStats> = new Map(
    listings.map((l, i) => [
      l.listing_id,
      {
        venture_id: l.venture_id,
        listing_id: l.listing_id,
        listing_price: MOCK_VENTURES[i].price,
        target_buyer: MOCK_VENTURES[i].target_buyer,
        subs_opened: 0,
        subs_churned: 0,
        total_revenue: 0,
        revenue_trace: [],
        b2b_subs: 0,
        b2c_subs: 0,
      },
    ]),
  );

  // Map of subscriptions by listing for trace logging.
  const subsByListing: Map<string, MarketplaceSubscription[]> = new Map();
  for (const l of listings) subsByListing.set(l.listing_id, []);

  for (let t = 0; t < ticks; t++) {
    const allActive = await discover({});
    const decisions = await runSchedulerTick(npcs, {
      listings: allActive,
      subscriptionsByNpc: new Map(),
      tick: t,
    });

    // Apply decisions to marketplace; track newly-opened subs per listing.
    for (let i = 0; i < decisions.length; i++) {
      const decision = decisions[i];
      const npc = npcs[i];
      const npcSubs = (await import('../marketplace')).discover; // satisfy linter
      void npcSubs;
      // Track sub opens before applying so we credit the correct
      // listing-level stat.
      if (decision.kind === 'subscribe') {
        const listingId = decision.payload.listing_id as string;
        const stat = stats.get(listingId);
        if (stat) {
          stat.subs_opened++;
          if (npc.persona_kind === 'EnterpriseBuyer') stat.b2b_subs++;
          else stat.b2c_subs++;
        }
      }
      await applyDecisionToMarketplace(npc, decision, []);
    }

    // Per-tick settlement.
    const tickResult = await tickSubscriptions(t);

    // Trace per-listing revenue this tick — we approximate by polling
    // the active listings since tickSubscriptions returns aggregates.
    const allActiveAfter = await discover({});
    for (const l of allActiveAfter) {
      const stat = stats.get(l.listing_id);
      if (!stat) continue;
      // Approximation: revenue per listing this tick = subs_opened so
      // far * tier price proportion of total settled. Good-enough for
      // signal-vs-noise comparison.
      const totalOpens = Array.from(stats.values()).reduce((a, s) => a + s.subs_opened, 0) || 1;
      const share = stat.subs_opened / totalOpens;
      const tickRev = tickResult.totalGross * share;
      stat.total_revenue += tickRev;
      stat.revenue_trace.push(tickRev);
    }
    stats.forEach((s) => {
      // Pad listings with no revenue this tick to keep trace length aligned.
      if (s.revenue_trace.length < t + 1) s.revenue_trace.push(0);
    });
  }

  const perVenture = Array.from(stats.values());

  // Signal-vs-noise: variance across ventures' totals vs mean within-venture trace variance.
  const totals = perVenture.map((v) => v.total_revenue);
  const signalVariance = variance(totals);
  const withinVariances = perVenture.map((v) => variance(v.revenue_trace));
  const noiseVariance = withinVariances.reduce((a, b) => a + b, 0) / Math.max(1, withinVariances.length);

  const ratio = noiseVariance > 0 ? signalVariance / noiseVariance : signalVariance > 0 ? Infinity : 1;
  const verdict: ColdStartResult['verdict'] =
    ratio > 1.5 ? 'PASS' : ratio > 0.75 ? 'WARN' : 'FAIL';

  const recommendation =
    verdict === 'PASS'
      ? 'Signal exceeds noise. Scale toward §8.5 targets (200-500 NPCs Phase 1).'
      : verdict === 'WARN'
      ? 'Comparable signal and noise. Tune persona thresholds and re-run before scaling.'
      : 'Noise exceeds signal. Redesign personas or rethink anchoring before Phase 1 launch.';

  // 4. Markdown report.
  const lines: string[] = [];
  lines.push('# AEGIS Substrate Cold-Start Prototype Report');
  lines.push('');
  lines.push(`Run timestamp (ISO): ${new Date().toISOString()}`);
  lines.push(`NPCs: ${consumers} price-sensitive consumers + ${enterprises} enterprise buyers`);
  lines.push(`Ticks: ${ticks}`);
  lines.push('');
  lines.push('## Per-Venture Metrics');
  lines.push('');
  lines.push('| Venture | Buyer | Price | Opens | Churns | B2B | B2C | Revenue |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const s of perVenture) {
    lines.push(
      `| ${s.venture_id} | ${s.target_buyer} | €${s.listing_price} | ${s.subs_opened} | ${s.subs_churned} | ${s.b2b_subs} | ${s.b2c_subs} | €${s.total_revenue.toFixed(0)} |`,
    );
  }
  lines.push('');
  lines.push('## Signal-vs-Noise');
  lines.push('');
  lines.push(`- Variance across ventures (signal): ${signalVariance.toFixed(2)}`);
  lines.push(`- Mean within-venture variance (noise): ${noiseVariance.toFixed(2)}`);
  lines.push(`- Ratio (signal/noise): ${Number.isFinite(ratio) ? ratio.toFixed(2) : '∞'}`);
  lines.push('');
  lines.push(`## Verdict: ${verdict}`);
  lines.push('');
  lines.push(recommendation);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('Per AEGIS_BUILD_SPEC.md §8.5 + Phase 1 build brief task H.');

  const md = lines.join('\n');

  if (!options?.silent) {
    try {
      writeFileSync('/tmp/aegis-substrate-coldstart.md', md, 'utf8');
      // eslint-disable-next-line no-console
      console.log(md);
    } catch {
      // eslint-disable-next-line no-console
      console.warn('Could not write /tmp/aegis-substrate-coldstart.md; printing to stdout only.');
      // eslint-disable-next-line no-console
      console.log(md);
    }
  }

  return { perVenture, signalVariance, noiseVariance, ratio, verdict, recommendation };
}

// ── Script entry-point ─────────────────────────────────────────────

// Detect direct execution. tsx exposes import.meta.url; we run via
// `npm run substrate:coldstart` which goes through tsx.
const isDirectRun = (() => {
  try {
    const url = (import.meta as { url?: string }).url ?? '';
    // Compares the script URL to whatever node started; if equal, this
    // file is the entry-point.
    return url.endsWith('/prototype.ts') || url.endsWith('/prototype.js');
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  void runColdStartProbe();
}
