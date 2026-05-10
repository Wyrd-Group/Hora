/**
 * AdMob Bridge — Wraps @capacitor-community/admob with platform detection.
 *
 * On web: all calls gracefully no-op (same pattern as native.ts).
 * On native (iOS/Android): calls the real AdMob SDK via the Capacitor plugin.
 *
 * This is the single integration point for all ad network calls.
 * The rest of the app interacts with ads through the adStore, which
 * delegates to this bridge when running on native platforms.
 */

import { Capacitor } from '@capacitor/core';
import { getAdUnitIds } from '../data/admobConfig';
import { createLogger } from './logger';

const log = createLogger('admob');

// ── Platform Detection ──────────────────────────────────────────────
export const isNativeAds = Capacitor.isNativePlatform();

const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
const adUnits = getAdUnitIds(platform);

// ── Dynamic Import ──────────────────────────────────────────────────
// Only import the AdMob plugin on native platforms to avoid web bundle errors.
let AdMob: any = null;
let BannerAdSize: any = null;
let BannerAdPosition: any = null;

// Use string concatenation to bypass Vite's static import analysis.
// On web, isNativeAds is false so this import is never reached.
// On native builds, the plugin resolves normally at runtime.
const ADMOB_PKG = '@capacitor-community' + '/admob';

async function getAdMobPlugin() {
  if (!isNativeAds) return null;
  if (AdMob) return AdMob;

  try {
    const mod = await import(/* @vite-ignore */ ADMOB_PKG);
    AdMob = mod.AdMob;
    BannerAdSize = mod.BannerAdSize;
    BannerAdPosition = mod.BannerAdPosition;
    return AdMob;
  } catch (err) {
    log.warn('Plugin not available', err);
    return null;
  }
}

// ── Initialization ──────────────────────────────────────────────────

let initialized = false;

/**
 * Initialize the AdMob SDK. Must be called once at app startup.
 * Handles ATT (iOS) and GDPR consent automatically.
 */
export async function initAdMob(): Promise<void> {
  if (!isNativeAds || initialized) return;

  const plugin = await getAdMobPlugin();
  if (!plugin) return;

  try {
    await plugin.initialize({
      initializeForTesting: getAdUnitIds(platform) === getAdUnitIds('web'),
    });

    // iOS: Request App Tracking Transparency authorization
    if (platform === 'ios') {
      try {
        await plugin.requestTrackingAuthorization();
      } catch (attErr) {
        log.warn('ATT request failed (non-fatal)', attErr);
      }
    }

    // GDPR: Request consent info for EU users
    try {
      await plugin.requestConsentInfo();
    } catch (consentErr) {
      log.warn('Consent request failed (non-fatal)', consentErr);
    }

    initialized = true;
    // AdMob initialized successfully
  } catch (err) {
    log.error('Initialization failed', err);
  }
}

// ── Banner Ads ──────────────────────────────────────────────────────

export async function showBanner(): Promise<void> {
  if (!isNativeAds) return;
  const plugin = await getAdMobPlugin();
  if (!plugin) return;

  try {
    await plugin.showBanner({
      adId: adUnits.banner,
      adSize: BannerAdSize?.BANNER,
      position: BannerAdPosition?.BOTTOM_CENTER,
      margin: 0,
      isTesting: getAdUnitIds(platform) === getAdUnitIds('web'),
    });
  } catch (err) {
    log.error('showBanner failed', err);
  }
}

export async function hideBanner(): Promise<void> {
  if (!isNativeAds) return;
  const plugin = await getAdMobPlugin();
  if (!plugin) return;

  try {
    await plugin.hideBanner();
  } catch (err) {
    log.error('hideBanner failed', err);
  }
}

export async function removeBanner(): Promise<void> {
  if (!isNativeAds) return;
  const plugin = await getAdMobPlugin();
  if (!plugin) return;

  try {
    await plugin.removeBanner();
  } catch (err) {
    log.error('removeBanner failed', err);
  }
}

// ── Interstitial Ads ────────────────────────────────────────────────

let interstitialLoaded = false;

export async function loadInterstitial(): Promise<void> {
  if (!isNativeAds) return;
  const plugin = await getAdMobPlugin();
  if (!plugin) return;

  try {
    await plugin.prepareInterstitial({
      adId: adUnits.interstitial,
      isTesting: getAdUnitIds(platform) === getAdUnitIds('web'),
    });
    interstitialLoaded = true;
  } catch (err) {
    log.error('loadInterstitial failed', err);
    interstitialLoaded = false;
  }
}

export async function showInterstitial(): Promise<boolean> {
  if (!isNativeAds) return false;
  const plugin = await getAdMobPlugin();
  if (!plugin) return false;

  try {
    if (!interstitialLoaded) {
      await loadInterstitial();
    }
    await plugin.showInterstitial();
    interstitialLoaded = false;
    // Pre-load the next one
    loadInterstitial().catch(() => {});
    return true;
  } catch (err) {
    log.error('showInterstitial failed', err);
    interstitialLoaded = false;
    return false;
  }
}

