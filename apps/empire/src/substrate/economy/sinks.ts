/**
 * substrate/economy/sinks.ts — explicit value-destruction sinks.
 *
 * Per AEGIS_BUILD_SPEC.md §4.5 + §17.8, the in-game economy MUST have
 * explicit value-destruction sinks. Without them, virtual currency
 * inflates until the validation signal collapses — subscribers stop
 * churning on price hikes, NPCs stop gating adoption, and the deal
 * memo claim "this priced at €170/seat" no longer maps onto reality.
 *
 * What this file provides:
 *
 *   1. `applyChurnPressure(subscription, currentPrice)`
 *      Probability the NPC subscriber cancels at this price. Used by
 *      the NPC marketplace tick to drive realistic churn.
 *
 *   2. `applyTransactionFee(amount)`
 *      Pure function: takes a gross amount, returns
 *      `{ net, fee }` with the platform fee removed. Default 3%,
 *      tunable via `setPlatformFeeRate()`.
 *
 *   3. `applyUpkeep(venture)`
 *      Per-tick operating cost based on venture complexity. Hooks
 *      into the existing AEGIS department-cost infra by approximating
 *      complexity from the number of required pieces.
 *
 *   4. `applyTaxation(income)`
 *      Reuses the existing `data/taxData.ts` `computeTransfer`
 *      function so Substrate companies are taxed exactly like
 *      Campaign companies.
 *
 *   5. `recordAgentCardCost(card, action)`
 *      Debit when a player hires/upgrades an agent card for a venture.
 *
 *   6. `inflationGuard(currentVelocity, threshold)`
 *      Quadratic-side dial. If currency velocity exceeds the upper
 *      threshold, raise the platform fee. If it drops below the
 *      lower threshold, lower it. Returns the recommended fee rate
 *      so the caller can apply it.
 *
 *   7. `recordEconomySink({...})`
 *      Construct + emit an `economy_sink_event` payload. Every sink
 *      function above ultimately calls this so the inflation guard
 *      has a single source of truth to tune off.
 *
 * Privacy + firewall:
 *   - No event here joins against academy_* tables (per §4.1).
 *   - No real-money classification — all currency is virtual (per §4.2).
 *   - British English in any new copy.
 *
 * Telemetry:
 *   Every sink emits an `economy_sink_event` via the brain. Phase 1
 *   does not yet wire the buffer — that comes in
 *   `telemetry/upload.ts`. Brain is the canonical write path.
 */

import { computeTransfer } from '../../data/taxData';
import type { EconomySinkEvent, EconomySinkKind, Subscription } from '../types';
import { brain } from '../../lib/brain';

// ── Tunable defaults ───────────────────────────────────────────────

let _platformFeeRate = 0.03; // 3% per build brief task F
const _platformFeeBounds = { min: 0.01, max: 0.10 } as const;

/** Read the current platform fee rate (0..1). */
export function getPlatformFeeRate(): number {
  return _platformFeeRate;
}

/**
 * Override the platform fee. Clamped to [0.01, 0.10] so a misconfigured
 * inflation guard can't drive fees to zero or to confiscatory levels.
 */
export function setPlatformFeeRate(rate: number): number {
  if (!Number.isFinite(rate)) return _platformFeeRate;
  _platformFeeRate = Math.max(_platformFeeBounds.min, Math.min(_platformFeeBounds.max, rate));
  return _platformFeeRate;
}

// ── Recorder (single source of truth) ──────────────────────────────

/**
 * Construct an `EconomySinkEvent` and emit it through the brain so
 * other engines (including the L0..L-n cascade) can observe it. Phase
 * 1 also relies on this for `recentSinkEvents` UI dressing in the
 * substrate store.
 *
 * Returns the event so callers can append it to their local audit
 * buffer if they want.
 */
