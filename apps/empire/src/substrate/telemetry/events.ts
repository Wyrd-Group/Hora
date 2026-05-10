/**
 * substrate/telemetry/events.ts — Substrate Mode telemetry taxonomy.
 *
 * Source of truth: AEGIS_BUILD_SPEC.md §12.1 (the table of events).
 * One TS const per event name, one TS interface per payload shape.
 *
 * The `emit(eventType, payload)` function:
 *   1. Writes through to the Shared Brain via `brain.learn('aegis_substrate', eventType, payload)`
 *      so the L0..L-n cascade and other engines can pick the signal up
 *      without AEGIS having to know about them. (Spec §6.3.)
 *   2. Buffers locally to `substrate_telemetry_events_buffer`. Phase 0
 *      ships the buffer table + best-effort write; the nightly batch
 *      transport to NCOE is Phase 1 work (spec §12.2).
 *   3. Returns a Promise<void> that never rejects — telemetry must
 *      never be on the critical path for gameplay.
 *
 * Privacy (spec §12.3): the payload body never contains player real
 * identity. Player IDs are pseudonymous tokens; real identities are
 * resolved only at spinout time on the NCOE side.
 *
 * Firewall (spec §4.1): no event in this taxonomy joins against
 * `academy_*` tables or carries an ECFL flag.
 */

import { supabase } from '../../lib/supabase';
import { brain } from '../../lib/brain';
import type { SubstrateTelemetryEvent } from '../types';

// ── Event-name constants (spec §12.1) ────────────────────────────────

export const SUBSTRATE_EVENTS = {
  // Mode entry (Phase 0 emits this)
  MODE_ENTERED_SUBSTRATE: 'mode_entered_substrate',

  // ToS (Phase 0 emits these)
  SUBSTRATE_TOS_VIEWED: 'substrate_tos_viewed',
  SUBSTRATE_TOS_ACCEPTED: 'substrate_tos_accepted',
  SUBSTRATE_TOS_DECLINED: 'substrate_tos_declined',

  // Venture lifecycle (Phase 1)
  VENTURE_ADOPTED: 'venture_adopted',
  VENTURE_MILESTONE: 'venture_milestone',
  VENTURE_STATUS_CHANGE: 'venture_status_change',

  // Athena co-creation (Phase 1)
  ATHENA_SESSION_STARTED: 'athena_session_started',
  ATHENA_MESSAGE_SENT: 'athena_message_sent',

  // Toolkit pieces (Phase 1+)
  PIECE_AUTHORED: 'piece_authored',
  PIECE_PUBLISHED: 'piece_published',

  // Marketplace (Phase 1+)
  PRICING_DECISION: 'pricing_decision',
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  TRANSACTION_SETTLED: 'transaction_settled',
  PIVOT_EVENT: 'pivot_event',

  // Substrate Briefings (Phase 1+)
  BRIEFING_PUBLISHED: 'briefing_published',
  BRIEFING_RATED: 'briefing_rated',

  // Agent-card cross-pollination — dual-purpose per spec §12.4 (Phase 1+)
  AGENT_CARD_ACTION: 'agent_card_action',
} as const;

export type SubstrateEventType =
  (typeof SUBSTRATE_EVENTS)[keyof typeof SUBSTRATE_EVENTS];

// ── Per-event payload shapes (§12.1 — payload key fields) ────────────

/** Phase 0: emitted on mount of `<Substrate />`. */
export interface ModeEnteredSubstratePayload {
  player_id: string;
  source?: 'onboarding-hub' | 'direct-link' | 'unknown';
  ts: number;
}

/** Phase 0: emitted when the interstitial first renders. */
export interface SubstrateTosViewedPayload {
  player_id: string;
  tos_version: string;
  ts: number;
}

/** Phase 0: emitted on [Accept]. */
export interface SubstrateTosAcceptedPayload {
  player_id: string;
  tos_version: string;
  ts: number;
}

/** Phase 0: emitted on [Return] / [Decline]. */
export interface SubstrateTosDeclinedPayload {
  player_id: string;
  tos_version: string;
  ts: number;
}

// Phase 1+ payload shapes — referenced by name from §12.1; bodies kept
// minimal here so the file compiles cleanly. Phase 1 will fill fields.

export interface VentureAdoptedPayload {
  venture_id: string;
  player_id: string;
  company_id: string;
  starting_capital: number;
}

export interface VentureMilestonePayload {
  venture_id: string;
  milestone:
    | 'first_revenue'
    | 'survive_30'
    | 'profitability'
    | 'exit'
    | string;
  value: number | string;
}

export interface VentureStatusChangePayload {
  venture_id: string;
  before: string;
  after: string;
}

export interface AthenaSessionStartedPayload {
  venture_id: string;
  athena_session_id: string;
  /** Hash of the system prompt used for this session — handy for compile-side analysis. */
  system_prompt_hash: string;
}

export interface AthenaMessageSentPayload {
  athena_session_id: string;
  role: 'user' | 'assistant';
  content_hash: string;
  input_tokens?: number;
  output_tokens?: number;
}

