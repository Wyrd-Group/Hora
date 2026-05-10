/**
 * AdMob Configuration — Ad Unit IDs per platform.
 *
 * Production IDs load from Vite env so we don't ship placeholders to prod:
 *   VITE_ADMOB_APP_ID_IOS        / VITE_ADMOB_APP_ID_ANDROID
 *   VITE_ADMOB_IOS_BANNER        / VITE_ADMOB_ANDROID_BANNER
 *   VITE_ADMOB_IOS_INTERSTITIAL  / VITE_ADMOB_ANDROID_INTERSTITIAL
 *   VITE_ADMOB_IOS_REWARDED      / VITE_ADMOB_ANDROID_REWARDED
 *   VITE_ADMOB_IOS_REWARDED_INTERSTITIAL / VITE_ADMOB_ANDROID_REWARDED_INTERSTITIAL
 *
 * Any unset production unit ID falls through to Google's official test IDs so
 * we never request unknown ad units. Test mode can also be forced explicitly
 * via `VITE_ADMOB_TEST_MODE=true` or `window.__ADMOB_TEST_MODE = true`.
 */

// Google's official AdMob test IDs — always safe, will never serve real ads.
const TEST_IDS = {
  appId: 'ca-app-pub-3940256099942544~1458002511',
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  rewardedInterstitial: 'ca-app-pub-3940256099942544/5354046379',
} as const;

function env(key: string): string | undefined {
  try {
    const v = (import.meta.env as Record<string, string | undefined>)?.[key];
    return v && v.trim() && !v.includes('XXXXX') ? v : undefined;
  } catch {
    return undefined;
  }
}

export const ADMOB_APP_ID = {
  ios: env('VITE_ADMOB_APP_ID_IOS') ?? TEST_IDS.appId,
  android: env('VITE_ADMOB_APP_ID_ANDROID') ?? TEST_IDS.appId,
} as const;

export const ADMOB_AD_UNITS = {
  ios: {
    banner: env('VITE_ADMOB_IOS_BANNER') ?? TEST_IDS.banner,
    interstitial: env('VITE_ADMOB_IOS_INTERSTITIAL') ?? TEST_IDS.interstitial,
    rewarded: env('VITE_ADMOB_IOS_REWARDED') ?? TEST_IDS.rewarded,
    rewardedInterstitial:
      env('VITE_ADMOB_IOS_REWARDED_INTERSTITIAL') ?? TEST_IDS.rewardedInterstitial,
  },
  android: {
    banner: env('VITE_ADMOB_ANDROID_BANNER') ?? TEST_IDS.banner,
    interstitial:
      env('VITE_ADMOB_ANDROID_INTERSTITIAL') ?? TEST_IDS.interstitial,
    rewarded: env('VITE_ADMOB_ANDROID_REWARDED') ?? TEST_IDS.rewarded,
    rewardedInterstitial:
      env('VITE_ADMOB_ANDROID_REWARDED_INTERSTITIAL') ??
      TEST_IDS.rewardedInterstitial,
  },
  test: {
    banner: TEST_IDS.banner,
    interstitial: TEST_IDS.interstitial,
    rewarded: TEST_IDS.rewarded,
    rewardedInterstitial: TEST_IDS.rewardedInterstitial,
  },
} as const;

/** Returns true if we should use test ad unit IDs. */
export function isTestMode(): boolean {
  if (typeof window !== 'undefined' && (window as { __ADMOB_TEST_MODE?: boolean }).__ADMOB_TEST_MODE) {
    return true;
  }
  try {
    const mode = (import.meta.env as Record<string, string | undefined>)
      ?.VITE_ADMOB_TEST_MODE;
    if (mode === 'true') return true;
    if (mode === 'false') return false;
  } catch {
    /* fall through */
  }
  // Default: dev/preview → test mode, prod → live (if VITE_ADMOB_* set).
  try {
    return Boolean((import.meta.env as { DEV?: boolean })?.DEV);
  } catch {
    return true;
  }
}

/** Get ad unit IDs for the current platform. */
export function getAdUnitIds(platform: 'ios' | 'android' | 'web') {
  if (isTestMode() || platform === 'web') {
    return ADMOB_AD_UNITS.test;
  }
  return ADMOB_AD_UNITS[platform] ?? ADMOB_AD_UNITS.test;
}
