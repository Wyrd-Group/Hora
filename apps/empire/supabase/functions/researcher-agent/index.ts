// ============================================================================
// Researcher Agent (Supabase Edge Function)
// ============================================================================
// Invoked weekly via pg_cron OR manually via HTTP POST.
//
// For each active regulatory_sources row:
//   1. Fetch the source URL (HTML)
//   2. Strip boilerplate, keep main content
//   3. Ask Claude to extract structured facts for the (country, topic) pair
//   4. Insert extracted facts into jurisdictional_facts with status='pending_review'
//   5. Log success/failure to fact_change_log
//
// Does NOT touch approved content directly — that's the Updater Agent's job.
// ============================================================================

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callClaude, parseClaudeJson } from '../_shared/claude.ts';
import type {
  RegulatorySource,
  ExtractedFact,
  ExtractionResult,
} from '../_shared/types.ts';

const AGENT_VERSION = 'researcher-v1';
const EXTRACTOR_MODEL = 'claude-haiku-4-5';
const MAX_HTML_CHARS = 40_000;   // Claude input budget per source
const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = 'AegisEmpireRegulatoryResearcher/1.0 (+https://aegis-empire.example)';

// ----------------------------------------------------------------------------
// Fetch + clean HTML
// ----------------------------------------------------------------------------

