/**
 * Netlify Function: POST /api/v1/delete-account
 * Permanently deletes a user's account and all associated data.
 * Requires valid JWT — user can only delete their own account.
 */

import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './_shared/auth.mjs';
import { handleCors, corsHeaders } from './_shared/cors.mjs';
import { checkRateLimit, getClientIp } from './_shared/rateLimit.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

export default async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(req) });
  }

  const user = await requireAuth(req);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(req) });
  }

  // Tight limit — account deletion is destructive; no legitimate user needs
  // more than ~3 attempts per minute. This also blunts any brute force where
  // an attacker replays a stolen token to wipe accounts.
  if (checkRateLimit(user.id, 'delete-account', 3)
      || checkRateLimit(getClientIp(req), 'delete-account:ip', 10)) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: corsHeaders(req) },
    );
  }

  try {
    // Delete user data from app tables (order: leaf tables first for FK constraints)
    const tables = [
      'ap_transactions',
      'game_states',
      'telemetry_events',
      'player_actions',
      'subscriptions',
      'profiles',
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('user_id', user.id);
      if (error && !error.message.includes('does not exist')) {
        console.warn(`DELETE_ACCOUNT: Failed to clean ${table}:`, error.message);
      }
    }

    // Also try 'id' column for profiles table
    await supabase.from('profiles').delete().eq('id', user.id);

    // Delete the auth user (requires service role)
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
    if (authError) {
      console.error('DELETE_ACCOUNT: Auth deletion failed:', authError.message);
      return Response.json(
        { error: 'Failed to delete authentication account' },
        { status: 500, headers: corsHeaders(req) },
      );
    }

    console.log(`DELETE_ACCOUNT: Successfully deleted user ${user.id}`);
    return Response.json({ ok: true }, { headers: corsHeaders(req) });
  } catch (err) {
    console.error('DELETE_ACCOUNT_ERROR:', err.message);
    return Response.json(
      { error: `Account deletion failed: ${err.message}` },
      { status: 500, headers: corsHeaders(req) },
    );
  }
};

export const config = { path: '/api/v1/delete-account' };