export function recordEconomySink(params: {
  kind: EconomySinkKind;
  amount: number;
  party_id: string;
  context?: Record<string, unknown>;
}): EconomySinkEvent {
  const ev: EconomySinkEvent = {
    event_id: `sink-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`,
    kind: params.kind,
    amount: params.amount,
    party_id: params.party_id,
    ts: Date.now(),
    context: params.context,
  };
  // Brain write — async, fire-and-forget. Sinks are on the critical
  // path of currency flow; we do NOT await them.
  void brain
    .learn('aegis_substrate_economy', 'economy_sink_event', ev as unknown as Record<string, unknown>)
    .catch(() => {
      /* swallow — telemetry never blocks gameplay */
    });
  return ev;
}

// ── 1. Churn pressure ──────────────────────────────────────────────

/**
 * Probability that a price-sensitive subscriber cancels at the
 * current price. Used by NPC marketplace tick.
 *
 * Model:
 *   - Each NPC has a `willingness_to_pay` (WTP) in their persona
 *     anchor. We approximate with `subscription.tier` price baseline
 *     stored at subscribe time.
 *   - If `currentPrice <= 1.0 * baselineWTP`, churn risk ~5%.
 *   - As `currentPrice` exceeds WTP, churn risk rises sharply
 *     (+30% per 10% over WTP), capped at 95%.
 *   - Missing baseline → defaults to a calm 8% baseline so the
 *     marketplace doesn't grind on cold start.
 */
export function applyChurnPressure(
  _subscription: Subscription,
  currentPrice: number,
  willingnessToPay?: number,
): number {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return 0.95;
  if (!willingnessToPay || willingnessToPay <= 0) return 0.08;
  const overshoot = currentPrice / willingnessToPay - 1; // 0 means at WTP
  if (overshoot <= 0) return 0.05;
  // Linear-ish escalation; cap at 0.95.
  const probability = Math.min(0.95, 0.05 + overshoot * 3.0);
  return probability;
}

// ── 2. Transaction fee ─────────────────────────────────────────────

/**
 * Apply the platform fee to a gross transaction. Returns `{ net, fee }`
 * and emits an `economy_sink_event{kind:'fee'}`.
 */
export function applyTransactionFee(
  amount: number,
  partyId: string = 'platform',
): { net: number; fee: number } {
  if (!Number.isFinite(amount) || amount <= 0) return { net: 0, fee: 0 };
  const fee = Math.round(amount * _platformFeeRate * 100) / 100;
  const net = amount - fee;
  recordEconomySink({
    kind: 'fee',
    amount: fee,
    party_id: partyId,
    context: { gross: amount, fee_rate: _platformFeeRate },
  });
  return { net, fee };
}

// ── 3. Upkeep ─────────────────────────────────────────────────────

/**
 * Per-tick operating cost. Phase 1 approximation: `complexity_units` ×
 * `unit_cost`, where complexity_units is the number of required
 * implementation pieces for the venture and unit_cost is configurable
 * (default €25 per unit per tick).
 */
const UPKEEP_PER_PIECE = 25;

export function applyUpkeep(params: {
  venture_id: string;
  player_id: string;
  required_piece_count: number;
}): { upkeep: number; event: EconomySinkEvent } {
  const upkeep = params.required_piece_count * UPKEEP_PER_PIECE;
  const event = recordEconomySink({
    kind: 'upkeep',
    amount: upkeep,
    party_id: params.player_id,
    context: { venture_id: params.venture_id, pieces: params.required_piece_count },
  });
  return { upkeep, event };
}

// ── 4. Taxation ───────────────────────────────────────────────────

/**
 * Reuse the existing AEGIS taxation. The `computeTransfer` function
 * wraps the corporate WHT + personal dividend tax for a given pair of
 * jurisdictions. Substrate-side this is called when a player extracts
 * profits from their venture's company wallet to their personal one.
 *
 * If the jurisdictions aren't yet set, this returns the default flat
 * 25% rate so cold-start ventures still see some sink pressure rather
 * than zero.
 */
