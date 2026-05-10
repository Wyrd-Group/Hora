// ============================================================================
// Updater Agent (Supabase Edge Function)
// ============================================================================
// Invoked after Researcher finishes, OR manually via HTTP.
//
// For each 'pending_review' fact from the latest extraction:
//   1. Look up current approved fact for (country, fact_key)
//   2. Compare values:
//      - No previous approved fact → queue as 'new_fact', risk=medium
//      - Same value as current → AUTO-APPROVE (just refreshes lastVerified)
//      - Different value → queue as 'value_change' with risk classification
//   3. Assign risk score:
//      - low: numeric change <5% OR rate change <1pp
//      - medium: numeric change 5–25% OR currency change OR first-time fact
//      - high: >25% change OR structural change OR confidence <0.7
//   4. Write to review_queue + audit log.
//
// Human-in-the-loop: actual value changes NEVER auto-apply. Only confirmations
// of unchanged values are auto-approved (they just bump lastVerified).
// ============================================================================

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { FactValue, JurisdictionalFact } from '../_shared/types.ts';

const AGENT_VERSION = 'updater-v1';

// ----------------------------------------------------------------------------
// Diff logic
// ----------------------------------------------------------------------------

interface DiffResult {
  change_type: 'new_fact' | 'value_change' | 'structural_change' | 'deprecation' | 'unchanged';
  delta_percent: number | null;
  risk_score: 'low' | 'medium' | 'high';
  risk_reasoning: string;
}

function diffFacts(prev: JurisdictionalFact | null, next: JurisdictionalFact): DiffResult {
  // New fact — no previous approved
  if (!prev) {
    return {
      change_type: 'new_fact',
      delta_percent: null,
      risk_score: next.confidence < 0.7 ? 'high' : 'medium',
      risk_reasoning: next.confidence < 0.7
        ? `New fact with low extraction confidence (${next.confidence.toFixed(2)})`
        : 'First-time fact — requires human sign-off on both value and source.',
    };
  }

  const a = prev.value;
  const b = next.value;

  // Structural change: currency swap, unit swap, addition/removal of threshold fields
  const structuralFields: (keyof FactValue)[] = ['currency', 'unit', 'threshold_low', 'threshold_high'];
  for (const key of structuralFields) {
    const prevHas = a[key] !== undefined && a[key] !== null;
    const nextHas = b[key] !== undefined && b[key] !== null;
    if (prevHas !== nextHas) {
      return {
        change_type: 'structural_change',
        delta_percent: null,
        risk_score: 'high',
        risk_reasoning: `Structural field '${key}' added or removed. Requires careful review.`,
      };
    }
    if (prevHas && nextHas && a[key] !== b[key] && key === 'currency') {
      return {
        change_type: 'structural_change',
        delta_percent: null,
        risk_score: 'high',
        risk_reasoning: `Currency changed from ${a.currency} to ${b.currency}. Verify this is intentional.`,
      };
    }
  }

  // Numeric comparison (amount + rate)
  let delta: number | null = null;
  let changed = false;

  if (typeof a.amount === 'number' && typeof b.amount === 'number') {
    if (a.amount === 0) {
      changed = b.amount !== 0;
      delta = changed ? 100 : 0;
    } else {
      delta = ((b.amount - a.amount) / a.amount) * 100;
      changed = Math.abs(delta) > 0.01;
    }
  } else if (typeof a.rate === 'number' && typeof b.rate === 'number') {
    const pp = Math.abs(b.rate - a.rate) * 100;
    changed = pp > 0.01;
    delta = pp; // percentage-point delta, not relative %
  } else {
    // Non-numeric: compare full value objects as JSON
    const aJson = JSON.stringify(a);
    const bJson = JSON.stringify(b);
    changed = aJson !== bJson;
  }

  if (!changed) {
    return {
      change_type: 'unchanged',
      delta_percent: 0,
      risk_score: 'low',
      risk_reasoning: 'Value matches current approved fact. Auto-approve confirms lastVerified.',
    };
  }

  // Classify risk of change
  const absDelta = delta === null ? null : Math.abs(delta);
  let risk: 'low' | 'medium' | 'high';
  let reasoning: string;

  if (absDelta === null) {
    risk = 'high';
    reasoning = 'Non-numeric value changed. Human should verify the new wording.';
  } else if (absDelta < 5) {
    risk = 'low';
    reasoning = `Small change (${absDelta.toFixed(2)}%). Consistent with typical annual adjustment.`;
  } else if (absDelta < 25) {
    risk = 'medium';
    reasoning = `Moderate change (${absDelta.toFixed(1)}%). Verify against official announcement.`;
  } else {
    risk = 'high';
    reasoning = `Large change (${absDelta.toFixed(1)}%). Unusual — likely extraction error unless a real reform occurred.`;
  }

  // Downgrade if extractor confidence is low
  if (next.confidence < 0.7 && risk === 'low') risk = 'medium';
  if (next.confidence < 0.5) risk = 'high';

  return {
    change_type: 'value_change',
    delta_percent: delta,
    risk_score: risk,
    risk_reasoning: reasoning,
  };
}

