/**
 * Netlify Function: /api/v1/community-features
 * Community marketplace for player-created game features.
 *
 * GET  — list approved features (with ?category, ?sort, ?limit)
 * POST — publish a feature (requires auth)
 * PATCH — rate or increment installs
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async (req) => {
  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ detail: 'Database not configured' }, { status: 503 });
  }

  // GET — list features
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
    if (error) return Response.json({ detail: error.message }, { status: 500 });

    return Response.json({ features: data || [] });
  }

  // POST — publish a feature
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { name, description, code, tool_def, category } = body;

      if (!name || !code || !tool_def) {
        return Response.json({ detail: 'Missing required fields: name, code, tool_def' }, { status: 400 });
      }

      // Static code validation
      const forbidden = ['fetch(', 'XMLHttpRequest', 'WebSocket', 'document.', 'window.', 'eval(', 'new Function', 'import(', 'require(', 'importScripts'];
      const warnings = forbidden.filter(p => code.includes(p));
      if (warnings.length > 0) {
        return Response.json({ detail: `Code contains blocked patterns: ${warnings.join(', ')}` }, { status: 400 });
      }
      if (code.length > 10240) {
        return Response.json({ detail: `Code too large: ${code.length} chars (max 10KB)` }, { status: 400 });
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

      if (error) return Response.json({ detail: error.message }, { status: 500 });
      return Response.json({ id: data.id, status: 'published' });
    } catch (e) {
      return Response.json({ detail: `PUBLISH_ERROR: ${e.message}` }, { status: 500 });
    }
  }

  // PATCH — rate or record install
  if (req.method === 'PATCH') {
    try {
      const body = await req.json();
      const { id, action, rating } = body;

      if (!id) return Response.json({ detail: 'Missing feature id' }, { status: 400 });

      if (action === 'install') {
        await supabase.rpc('increment_installs', { feature_id: id });
        return Response.json({ ok: true });
      }

      if (action === 'rate' && typeof rating === 'number' && rating >= 1 && rating <= 5) {
        await supabase.rpc('add_rating', { feature_id: id, rating_value: rating });
        return Response.json({ ok: true });
      }

      return Response.json({ detail: 'Invalid action' }, { status: 400 });
    } catch (e) {
      return Response.json({ detail: e.message }, { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/v1/community-features' };
