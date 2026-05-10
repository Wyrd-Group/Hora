/**
 * Netlify Function: POST /api/v1/customer-portal
 * Creates a Stripe Customer Portal session for subscription management.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './_shared/auth.mjs';
import { handleCors, corsHeaders } from './_shared/cors.mjs';
import { checkRateLimit } from './_shared/rateLimit.mjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

const RETURN_URL = process.env.URL
  ? `${process.env.URL}/`
  : 'https://aegis-empire.netlify.app/';

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

  if (checkRateLimit(user.id, 'portal', 10)) {
    return Response.json({ error: 'Rate limited' }, { status: 429, headers: corsHeaders(req) });
  }

  try {
    // Look up the Stripe customer ID from the user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return Response.json(
        { error: 'No active subscription found' },
        { status: 404, headers: corsHeaders(req) },
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: RETURN_URL,
    });

    return Response.json({ url: session.url }, { headers: corsHeaders(req) });
  } catch (err) {
    console.error('STRIPE_PORTAL_ERROR:', err.message);
    return Response.json(
      { error: `Portal failed: ${err.message}` },
      { status: 500, headers: corsHeaders(req) },
    );
  }
};

export const config = { path: '/api/v1/customer-portal' };