export function applyTaxation(params: {
  income: number;
  player_id: string;
  company_country?: string;
  residency_country?: string;
}): { tax: number; net: number; event: EconomySinkEvent } {
  if (params.company_country && params.residency_country) {
    const result = computeTransfer(
      params.income,
      params.company_country,
      params.residency_country,
    );
    const event = recordEconomySink({
      kind: 'tax',
      amount: result.totalTax,
      party_id: params.player_id,
      context: {
        gross: params.income,
        company_country: params.company_country,
        residency_country: params.residency_country,
        effective_rate: result.effectiveRate,
      },
    });
    return { tax: result.totalTax, net: result.netReceived, event };
  }
  // Cold-start fallback: flat 25%.
  const fallback = Math.round(params.income * 0.25);
  const event = recordEconomySink({
    kind: 'tax',
    amount: fallback,
    party_id: params.player_id,
    context: { gross: params.income, effective_rate: 0.25, fallback: true },
  });
  return { tax: fallback, net: params.income - fallback, event };
}

// ── 5. Agent-card cost ────────────────────────────────────────────

/**
 * Debit when the player hires or upgrades an agent card for a venture.
 * Wires into the existing AEGIS card-purchase flow at the call site —
 * this function only records the sink event so the audit trail is
 * complete. The actual card store debit is done by `agentCardStore`.
 */
export function recordAgentCardCost(params: {
  card_id: string;
  player_id: string;
  action: 'hire' | 'upgrade' | 'fire' | string;
  amount: number;
  venture_id?: string;
}): EconomySinkEvent {
  return recordEconomySink({
    kind: 'card_cost',
    amount: params.amount,
    party_id: params.player_id,
    context: {
      card_id: params.card_id,
      action: params.action,
      venture_id: params.venture_id,
    },
  });
}

// ── 6. Inflation guard ────────────────────────────────────────────

/**
 * Quadratic-side dial. The "currency velocity" input is the rolling
 * window of currency moves per unit time (e.g. last hour). Returns the
 * recommended `platformFeeRate` adjustment.
 *
 * Strategy:
 *   - velocity > upper → raise fee 10% (multiplicative), capped by
 *                        the platformFeeBounds upper limit.
 *   - velocity < lower → lower fee 10% (multiplicative), capped by
 *                        the platformFeeBounds lower limit.
 *   - within window    → no change.
 *
 * Both thresholds are configurable so the founder can tune post-launch
 * without redeploying. Defaults are conservative — the inflation guard
 * is meant to be active management, not a one-shot constant.
 */
export interface InflationGuardThreshold {
  /** Hourly currency-move sum above which we raise fees. */
  upper: number;
  /** Hourly currency-move sum below which we lower fees. */
  lower: number;
}

export const DEFAULT_INFLATION_THRESHOLDS: InflationGuardThreshold = {
  upper: 5_000_000,
  lower: 50_000,
};

export function inflationGuard(
  currentVelocity: number,
  threshold: InflationGuardThreshold = DEFAULT_INFLATION_THRESHOLDS,
): { newRate: number; action: 'raise' | 'lower' | 'hold' } {
  if (!Number.isFinite(currentVelocity) || currentVelocity < 0) {
    return { newRate: _platformFeeRate, action: 'hold' };
  }
  if (currentVelocity > threshold.upper) {
    const raised = setPlatformFeeRate(_platformFeeRate * 1.10);
    recordEconomySink({
      kind: 'inflation_guard',
      amount: 0,
      party_id: 'platform',
      context: { action: 'raise', velocity: currentVelocity, new_fee_rate: raised },
    });
    return { newRate: raised, action: 'raise' };
  }
  if (currentVelocity < threshold.lower) {
    const lowered = setPlatformFeeRate(_platformFeeRate * 0.90);
    recordEconomySink({
      kind: 'inflation_guard',
      amount: 0,
      party_id: 'platform',
      context: { action: 'lower', velocity: currentVelocity, new_fee_rate: lowered },
    });
    return { newRate: lowered, action: 'lower' };
  }
  return { newRate: _platformFeeRate, action: 'hold' };
}
