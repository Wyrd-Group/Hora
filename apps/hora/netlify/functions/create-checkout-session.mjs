/**
 * Netlify Function: POST /api/v1/create-checkout-session
 * Creates a Stripe Checkout session for AP bundles or subscriptions.
 *
 * Body: { priceId: string, mode: 'payment' | 'subscription', bundleId?: string }
 */

import Stripe from 'stripe';
import { requireAuth } from './_shared/auth.mjs';
import { handleCors, corsHeaders } from './_shared/cors.mjs';
import { checkRateLimit } from './_shared/rateLimit.mjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const SUCCESS_URL = process.env.URL
  ? `${process.env.URL}/?payment=success`
  : 'https://aegis-empire.netlify.app/?payment=success';

const CANCEL_URL = process.env.URL
  ? `${process.env.URL}/?payment=cancelled`
  : 'https://aegis-empire.netlify.app/?payment=cancelled';

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

  if (checkRateLimit(user.id, 'checkout', 10)) {
    return Response.json({ error: 'Rate limited' }, { status: 429, headers: corsHeaders(req) });
  }

  try {
    const { priceId, mode, bundleId } = await req.json();

    if (!priceId || !mode) {
      return Response.json(
        { error: 'Missing priceId or mode' },
        { status: 400, headers: corsHeaders(req) },
      );
    }

    if (!['payment', 'subscription'].includes(mode)) {
      return Response.json(
        { error: 'mode must be "payment" or "subscription"' },
        { status: 400, headers: corsHeaders(req) },
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      metadata: {
        supabase_user_id: user.id,
        bundle_id: bundleId || '',
        mode,
      },
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
    });

    return Response.json({ url: session.url }, { headers: corsHeaders(req) });
  } catch (err) {
    console.error('STRIPE_CHECKOUT_ERROR:', err.message);
    return Response.json(
      { error: `Checkout failed: ${err.message}` },
      { status: 500, headers: corsHeaders(req) },
    );
  }
};

export const config = { path: '/api/v1/create-checkout-session' };