// ----------------------------------------------------------------------------
// Actions
// ----------------------------------------------------------------------------

async function autoApproveUnchanged(
  supabase: SupabaseClient,
  prev: JurisdictionalFact,
  next: JurisdictionalFact,
): Promise<void> {
  // The "new" pending fact is redundant — mark it superseded so we don't clutter
  // the facts table; bump the previous approved fact's fetched_at so the UI
  // reflects fresh verification.
  await supabase
    .from('jurisdictional_facts')
    .update({
      status: 'superseded',
      superseded_by: prev.id,
    })
    .eq('id', next.id);

  await supabase
    .from('jurisdictional_facts')
    .update({
      fetched_at: next.fetched_at,
      source_excerpt: next.source_excerpt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', prev.id);

  await supabase.from('fact_change_log').insert({
    fact_id: prev.id,
    action: 'review_auto_approved',
    actor_type: 'updater_agent',
    actor_id: AGENT_VERSION,
    country_code: prev.country_code,
    fact_key: prev.fact_key,
    details: {
      reason: 'value_unchanged',
      redundant_fact_id: next.id,
      refreshed_at: next.fetched_at,
    },
  });
}

async function queueReview(
  supabase: SupabaseClient,
  prev: JurisdictionalFact | null,
  next: JurisdictionalFact,
  diff: DiffResult,
): Promise<void> {
  const { data: review, error } = await supabase
    .from('review_queue')
    .insert({
      new_fact_id: next.id,
      previous_fact_id: prev?.id ?? null,
      country_code: next.country_code,
      fact_key: next.fact_key,
      change_type: diff.change_type === 'unchanged' ? 'value_change' : diff.change_type,
      old_value: prev?.value ?? null,
      new_value: next.value,
      risk_score: diff.risk_score,
      risk_reasoning: diff.risk_reasoning,
      delta_percent: diff.delta_percent,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) throw new Error(`queue review failed: ${error.message}`);

  await supabase.from('fact_change_log').insert({
    fact_id: next.id,
    review_id: review?.id,
    action: 'review_queued',
    actor_type: 'updater_agent',
    actor_id: AGENT_VERSION,
    country_code: next.country_code,
    fact_key: next.fact_key,
    before_state: prev?.value ?? null,
    after_state: next.value,
    details: {
      change_type: diff.change_type,
      risk_score: diff.risk_score,
      risk_reasoning: diff.risk_reasoning,
      delta_percent: diff.delta_percent,
      confidence: next.confidence,
    },
  });
}

// ----------------------------------------------------------------------------
// Orchestration
// ----------------------------------------------------------------------------

interface RunSummary {
  facts_processed: number;
  auto_approved: number;
  queued_low: number;
  queued_medium: number;
  queued_high: number;
  errors: Array<{ fact_id: string; error: string }>;
}

async function runAgent(): Promise<RunSummary> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Process all pending_review facts that aren't already linked to a review_queue row.
  const { data: pending, error } = await supabase
    .from('jurisdictional_facts')
    .select('*')
    .eq('status', 'pending_review')
    .order('fetched_at', { ascending: true });

  if (error) throw new Error(`fetch pending facts: ${error.message}`);

  const summary: RunSummary = {
    facts_processed: 0,
    auto_approved: 0,
    queued_low: 0,
    queued_medium: 0,
    queued_high: 0,
    errors: [],
  };

  for (const next of (pending ?? []) as JurisdictionalFact[]) {
    try {
      // Skip if already queued
      const { data: existingReview } = await supabase
        .from('review_queue')
        .select('id')
        .eq('new_fact_id', next.id)
        .maybeSingle();
      if (existingReview) continue;

      const { data: prev } = await supabase
        .from('jurisdictional_facts')
        .select('*')
        .eq('country_code', next.country_code)
        .eq('fact_key', next.fact_key)
        .eq('status', 'approved')
        .maybeSingle();

      const diff = diffFacts(prev as JurisdictionalFact | null, next);

      if (diff.change_type === 'unchanged' && prev) {
        await autoApproveUnchanged(supabase, prev as JurisdictionalFact, next);
        summary.auto_approved += 1;
      } else {
        await queueReview(supabase, prev as JurisdictionalFact | null, next, diff);
        if (diff.risk_score === 'low') summary.queued_low += 1;
        else if (diff.risk_score === 'medium') summary.queued_medium += 1;
        else summary.queued_high += 1;
      }

      summary.facts_processed += 1;
    } catch (err) {
      summary.errors.push({ fact_id: next.id, error: (err as Error).message });
    }
  }

  return summary;
}

// ----------------------------------------------------------------------------
// HTTP entrypoint
// ----------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const auth = req.headers.get('authorization');
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedCronSecret = Deno.env.get('CRON_SECRET');
  const expectedAuth = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
  if (auth !== expectedAuth && (!cronSecret || cronSecret !== expectedCronSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const summary = await runAgent();
    return new Response(JSON.stringify({ ok: true, summary }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