// ── Rewarded Ads ────────────────────────────────────────────────────

let rewardedLoaded = false;

export async function loadRewarded(): Promise<void> {
  if (!isNativeAds) return;
  const plugin = await getAdMobPlugin();
  if (!plugin) return;

  try {
    await plugin.prepareRewardVideoAd({
      adId: adUnits.rewarded,
      isTesting: getAdUnitIds(platform) === getAdUnitIds('web'),
    });
    rewardedLoaded = true;
  } catch (err) {
    log.error('loadRewarded failed', err);
    rewardedLoaded = false;
  }
}

export async function showRewarded(): Promise<{ rewarded: boolean }> {
  if (!isNativeAds) return { rewarded: false };
  const plugin = await getAdMobPlugin();
  if (!plugin) return { rewarded: false };

  try {
    if (!rewardedLoaded) {
      await loadRewarded();
    }

    await plugin.showRewardVideoAd();
    rewardedLoaded = false;
    // Pre-load the next one
    loadRewarded().catch(() => {});
    return { rewarded: true };
  } catch (err) {
    log.error('showRewarded failed', err);
    rewardedLoaded = false;
    return { rewarded: false };
  }
}

// ── Rewarded Interstitial (Fine Relief) ─────────────────────────────

let rewardedInterstitialLoaded = false;

export async function loadRewardedInterstitial(): Promise<void> {
  if (!isNativeAds) return;
  const plugin = await getAdMobPlugin();
  if (!plugin) return;

  try {
    await plugin.prepareRewardVideoAd({
      adId: adUnits.rewardedInterstitial,
      isTesting: getAdUnitIds(platform) === getAdUnitIds('web'),
    });
    rewardedInterstitialLoaded = true;
  } catch (err) {
    log.error('loadRewardedInterstitial failed', err);
    rewardedInterstitialLoaded = false;
  }
}

export async function showRewardedInterstitial(): Promise<{ rewarded: boolean }> {
  if (!isNativeAds) return { rewarded: false };
  const plugin = await getAdMobPlugin();
  if (!plugin) return { rewarded: false };

  try {
    if (!rewardedInterstitialLoaded) {
      await loadRewardedInterstitial();
    }

    await plugin.showRewardVideoAd();
    rewardedInterstitialLoaded = false;
    loadRewardedInterstitial().catch(() => {});
    return { rewarded: true };
  } catch (err) {
    log.error('showRewardedInterstitial failed', err);
    rewardedInterstitialLoaded = false;
    return { rewarded: false };
  }
}

// ── Event Listeners ─────────────────────────────────────────────────

type AdEventCallback = (info?: any) => void;

/** @internal Tracks active listeners for cleanup. */
export const adListeners: { event: string; callback: AdEventCallback }[] = [];

/**
 * Register AdMob event listeners. Call after initAdMob().
 * Returns a cleanup function to remove all listeners.
 */
export async function registerAdListeners(callbacks: {
  onBannerImpression?: AdEventCallback;
  onInterstitialDismissed?: AdEventCallback;
  onRewardedCompleted?: AdEventCallback;
  onRewardedDismissed?: AdEventCallback;
}): Promise<() => void> {
  if (!isNativeAds) return () => {};
  const plugin = await getAdMobPlugin();
  if (!plugin) return () => {};

  const handles: any[] = [];

  if (callbacks.onBannerImpression) {
    const h = await plugin.addListener('onBannerAdImpression', callbacks.onBannerImpression);
    handles.push(h);
  }

  if (callbacks.onInterstitialDismissed) {
    const h = await plugin.addListener('onInterstitialAdDismissed', callbacks.onInterstitialDismissed);
    handles.push(h);
  }

  if (callbacks.onRewardedCompleted) {
    const h = await plugin.addListener('onRewardedVideoAdRewarded', callbacks.onRewardedCompleted);
    handles.push(h);
  }

  if (callbacks.onRewardedDismissed) {
    const h = await plugin.addListener('onRewardedVideoAdDismissed', callbacks.onRewardedDismissed);
    handles.push(h);
  }

  return () => {
    handles.forEach(h => h?.remove?.());
  };
}

// ── Pre-load Ads ────────────────────────────────────────────────────

/**
 * Pre-load all ad types after initialization.
 * Call this after initAdMob() to ensure ads are ready when needed.
 */
export async function preloadAds(): Promise<void> {
  if (!isNativeAds) return;
  await Promise.allSettled([
    loadInterstitial(),
    loadRewarded(),
    loadRewardedInterstitial(),
  ]);
}