export interface PieceAuthoredPayload {
  venture_id: string;
  piece_kind: string;
  artifact_hash: string;
  version: number;
}

export interface PiecePublishedPayload {
  venture_id: string;
  piece_kind: string;
  listing_id: string;
  pricing_tiers: Array<Record<string, unknown>>;
}

export interface PricingDecisionPayload {
  venture_id: string;
  listing_id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  rationale?: string;
}

export interface SubscriptionCreatedPayload {
  venture_id: string;
  listing_id: string;
  buyer_kind: 'player' | 'npc';
  buyer_id: string;
  tier: string;
}

export interface SubscriptionCanceledPayload {
  venture_id: string;
  listing_id: string;
  buyer_id: string;
  reason?: string;
}

export interface TransactionSettledPayload {
  venture_id: string;
  amount: number;
  parties: { from_id: string; to_id: string };
}

export interface PivotEventPayload {
  venture_id: string;
  kind: 'pricing' | 'segment' | 'packaging' | 'gtm' | 'feature';
  before: string;
  after: string;
}

export interface BriefingPublishedPayload {
  briefing_id: string;
  venture_id: string;
  format: '5_min_read' | 'interactive_module' | 'video' | 'scenario';
}

export interface BriefingRatedPayload {
  briefing_id: string;
  rating: number;
  rater_id: string;
}

/**
 * Per spec §12.4: dual-purpose event. Gameplay AND training signal for
 * the L0..L-n synthetic agents. Do not omit.
 */
export interface AgentCardActionPayload {
  card_id: string;
  action: 'hire' | 'deploy' | 'fire' | 'upgrade' | string;
  context: Record<string, unknown>;
}

// ── Type-level mapping from event name → payload ─────────────────────

export interface SubstrateEventPayloads {
  mode_entered_substrate: ModeEnteredSubstratePayload;
  substrate_tos_viewed: SubstrateTosViewedPayload;
  substrate_tos_accepted: SubstrateTosAcceptedPayload;
  substrate_tos_declined: SubstrateTosDeclinedPayload;
  venture_adopted: VentureAdoptedPayload;
  venture_milestone: VentureMilestonePayload;
  venture_status_change: VentureStatusChangePayload;
  athena_session_started: AthenaSessionStartedPayload;
  athena_message_sent: AthenaMessageSentPayload;
  piece_authored: PieceAuthoredPayload;
  piece_published: PiecePublishedPayload;
  pricing_decision: PricingDecisionPayload;
  subscription_created: SubscriptionCreatedPayload;
  subscription_canceled: SubscriptionCanceledPayload;
  transaction_settled: TransactionSettledPayload;
  pivot_event: PivotEventPayload;
  briefing_published: BriefingPublishedPayload;
  briefing_rated: BriefingRatedPayload;
  agent_card_action: AgentCardActionPayload;
}

// ── emit(...) ────────────────────────────────────────────────────────

/**
 * Emit a Substrate telemetry event.
 *
 * Behaviour:
 *   1. Forwards through `brain.learn('aegis_substrate', eventType, payload)`
 *      so the engine cascade can pick it up (spec §6.3).
 *   2. Buffers a row in `substrate_telemetry_events_buffer` so the
 *      Phase 1 nightly batch ship-up has data to drain. Phase 0 is a
 *      best-effort stub — failures are swallowed because telemetry must
 *      never break gameplay.
 *
 * The function never throws. Callers can `void emit(...)` safely.
 */
export async function emit<E extends SubstrateEventType>(
  eventType: E,
  payload: SubstrateEventPayloads[E],
): Promise<void> {
  // 1. Brain learn — strictly no-op if the brain isn't loadable.
  try {
    await brain.learn(
      'aegis_substrate',
      eventType,
      payload as unknown as Record<string, unknown>,
    );
  } catch (err) {
    // Telemetry must never affect gameplay — log and continue.
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('[substrate/telemetry] brain.learn failed:', (err as Error)?.message);
    }
  }

  // 2. Local buffer write. Phase 1 owns the durable buffer + retry
  //    transport (`telemetry/upload.ts`); this insert is the
  //    write-side that drains. Some event types do not carry a
  //    `player_id` (e.g. `subscription_created` carries `buyer_id`,
  //    `transaction_settled` carries `parties`). For those we derive
  //    a best-available actor token so the row still lands.
  try {
    const p = payload as unknown as Record<string, unknown>;
    const actorId =
      (p.player_id as string | undefined) ??
      (p.buyer_id as string | undefined) ??
      (p.rater_id as string | undefined) ??
      ((p.parties as { from_id?: string } | undefined)?.from_id) ??
      '';
    if (!actorId) return;

    const row: SubstrateTelemetryEvent = {
      user_id: actorId,
      event_type: eventType,
      payload: payload as unknown as Record<string, unknown>,
    };

    // Best-effort fire-and-forget. We do not await this strictly so a
    // hung Supabase request can't stall the UI.
    await supabase.from('substrate_telemetry_events_buffer').insert(row);
  } catch (err) {
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('[substrate/telemetry] buffer insert failed:', (err as Error)?.message);
    }
  }
}

export default emit;
