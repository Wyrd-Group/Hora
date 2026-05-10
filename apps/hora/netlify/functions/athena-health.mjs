/**
 * Netlify Function: GET /api/v1/athena/health
 * Health check endpoint — reports Athena provider status.
 *
 * Returns which providers are configured and pings self-hosted Gemma 4
 * to report latency and model info.
 */

import { handleCors, corsHeaders } from './_shared/cors.mjs';
import { checkRateLimit, getClientIp } from './_shared/rateLimit.mjs';

export default async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (checkRateLimit(getClientIp(req), 'athena-health', 30)) {
    return Response.json({ error: 'Rate limited' }, { status: 429, headers: corsHeaders(req) });
  }

  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const gemmaUrl = process.env.GEMMA_CLOUD_URL;
  const gemmaKey = process.env.GEMMA_CLOUD_KEY || '';
  const bbKey = process.env.BLACKBOX_API_KEY;
  const gemKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const anKey = process.env.ANTHROPIC_API_KEY;

  const status = {
    providers: {
      gemma4: { configured: !!gemmaUrl, status: 'unknown', latencyMs: null, model: null },
      blackbox: { configured: !!bbKey, status: bbKey ? 'ready' : 'not_configured' },
      gemini: { configured: !!gemKey, status: gemKey ? 'ready' : 'not_configured' },
      anthropic: { configured: !!anKey, status: anKey ? 'ready' : 'not_configured' },
    },
    primaryProvider: gemmaUrl ? 'gemma4' : bbKey ? 'blackbox' : gemKey ? 'gemini' : anKey ? 'anthropic' : 'none',
    timestamp: new Date().toISOString(),
  };

  // Ping self-hosted Gemma 4 if configured
  if (gemmaUrl) {
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const headers = { 'Content-Type': 'application/json' };
      if (gemmaKey) headers['Authorization'] = `Bearer ${gemmaKey}`;

      const resp = await fetch(`${gemmaUrl.replace(/\/$/, '')}/v1/models`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const latency = Date.now() - start;
      status.providers.gemma4.latencyMs = latency;

      if (resp.ok) {
        const data = await resp.json();
        const models = data.data || data.models || [];
        const modelName = models[0]?.id || models[0]?.name || 'unknown';
        status.providers.gemma4.status = 'online';
        status.providers.gemma4.model = modelName;
      } else {
        status.providers.gemma4.status = 'error';
      }
    } catch (err) {
      status.providers.gemma4.status = err.name === 'AbortError' ? 'timeout' : 'unreachable';
    }
  } else {
    status.providers.gemma4.status = 'not_configured';
  }

  return Response.json(status, { headers: corsHeaders(req) });
};

export const config = { path: '/api/v1/athena/health' };