async function fetchSource(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function stripToTextContent(html: string): string {
  // Lightweight HTML to text: remove scripts/styles/nav/headers, collapse whitespace.
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.slice(0, MAX_HTML_CHARS);
}

// ----------------------------------------------------------------------------
// Claude extraction
// ----------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a regulatory fact extractor for a financial education curriculum.
Your job: read official government or regulator web pages and extract structured facts (tax brackets, contribution limits, thresholds, rates) for a specific (country, topic).

Strict rules:
1. Only extract facts that are EXPLICITLY stated in the provided text. Never infer, guess, or use prior knowledge.
2. Preserve the source's own numbers verbatim. Do not round, convert, or translate currencies.
3. For each fact, include a verbatim excerpt from the source (max 500 characters) proving where you got it.
4. Assign confidence 0.0–1.0:
   - 0.9–1.0: value is unambiguously stated with the exact fact_key you're extracting
   - 0.6–0.9: value is stated but requires minor interpretation (e.g., "basic rate" matches "basic_rate")
   - 0.3–0.6: value appears but context is ambiguous; flag for human review
   - <0.3: don't include the fact at all
5. Return ONLY valid JSON. No prose, no markdown fences.

Output schema:
{
  "facts": [
    {
      "fact_key": "snake_case_identifier",
      "value": { "amount": 20000, "currency": "GBP", "unit": "annual", "effective_from": "2025-04-06" },
      "display_value": "£20,000 per year",
      "confidence": 0.95,
      "source_excerpt": "verbatim quote from source page",
      "effective_from": "2025-04-06"
    }
  ]
}`;

function buildUserPrompt(source: RegulatorySource, text: string): string {
  return `Country: ${source.country_code}
Topic: ${source.topic}
Authority: ${source.source_authority ?? 'unknown'}
URL: ${source.source_url}
Extractor notes: ${source.notes ?? 'none'}

Source page content (cleaned HTML):
---
${text}
---

Extract all relevant facts for topic "${source.topic}" in country "${source.country_code}".
Use canonical snake_case fact_keys (e.g., isa_annual_allowance, basic_rate_threshold, higher_rate_threshold, additional_rate_threshold, standard_vat_rate, reduced_vat_rate).
Return JSON only.`;
}

async function extractFacts(
  source: RegulatorySource,
  apiKey: string,
): Promise<ExtractedFact[]> {
  const html = await fetchSource(source.source_url);
  const text = stripToTextContent(html);
  if (text.length < 200) {
    throw new Error(`source returned too little content (${text.length} chars)`);
  }

  const claudeRes = await callClaude({
    apiKey,
    model: EXTRACTOR_MODEL,
    maxTokens: 2048,
    temperature: 0,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(source, text),
  });

  const parsed = parseClaudeJson<{ facts: ExtractedFact[] }>(claudeRes.content);
  if (!Array.isArray(parsed.facts)) {
    throw new Error('Claude response missing facts[] array');
  }
  return parsed.facts.filter((f) => f.confidence >= 0.3);
}

// ----------------------------------------------------------------------------
// Persistence
// ----------------------------------------------------------------------------

async function persistFacts(
  supabase: SupabaseClient,
  source: RegulatorySource,
  facts: ExtractedFact[],
): Promise<number> {
  if (facts.length === 0) return 0;
  const rows = facts.map((f) => ({
    country_code: source.country_code,
    topic: source.topic,
    fact_key: f.fact_key,
    value: f.value,
    display_value: f.display_value,
    source_id: source.id,
    source_url: source.source_url,
    source_excerpt: f.source_excerpt?.slice(0, 500) ?? null,
    confidence: Math.min(1, Math.max(0, f.confidence)),
    status: 'pending_review',
    effective_from: f.effective_from ?? null,
  }));
  const { error } = await supabase.from('jurisdictional_facts').insert(rows);
  if (error) throw new Error(`insert facts failed: ${error.message}`);
  return rows.length;
}

async function updateSourceMetadata(
  supabase: SupabaseClient,
  sourceId: string,
  success: boolean,
): Promise<void> {
  const patch = success
    ? { last_fetched_at: new Date().toISOString(), last_success_at: new Date().toISOString(), fetch_failures_in_row: 0 }
    : { last_fetched_at: new Date().toISOString() };
  await supabase.from('regulatory_sources').update(patch).eq('id', sourceId);
  if (!success) {
    await supabase.rpc('increment_source_failures', { p_source_id: sourceId }).then(() => {}).catch(() => {
      // RPC optional; fall back to direct update
      supabase.from('regulatory_sources')
        .select('fetch_failures_in_row')
        .eq('id', sourceId)
        .single()
        .then(({ data }) => {
          if (data) {
            supabase.from('regulatory_sources')
              .update({ fetch_failures_in_row: (data.fetch_failures_in_row ?? 0) + 1 })
              .eq('id', sourceId);
          }
        });
    });
  }
}

async function logEvent(
  supabase: SupabaseClient,
  action: string,
  source: RegulatorySource,
  details: Record<string, unknown>,
): Promise<void> {
  await supabase.from('fact_change_log').insert({
    action,
    actor_type: 'researcher_agent',
    actor_id: AGENT_VERSION,
    country_code: source.country_code,
    fact_key: null,
    details: { ...details, source_url: source.source_url, topic: source.topic },
  });
}

// ----------------------------------------------------------------------------
// Orchestration
// ----------------------------------------------------------------------------

interface RunSummary {
  sources_attempted: number;
  sources_succeeded: number;
  sources_failed: number;
  facts_extracted: number;
  errors: Array<{ source_url: string; error: string }>;
}

async function processSource(
  supabase: SupabaseClient,
  source: RegulatorySource,
  apiKey: string,
  summary: RunSummary,
): Promise<ExtractionResult> {
  try {
    const facts = await extractFacts(source, apiKey);
    const inserted = await persistFacts(supabase, source, facts);
    await updateSourceMetadata(supabase, source.id, true);
    await logEvent(supabase, 'source_fetched', source, {
      facts_extracted: inserted,
      facts_extracted_keys: facts.map((f) => f.fact_key),
    });
    summary.sources_succeeded += 1;
    summary.facts_extracted += inserted;
    return {
      country_code: source.country_code,
      topic: source.topic,
      source_url: source.source_url,
      source_id: source.id,
      extracted_at: new Date().toISOString(),
      facts,
    };
  } catch (err) {
    const message = (err as Error).message;
    await updateSourceMetadata(supabase, source.id, false);
    await logEvent(supabase, 'source_fetch_failed', source, { error: message });
    summary.sources_failed += 1;
    summary.errors.push({ source_url: source.source_url, error: message });
    return {
      country_code: source.country_code,
      topic: source.topic,
      source_url: source.source_url,
      source_id: source.id,
      extracted_at: new Date().toISOString(),
      facts: [],
      extraction_error: message,
    };
  }
}

async function runAgent(filter: { country?: string; topic?: string } = {}): Promise<RunSummary> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');

  let query = supabase
    .from('regulatory_sources')
    .select('*')
    .eq('active', true)
    .order('last_fetched_at', { ascending: true, nullsFirst: true });

  if (filter.country) query = query.eq('country_code', filter.country);
  if (filter.topic) query = query.eq('topic', filter.topic);

  const { data: sources, error } = await query;
  if (error) throw new Error(`fetch sources failed: ${error.message}`);

  const summary: RunSummary = {
    sources_attempted: sources?.length ?? 0,
    sources_succeeded: 0,
    sources_failed: 0,
    facts_extracted: 0,
    errors: [],
  };

  // Sequential processing — respects rate limits and keeps logs readable.
  for (const source of sources ?? []) {
    await processSource(supabase, source as RegulatorySource, anthropicKey, summary);
    // Gentle pacing: 1 second between sources to avoid hammering any single origin.
    await new Promise((r) => setTimeout(r, 1000));
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

  // Authorize: require a valid Bearer token that matches the service role,
  // OR a cron-specific header set by pg_cron invocation.
  const auth = req.headers.get('authorization');
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedCronSecret = Deno.env.get('CRON_SECRET');
  const expectedAuth = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
  if (auth !== expectedAuth && (!cronSecret || cronSecret !== expectedCronSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  let filter: { country?: string; topic?: string } = {};
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (body?.country) filter.country = String(body.country).toUpperCase();
      if (body?.topic) filter.topic = String(body.topic);
    } catch {
      // No body is fine; run full sweep.
    }
  }

  try {
    const summary = await runAgent(filter);
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
