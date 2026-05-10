/**
 * Netlify Function: POST /api/v1/athena/chat
 * Proxies multi-turn ATHENA AI conversations.
 *
 * Provider priority (uses first available):
 * 1. Self-hosted Gemma 4 (vLLM/Ollama) — GEMMA_CLOUD_URL (zero per-token cost)
 * 2. Blackbox AI (free model) — BLACKBOX_API_KEY
 * 3. Gemini (free tier) — GEMINI_API_KEY
 * 4. Anthropic (paid fallback) — ANTHROPIC_API_KEY
 */

import { requireAuth } from './_shared/auth.mjs';
import { handleCors, corsHeaders } from './_shared/cors.mjs';
import { checkRateLimit } from './_shared/rateLimit.mjs';

/** Strip tool-role messages that providers can't handle */
function cleanMessages(messages) {
  return (messages || []).filter(m => m.role !== 'tool');
}

/* ── Self-hosted Gemma 4 (OpenAI-compatible — works with vLLM & Ollama) ─ */
async function callSelfHostedGemma(body, baseUrl, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const resp = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: process.env.GEMMA_CLOUD_MODEL || 'gemma4:26b-a4b',
      messages: [{ role: 'system', content: body.system }, ...cleanMessages(body.messages)],
      max_tokens: body.max_tokens || 1024,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || `Gemma4 API ${resp.status}`);

  const text = data.choices?.[0]?.message?.content || '(no response)';
  return {
    text,
    usage: data.usage || { input_tokens: data.prompt_eval_count || 0, output_tokens: data.eval_count || 0 },
    provider: 'gemma4',
  };
}

/* ── Blackbox AI ──────────────────────────────────────────────────── */
async function callBlackbox(body, apiKey) {
  const resp = await fetch('https://api.blackbox.ai/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.BLACKBOX_API_MODEL || 'blackboxai',
      messages: [{ role: 'system', content: body.system }, ...cleanMessages(body.messages)],
      max_tokens: body.max_tokens || 1024,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || `Blackbox API ${resp.status}`);

  const text = data.choices?.[0]?.message?.content || data.text || data.content?.[0]?.text || '(no response)';
  return { text, usage: data.usage || { input_tokens: 0, output_tokens: 0 }, provider: 'blackbox' };
}

/* ── Gemini (free tier) ───────────────────────────────────────────── */
async function callGemini(body, apiKey) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const contents = cleanMessages(body.messages).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content || '...' }],
  }));

  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: body.system }] },
      generationConfig: { maxOutputTokens: body.max_tokens || 1024 },
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || `Gemini API ${resp.status}`);

  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '(no response)';
  return {
    text,
    usage: { input_tokens: data.usageMetadata?.promptTokenCount || 0, output_tokens: data.usageMetadata?.candidatesTokenCount || 0 },
    provider: 'gemini',
  };
}

/* ── Anthropic (paid fallback) ────────────────────────────────────── */
async function callAnthropic(body, apiKey) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: body.max_tokens || 1024,
      system: body.system,
      messages: cleanMessages(body.messages).map(m => ({ role: m.role, content: m.content || '' })),
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || `Anthropic API ${resp.status}`);

  return { text: data.content?.[0]?.text || '(no response)', usage: data.usage || {}, provider: 'anthropic' };
}

/* ── Handler ──────────────────────────────────────────────────────── */
export default async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(req) });

  const user = await requireAuth(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(req) });

  if (checkRateLimit(user.id, 'athena-chat', 60)) {
    return Response.json({ error: 'Rate limited' }, { status: 429, headers: corsHeaders(req) });
  }

  const gemmaUrl = process.env.GEMMA_CLOUD_URL;
  const gemmaKey = process.env.GEMMA_CLOUD_KEY || '';
  const bbKey = process.env.BLACKBOX_API_KEY;
  const gemKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const anKey = process.env.ANTHROPIC_API_KEY;

  if (!gemmaUrl && !bbKey && !gemKey && !anKey) {
    return Response.json({ detail: 'ATHENA_OFFLINE: No AI provider key set.' }, { status: 503, headers: corsHeaders(req) });
  }

  try {
    const body = await req.json();
    let result;

    // Priority: Gemma 4 (self-hosted) → Blackbox → Gemini → Anthropic
    const providers = [
      gemmaUrl && { name: 'gemma4', fn: () => callSelfHostedGemma(body, gemmaUrl, gemmaKey) },
      bbKey && { name: 'blackbox', fn: () => callBlackbox(body, bbKey) },
      gemKey && { name: 'gemini', fn: () => callGemini(body, gemKey) },
      anKey && { name: 'anthropic', fn: () => callAnthropic(body, anKey) },
    ].filter(Boolean);

    for (const provider of providers) {
      try {
        result = await provider.fn();
        break;
      } catch (err) {
        console.log(`ATHENA_${provider.name.toUpperCase()}_ERROR: ${err.message}`);
        continue;
      }
    }

    if (!result) return Response.json({ detail: 'ATHENA_ERROR: All providers failed.' }, { status: 502, headers: corsHeaders(req) });

    console.log(`ATHENA_USAGE type=chat provider=${result.provider} input=${result.usage.input_tokens || 0} output=${result.usage.output_tokens || 0}`);
    return Response.json({ text: result.text, usage: result.usage, provider: result.provider }, { headers: corsHeaders(req) });
  } catch (e) {
    return Response.json({ detail: `ATHENA_ERROR: ${e.message}` }, { status: 500, headers: corsHeaders(req) });
  }
};

export const config = { path: '/api/v1/athena/chat' };
