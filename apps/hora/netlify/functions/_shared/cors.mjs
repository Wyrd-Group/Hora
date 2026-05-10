/**
 * CORS utilities for Netlify Functions.
 * Allows the production domain and local dev server.
 */

const ALLOWED_ORIGINS = [
  'https://aegis-empire.netlify.app',
  'http://localhost:6969',
  'capacitor://localhost',
  'http://localhost',
];

export function corsHeaders(req) {
  const origin = req?.headers?.get?.('origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 * Returns a 204 Response if it's a preflight, otherwise null.
 */
export function handleCors(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  return null;
}
