/**
 * Netlify Function: POST /api/v1/stripe-webhook
 * Handles Stripe webhook events for payment fulfillment.
 *
 * Events handled:
 * - checkout.session.completed → credit AP or activate subscription
 * - customer.subscription.updated → update tier
 * - customer.subscription.deleted → downgrade to free
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Lazily checked at request time — see early return in handler
const stripe = stripeKey ? new Stripe(stripeKey) : null;
const supabase = (supabaseUrl && serviceRoleKey)
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

// AP bundle definitions (must match agentCards.ts AP_BUNDLES)
const AP_BUNDLE_MAP = {
  'ap-100':   100,
  'ap-500':   550,
  'ap-1200':  1320,
  'ap-2500':  2875,
  'ap-5000':  6000,
  'ap-10000': 13000,
};

// Subscription tier mapping (Stripe Price ID → tier number)
// Replace these with real Stripe Price IDs from your dashboard
const TIER_PRICE_MAP = {
  'price_operative': 1,
  'price_sentinel': 2,
  'price_director': 3,
};

async function handleCheckoutCompleted(session) {
  const userId = session.metadata?.supabase_user_id;
  if (!userId) {
    console.error('STRIPE_WEBHOOK: No supabase_user_id in metadata');
    return;
  }

  const mode = session.metadata?.mode || session.mode;

  if (mode === 'payment') {
    // One-time AP purchase
    const bundleId = session.metadata?.bundle_id;
    if (!bundleId || !AP_BUNDLE_MAP[bundleId]) {
      console.error(`STRIPE_WEBHOOK: Unknown or missing bundle_id: ${bundleId}`);
      return;
    }
    const apAmount = AP_BUNDLE_MAP[bundleId];
    if (apAmount > 0) {
      const { error } = await supabase.rpc('credit_aegis_points', {
        p_user_id: userId,
        p_amount: apAmount,
      });
      if (error) {
        console.error('STRIPE_WEBHOOK: Failed to credit AP:', error.message);
        // Fallback: write to a transactions table for manual reconciliation
        await supabase.from('ap_transactions').insert({
          user_id: userId,
          bundle_id: bundleId,
          amount: apAmount,
          stripe_session_id: session.id,
          status: 'pending_credit',
        });
      }
      console.log(`STRIPE_WEBHOOK: Credited ${apAmount} AP to user ${userId}`);
    }
  } else if (mode === 'subscription') {
    // Subscription activation
    const priceId = session.metadata?.price_id || '';
    const tier = TIER_PRICE_MAP[priceId] || 1;
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_tier: tier, stripe_customer_id: session.customer })
      .eq('id', userId);
    if (error) {
      console.error('STRIPE_WEBHOOK: Failed to update tier:', error.message);
    }
    console.log(`STRIPE_WEBHOOK: User ${userId} activated tier ${tier}`);
  }
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;
  // Look up user by stripe_customer_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('STRIPE_WEBHOOK: No profile for customer', customerId);
    return;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id || '';
  const tier = TIER_PRICE_MAP[priceId] || 0;
  await supabase
    .from('profiles')
    .update({ subscription_tier: tier })
    .eq('id', profile.id);
  console.log(`STRIPE_WEBHOOK: User ${profile.id} updated to tier ${tier}`);
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  await supabase
    .from('profiles')
    .update({ subscription_tier: 0 })
    .eq('id', profile.id);
  console.log(`STRIPE_WEBHOOK: User ${profile.id} downgraded to free`);
}

export default async (req) => {
  if (!stripe || !supabase || !webhookSecret) {
    console.error('STRIPE_WEBHOOK: Missing required env vars (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY)');
    return new Response('Server misconfigured', { status: 500 });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'Missing signature' }, { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        console.log(`STRIPE_WEBHOOK: Unhandled event type ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error('STRIPE_WEBHOOK_ERROR:', err.message);
    return Response.json({ error: err.message }, { status: 400 });
  }
};

export const config = { path: '/api/v1/stripe-webhook' };
