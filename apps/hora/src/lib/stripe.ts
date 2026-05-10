/**
 * Stripe client-side loader.
 * Lazily loads the Stripe.js SDK using the publishable key from env.
 */

import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
);
