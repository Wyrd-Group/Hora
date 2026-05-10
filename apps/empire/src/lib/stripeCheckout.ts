/**
 * Stripe Checkout bridge — client side.
 *
 * This module is the other half of the Stripe flow. The existing [stripe.ts]
 * only loads the publishable key; this one talks to our server to create a
 * Checkout Session and redirects the user to it.
 *
 * Backend contract (to be implemented by the server team or a Supabase Edge
 * Function):
 *
 *   POST {VITE_API_BASE}/api/stripe/create-checkout-session
 *     body: { priceId, quantity, mode: 'payment' | 'subscription', userId }
 *     resp: { sessionId: string, url: string }
 *
 *   POST {VITE_API_BASE}/api/stripe/webhook
 *     Stripe-signed webhook — verifies signature, updates user's tier /
 *     AP balance in Supabase on 'checkout.session.completed'.
 *
 * Until the backend is live, `createCheckoutSession` throws a typed error
 * that the UI layer can show as "Payments coming soon".
 */

import { stripePromise } from './stripe';
import { createLogger } from './logger';

const log = createLogger('stripe');

export class PaymentsUnavailableError extends Error {
  readonly code = 'PAYMENTS_UNAVAILABLE' as const;
  constructor(msg = 'Payments are not yet enabled for this build.') {
    super(msg);
    this.name = 'PaymentsUnavailableError';
  }
}

export type CheckoutRequest = {
  priceId: string;
  quantity?: number;
  mode?: 'payment' | 'subscription';
  userId: string;
  /** Optional metadata forwarded to the webhook for granting the purchase. */
  metadata?: Record<string, string>;
};

export type CheckoutResponse = {
  sessionId: string;
  url: string;
};

function apiBase(): string {
  try {
    return (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
  } catch {
    return '';
  }
}

function publishableKey(): string {
  try {
    return (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ?? '';
  } catch {
    return '';
  }
}

export function paymentsEnabled(): boolean {
  return Boolean(apiBase() && publishableKey());
}

/**
 * Create a checkout session on the server and redirect to Stripe's hosted
 * checkout page. Resolves only on failure — success navigates away.
 */
export async function createCheckoutSession(req: CheckoutRequest): Promise<never> {
  if (!paymentsEnabled()) {
    throw new PaymentsUnavailableError();
  }

  const res = await fetch(`${apiBase()}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quantity: 1,
      mode: 'payment',
      ...req,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    log.error('create-checkout-session failed', { status: res.status, text });
    throw new Error(`Checkout failed: ${res.status}`);
  }

  const data = (await res.json()) as CheckoutResponse;

  // Prefer server-provided URL when available (Stripe recommends this path).
  if (data.url) {
    window.location.assign(data.url);
    // Navigation doesn't resolve this promise; keep TS happy.
    return new Promise<never>(() => {});
  }

  // If the server didn't return a URL we can't redirect — newer stripe-js
  // removed redirectToCheckout(); the server is expected to always return
  // session.url, which Stripe populates on Session creation.
  const stripe = await stripePromise;
  if (!stripe) throw new PaymentsUnavailableError('Stripe.js failed to load.');
  throw new Error('Checkout session response missing redirect URL.');
}
