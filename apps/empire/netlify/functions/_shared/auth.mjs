/**
 * Auth utility for Netlify Functions.
 * Validates Supabase JWT from the Authorization header.
 */

import { createClient } from '@supabase/supabase-js';

let _supabase = null;

function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

/**
 * Extract and validate a Supabase user from the request's Bearer token.
 * Returns the user object on success, or null if invalid/missing.
 */
export async function requireAuth(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Validate a cron/internal secret header for scheduled functions.
 * Returns true if the X-Cron-Secret header matches NETLIFY_CRON_SECRET.
 */
export function requireCronSecret(req) {
  const secret = process.env.NETLIFY_CRON_SECRET;
  if (!secret) return false; // Fail closed — cron secret must be configured
  const header = req?.headers?.get?.('x-cron-secret');
  return header === secret;
}
