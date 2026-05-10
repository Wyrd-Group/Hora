/**
 * Netlify Function: /api/v1/community-features
 * Community marketplace for player-created game features.
 *
 * GET  — list approved features (with ?category, ?sort, ?limit)
 * POST — publish a feature (requires auth)
 * PATCH — rate or increment installs
 */

import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './_shared/auth.mjs';
import { handleCors, corsHeaders } from './_shared/cors.mjs';
import { checkRateLimit } from './_shared/rateLimit.mjs';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ detail: 'Database not configured' }, { status: 503, headers: corsHeaders(req) });
  }

  // GET — list features (unauthenticated, but with CORS)
  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const category = url.searchParams.get('category');
    const sort = url.searchParams.get('sort') || 'popular';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    let query = supabase
      .from('community_features')
      .select('id, name, description, category, installs, rating_sum, rating_count, author_name, created_at')
      .eq('status', 'approved')
      .limit(limit);

    if (category) query = query.eq('category', category);

    if (sort === 'popular') query = query.order('installs', { ascending: false });
    else if (sort === 'recent') query = query.order('created_at', { ascending: false });
    else if (sort === 'rating') query = query.order('rating_sum', { ascending: false });

    const { data, error } = await query;
    if (error) return Response.json({ detail: error.message }, { status: 500, headers: corsHeaders(req) });

    return Response.json({ features: data || [] }, { headers: corsHeaders(req) });
  }

  // POST — publish a feature (requires auth)
  if (req.method === 'POST') {
    const user = await requireAuth(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(req) });

    if (checkRateLimit(user.id, 'community-features', 120)) {
      return Response.json({ error: 'Rate limited' }, { status: 429, headers: corsHeaders(req) });
    }

    try {
      const body = await req.json();
      const { name, description, code, tool_def, category } = body;

      if (!name || !code || !tool_def) {
        return Response.json({ detail: 'Missing required fields: name, code, tool_def' }, { status: 400, headers: corsHeaders(req) });
      }

      // Static code validation
      const forbidden = ['fetch(', 'XMLHttpRequest', 'WebSocket', 'document.', 'window.', 'eval(', 'new Function', 'import(', 'require(', 'importScripts'];
      const warnings = forbidden.filter(p => code.includes(p));
      if (warnings.length > 0) {
        return Response.json({ detail: `Code contains blocked patterns: ${warnings.join(', ')}` }, { status: 400, headers: corsHeaders(req) });
      }
      if (code.length > 10240) {
        return Response.json({ detail: `Code too large: ${code.length} chars (max 10KB)` }, { status: 400, headers: corsHeaders(req) });
      }

      const { data, error } = await supabase
        .from('community_features')
        .insert({
          name,
          description: description || '',
          code,
          tool_def,
          category: category || 'system',
          status: 'approved', // Auto-approve for now — sandbox is the safety layer
          author_name: body.author_name || 'Anonymous',
          author_id: body.author_id || null,
        })
        .select('id')
        .single();

      if (error) return Response.json({ detail: error.message }, { status: 500, headers: corsHeaders(req) });
      return Response.json({ id: data.id, status: 'published' }, { headers: corsHeaders(req) });
    } catch (e) {
      return Response.json({ detail: `PUBLISH_ERROR: ${e.message}` }, { status: 500, headers: corsHeaders(req) });
    }
  }

  // PATCH — rate or record install
  if (req.method === 'PATCH') {
    const user = await requireAuth(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(req) });

    if (checkRateLimit(user.id, 'community-features', 120)) {
      return Response.json({ error: 'Rate limited' }, { status: 429, headers: corsHeaders(req) });
    }

    try {
      const body = await req.json();
      const { id, action, rating } = body;

      if (!id) return Response.json({ detail: 'Missing feature id' }, { status: 400, headers: corsHeaders(req) });

      if (action === 'install') {
        await supabase.rpc('increment_installs', { feature_id: id });
        return Response.json({ ok: true }, { headers: corsHeaders(req) });
      }

      if (action === 'rate' && typeof rating === 'number' && rating >= 1 && rating <= 5) {
        await supabase.rpc('add_rating', { feature_id: id, rating_value: rating });
        return Response.json({ ok: true }, { headers: corsHeaders(req) });
      }

      return Response.json({ detail: 'Invalid action' }, { status: 400, headers: corsHeaders(req) });
    } catch (e) {
      return Response.json({ detail: e.message }, { status: 500, headers: corsHeaders(req) });
    }
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(req) });
};

export const config = { path: '/api/v1/community-features' };
