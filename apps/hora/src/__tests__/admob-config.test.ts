import { describe, it, expect } from 'vitest';
import { ADMOB_APP_ID, ADMOB_AD_UNITS, getAdUnitIds, isTestMode } from '../data/admobConfig';

// Google's documented test-ID prefix — presence of this string means we are
// NOT about to serve live ads from an unregistered placeholder.
const TEST_PREFIX = 'ca-app-pub-3940256099942544';
const PLACEHOLDER = 'XXXXX';

describe('admobConfig — no unregistered placeholder IDs', () => {
  it('iOS app ID never contains XXXXX placeholder', () => {
    expect(ADMOB_APP_ID.ios).not.toContain(PLACEHOLDER);
  });

  it('Android app ID never contains XXXXX placeholder', () => {
    expect(ADMOB_APP_ID.android).not.toContain(PLACEHOLDER);
  });

  it('no ad unit contains the XXXXX placeholder', () => {
    const flatten = (o: Record<string, string>) => Object.values(o);
    const all = [
      ...flatten(ADMOB_AD_UNITS.ios as unknown as Record<string, string>),
      ...flatten(ADMOB_AD_UNITS.android as unknown as Record<string, string>),
      ...flatten(ADMOB_AD_UNITS.test as unknown as Record<string, string>),
    ];
    for (const id of all) {
      expect(id).not.toContain(PLACEHOLDER);
    }
  });

  it('test IDs are Google official test unit IDs', () => {
    expect(ADMOB_AD_UNITS.test.banner).toContain(TEST_PREFIX);
    expect(ADMOB_AD_UNITS.test.interstitial).toContain(TEST_PREFIX);
    expect(ADMOB_AD_UNITS.test.rewarded).toContain(TEST_PREFIX);
    expect(ADMOB_AD_UNITS.test.rewardedInterstitial).toContain(TEST_PREFIX);
  });
});

describe('isTestMode', () => {
  it('is truthy in dev (no env overrides)', () => {
    // Vitest sets import.meta.env.DEV=true; absent any override, test mode is on.
    expect(isTestMode()).toBe(true);
  });
});

describe('getAdUnitIds', () => {
  it('always returns test IDs on web platform', () => {
    const web = getAdUnitIds('web');
    expect(web.banner).toContain(TEST_PREFIX);
  });

  it('test mode returns test IDs regardless of platform', () => {
    // Already in test mode under vitest.
    expect(getAdUnitIds('ios').banner).toContain(TEST_PREFIX);
    expect(getAdUnitIds('android').banner).toContain(TEST_PREFIX);
  });
});
