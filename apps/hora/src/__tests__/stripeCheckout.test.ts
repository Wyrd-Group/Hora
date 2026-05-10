import { describe, it, expect } from 'vitest';
import { paymentsEnabled, PaymentsUnavailableError, createCheckoutSession } from '../lib/stripeCheckout';

describe('paymentsEnabled', () => {
  it('returns false when VITE_STRIPE_PUBLISHABLE_KEY or VITE_API_BASE is missing', () => {
    // In the test env these are typically not set → falsey.
    expect(paymentsEnabled()).toBe(false);
  });
});

describe('createCheckoutSession', () => {
  it('throws PaymentsUnavailableError when payments are not wired', async () => {
    await expect(
      createCheckoutSession({
        priceId: 'price_abc',
        userId: 'user_1',
      }),
    ).rejects.toBeInstanceOf(PaymentsUnavailableError);
  });
});

describe('PaymentsUnavailableError', () => {
  it('has a stable code for UI callers to branch on', () => {
    const e = new PaymentsUnavailableError();
    expect(e.code).toBe('PAYMENTS_UNAVAILABLE');
    expect(e).toBeInstanceOf(Error);
  });
});
