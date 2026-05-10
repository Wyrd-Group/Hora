/**
 * substrate/npc/personas.ts — five base NPC personas (§8.2).
 *
 * Per AEGIS_BUILD_SPEC.md §8 + Phase 1 build brief task G:
 *
 *   - Five categories: PriceSensitiveConsumer, EnterpriseBuyer,
 *     CompetitorDesk, RegulatorAuditor, DistributionChannel.
 *   - Each persona's parameters are anchored in real data via the
 *     brain — `brain.recall(...)` and `brain.getSharedInsight(...)` —
 *     never directly into `quadratic-ip/forge/` engines (§17.9).
 *   - Defensive design (Sentinel pattern §8.8): one bad persona can't
 *     crash the engine.
 *
 * British English in any new copy. No academy_*.
 */

import type { NpcPersonaKind } from '../types';

export interface PersonaBehaviourParams {
  /** Customer segment label (e.g. "EU mid-cap fintech"). */
  segment: string;
  /** Willingness to pay per unit time, in Substrate currency. */
  willingness_to_pay: number;
  /** Threshold above which the NPC churns out of subscriptions. */
  churn_threshold: number;
  /** Days of "due diligence" before subscribing. */
  due_diligence_days: number;
  /** Probability per tick of any market action (subscribe / publish / cancel). */
  action_probability_per_tick: number;
  /** Persona-specific extras. */
  extras?: Record<string, unknown>;
}

export interface PersonaDefinition {
  id: string;
  kind: NpcPersonaKind;
  name: string;
  /** Which brain insight feed this persona reads to anchor params. */
  anchored_in: 'themis' | 'apollo' | 'gdelt' | 'ais' | 'aegis_geopolitical';
  /** Defaults — instantiator can layer per-instance overrides. */
  defaults: PersonaBehaviourParams;
}

export const PERSONA_DEFINITIONS: ReadonlyArray<PersonaDefinition> = [
  {
    id: 'persona_price_sensitive_consumer',
    kind: 'PriceSensitiveConsumer',
    name: 'Price-sensitive consumer',
    anchored_in: 'themis',
    defaults: {
      segment: 'EU price-sensitive consumer',
      willingness_to_pay: 12,
      churn_threshold: 18,
      due_diligence_days: 0,
      action_probability_per_tick: 0.20,
      extras: { wallet_preference: 'personal' },
    },
  },
  {
    id: 'persona_enterprise_buyer',
    kind: 'EnterpriseBuyer',
    name: 'Enterprise buyer',
    anchored_in: 'apollo',
    defaults: {
      segment: 'EU mid-cap fintech',
      willingness_to_pay: 200,
      churn_threshold: 320,
      due_diligence_days: 14,
      action_probability_per_tick: 0.06,
      extras: { wallet_preference: 'company', rfp_driven: true },
    },
  },
  {
    id: 'persona_competitor_desk',
    kind: 'CompetitorDesk',
    name: 'Competitor desk',
    anchored_in: 'aegis_geopolitical',
    defaults: {
      segment: 'Substrate rival venture',
      willingness_to_pay: 0,
      churn_threshold: 0,
      due_diligence_days: 0,
      action_probability_per_tick: 0.10,
      extras: { mimic_player_pricing: true },
    },
  },
  {
    id: 'persona_regulator_auditor',
    kind: 'RegulatorAuditor',
    name: 'Regulator / auditor',
    anchored_in: 'aegis_geopolitical',
    defaults: {
      segment: 'EU compliance reviewer',
      willingness_to_pay: 0,
      churn_threshold: 0,
      due_diligence_days: 30,
      action_probability_per_tick: 0.02,
      extras: { raises_objections: true },
    },
  },
  {
    id: 'persona_distribution_channel',
    kind: 'DistributionChannel',
    name: 'Distribution channel',
    anchored_in: 'gdelt',
    defaults: {
      segment: 'Reseller / aggregator',
      willingness_to_pay: 80,
      churn_threshold: 110,
      due_diligence_days: 7,
      action_probability_per_tick: 0.08,
      extras: { demands_margin: 0.20 },
    },
  },
] as const;

export const PERSONA_BY_KIND: ReadonlyMap<NpcPersonaKind, PersonaDefinition> = new Map(
  PERSONA_DEFINITIONS.map((p) => [p.kind, p]),
);
