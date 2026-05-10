/**
 * Netlify Function: POST /api/v1/validate-feature
 * Static analysis for AI-generated game feature code.
 * Checks for forbidden patterns before community publishing.
 */

import { requireAuth } from './_shared/auth.mjs';
import { handleCors, corsHeaders } from './_shared/cors.mjs';
import { checkRateLimit } from './_shared/rateLimit.mjs';

export default async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(req) });

  const user = await requireAuth(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(req) });

  if (checkRateLimit(user.id, 'validate-feature', 120)) {
    return Response.json({ error: 'Rate limited' }, { status: 429, headers: corsHeaders(req) });
  }

  try {
    const { code } = await req.json();
    if (!code) return Response.json({ safe: false, warnings: ['No code provided'] }, { headers: corsHeaders(req) });

    const warnings = [];

    // Forbidden patterns
    const forbidden = [
      { pattern: /\bfetch\s*\(/, label: 'Network access (fetch)' },
      { pattern: /\bXMLHttpRequest\b/, label: 'Network access (XMLHttpRequest)' },
      { pattern: /\bWebSocket\b/, label: 'Network access (WebSocket)' },
      { pattern: /\bdocument\b/, label: 'DOM access (document)' },
      { pattern: /\bwindow\b/, label: 'DOM access (window)' },
      { pattern: /\blocalStorage\b/, label: 'Storage access (localStorage)' },
      { pattern: /\beval\s*\(/, label: 'Code injection (eval)' },
      { pattern: /\bnew\s+Function\b/, label: 'Code injection (Function constructor)' },
      { pattern: /\bimport\s*\(/, label: 'Dynamic import' },
      { pattern: /\brequire\s*\(/, label: 'CommonJS require' },
      { pattern: /\bimportScripts\b/, label: 'Worker importScripts' },
      { pattern: /\bprocess\b/, label: 'Node.js process access' },
      { pattern: /\b__proto__\b/, label: 'Prototype pollution' },
      { pattern: /\bconstructor\s*\[/, label: 'Constructor access' },
    ];

    for (const { pattern, label } of forbidden) {
      if (pattern.test(code)) warnings.push(`Blocked: ${label}`);
    }

    // Size check
    if (code.length > 10240) {
      warnings.push(`Code too large: ${code.length} chars (max 10,240)`);
    }

    // Suspicious patterns (warn but don't block)
    if (/while\s*\(\s*true\s*\)/.test(code)) warnings.push('Warning: Possible infinite loop (while true)');
    if (/for\s*\(\s*;\s*;\s*\)/.test(code)) warnings.push('Warning: Possible infinite loop (for ;;)');

    return Response.json({
      safe: warnings.length === 0,
      warnings,
    }, { headers: corsHeaders(req) });
  } catch (e) {
    return Response.json({ safe: false, warnings: [`Parse error: ${e.message}`] }, { status: 400, headers: corsHeaders(req) });
  }
};

export const config = { path: '/api/v1/validate-feature' };
