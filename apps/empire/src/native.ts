/**
 * Native bridge — Capacitor plugin initialization
 *
 * This module handles all native platform interactions.
 * On web, all calls gracefully no-op (Capacitor auto-detects platform).
 */

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { initAdMob, showBanner, preloadAds, registerAdListeners, isNativeAds } from './lib/admobBridge';
import { useAdStore } from './store/adStore';
import { useAuthStore, selectIsAdFree } from './store/authStore';
import { useCardEconomyStore } from './store/cardEconomyStore';

const isNative = Capacitor.isNativePlatform();

// ── Status Bar ───────────────────────────────────────────────────────────────

export async function initStatusBar() {
  if (!isNative) return;
  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.setBackgroundColor({ color: '#060a12' });
}

// ── Splash Screen ────────────────────────────────────────────────────────────

export async function hideSplash() {
  if (!isNative) return;
  await SplashScreen.hide({ fadeOutDuration: 500 });
}

// ── Haptics ──────────────────────────────────────────────────────────────────

export async function hapticLight() {
  if (!isNative) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function hapticMedium() {
  if (!isNative) return;
  await Haptics.impact({ style: ImpactStyle.Medium });
}

export async function hapticHeavy() {
  if (!isNative) return;
  await Haptics.impact({ style: ImpactStyle.Heavy });
}

export async function hapticSuccess() {
  if (!isNative) return;
  await Haptics.notification({ type: NotificationType.Success });
}

export async function hapticWarning() {
  if (!isNative) return;
  await Haptics.notification({ type: NotificationType.Warning });
}

export async function hapticError() {
  if (!isNative) return;
  await Haptics.notification({ type: NotificationType.Error });
}

// ── App Lifecycle ────────────────────────────────────────────────────────────

export function initAppLifecycle(onPause?: () => void, onResume?: () => void) {
  if (!isNative) return;

  App.addListener('pause', () => {
    onPause?.();
  });

  App.addListener('resume', () => {
    onResume?.();
  });

  // Handle Android back button
  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) {
      App.minimizeApp();
    } else {
      window.history.back();
    }
  });
}

// ── Keyboard ─────────────────────────────────────────────────────────────────

export function initKeyboard() {
  if (!isNative) return;

  Keyboard.addListener('keyboardWillShow', () => {
    document.body.classList.add('keyboard-open');
  });

  Keyboard.addListener('keyboardWillHide', () => {
    document.body.classList.remove('keyboard-open');
  });
}

// ── Init All ─────────────────────────────────────────────────────────────────

export async function initNative() {
  if (!isNative) return;

  await initStatusBar();
  initKeyboard();
  initAppLifecycle(
    // onPause: persist game state
    () => {
      // State auto-persisted by Zustand middleware
    },
    // onResume: refresh UI
    () => {
      // App resumed — UI refresh handled by reactive stores
    }
  );

  // Hide splash after a brief delay to ensure UI is rendered
  setTimeout(() => hideSplash(), 500);

  // ── AdMob Initialization ────────────────────────────────────────
  if (isNativeAds) {
    try {
      await initAdMob();
      await preloadAds();

      // Show banner if user is not on an ad-free tier
      const isAdFree = selectIsAdFree(useAuthStore.getState());
      if (!isAdFree) {
        showBanner();
      }

      // Wire AdMob events to stores
      registerAdListeners({
        onBannerImpression: () => {
          useAdStore.getState().rotateBanner();
        },
        onInterstitialDismissed: () => {
          useAdStore.getState().dismissInterstitial();
        },
        onRewardedCompleted: () => {
          // Credit 100 AP for watching a rewarded ad
          useCardEconomyStore.getState().awardAegisPoints(100, 'rewarded_ad');
          useAdStore.getState().completeRewarded();
        },
        onRewardedDismissed: () => {
          useAdStore.getState().dismissRewarded();
        },
      });

      // AdMob initialized and listeners wired
    } catch (adErr) {
      console.warn('[AEGIS] AdMob init failed (non-fatal):', adErr);
    }
  }
}

export { isNative };
