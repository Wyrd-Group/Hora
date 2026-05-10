/**
 * Netlify Function: POST /api/v1/athena/brief
 * Generates one-shot empire SITREP briefs.
 *
 * Provider priority: Gemma 4 (self-hosted) → Blackbox → Gemini → Anthropic
 */

import { requireAuth } from './_shared/auth.mjs';
import { handleCors, corsHeaders } from './_shared/cors.mjs';
import { checkRateLimit } from './_shared/rateLimit.mjs';

/* ── Self-hosted Gemma 4 ── */
async function callSelfHostedGemma(system, prompt, baseUrl, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const resp = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: process.env.GEMMA_CLOUD_MODEL || 'gemma4:26b-a4b',
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      max_tokens: 600,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || `Gemma4 ${resp.status}`);
  return {
    text: data.choices?.[0]?.message?.content || '(no response)',
    usage: data.usage || { input_tokens: data.prompt_eval_count || 0, output_tokens: data.eval_count || 0 },
    provider: 'gemma4',
  };
}

async function callBlackbox(system, prompt, apiKey) {
  const resp = await fetch('https://api.blackbox.ai/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.BLACKBOX_API_MODEL || 'blackboxai',
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      max_tokens: 600,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || `Blackbox ${resp.status}`);
  return { text: data.choices?.[0]?.message?.content || data.text || '(no response)', usage: data.usage || {}, provider: 'blackbox' };
}

async function callGemini(system, prompt, apiKey) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { maxOutputTokens: 600 },
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || `Gemini ${resp.status}`);
  return {
    text: data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '(no response)',
    usage: { input_tokens: data.usageMetadata?.promptTokenCount || 0, output_tokens: data.usageMetadata?.candidatesTokenCount || 0 },
    provider: 'gemini',
  };
}

async function callAnthropic(system, prompt, apiKey) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 600, system, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || `Anthropic ${resp.status}`);
  return { text: data.content?.[0]?.text || '(no response)', usage: data.usage || {}, provider: 'anthropic' };
}

export default async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(req) });

  const user = await requireAuth(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(req) });

  if (checkRateLimit(user.id, 'athena-brief', 60)) {
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

    const providers = [
      gemmaUrl && { name: 'gemma4', fn: () => callSelfHostedGemma(body.system, body.prompt, gemmaUrl, gemmaKey) },
      bbKey && { name: 'blackbox', fn: () => callBlackbox(body.system, body.prompt, bbKey) },
      gemKey && { name: 'gemini', fn: () => callGemini(body.system, body.prompt, gemKey) },
      anKey && { name: 'anthropic', fn: () => callAnthropic(body.system, body.prompt, anKey) },
    ].filter(Boolean);

    for (const provider of providers) {
      try { result = await provider.fn(); break; } catch (err) {
        console.log(`ATHENA_BRIEF_${provider.name.toUpperCase()}_ERROR: ${err.message}`);
      }
    }

    if (!result) return Response.json({ detail: 'All providers failed.' }, { status: 502, headers: corsHeaders(req) });

    console.log(`ATHENA_USAGE type=brief provider=${result.provider} input=${result.usage.input_tokens || 0} output=${result.usage.output_tokens || 0}`);
    return Response.json({ text: result.text, usage: result.usage, provider: result.provider }, { headers: corsHeaders(req) });
  } catch (e) {
    return Response.json({ detail: `BRIEF_ERROR: ${e.message}` }, { status: 500, headers: corsHeaders(req) });
  }
};

export const config = { path: '/api/v1/athena/brief' };
