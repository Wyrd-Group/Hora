import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Capacitor } from '@capacitor/core';

// Inline platform check to avoid circular dependency with admobBridge
const isNativeAds = Capacitor.isNativePlatform();

// ── Ad System Configuration ─────────────────────────────────────
// Banner: rotates every 15s (simulated) / 30s minimum (AdMob policy on native)
// Interstitial: 30s full-screen, skip after 10s, triggers every 20min CUMULATIVE usage
// Rewarded Video: 60s opt-in for 100 AP, max 50/day (5,000 AP daily cap)

const INTERSTITIAL_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes cumulative
const MAX_REWARDED_PER_DAY = 50;
const REWARDED_AP_AMOUNT = 100;
const REWARDED_DURATION_S = 60;
const BANNER_ROTATE_MS = 15_000;

// ── Branded Ad Pool ──────────────────────────────────────────────
// In production, these would come from AdMob/AppLovin SDK.
// For now, high-quality branded placeholders that look real.

export const BANNER_ADS = [
  { id: 'b1', brand: 'Bloomberg Terminal', tagline: 'Where the world does business', color: '#FF6600', accent: '#1a1a1a', icon: '◈' },
  { id: 'b2', brand: 'Reuters', tagline: 'The answer company', color: '#FF8800', accent: '#1a1a1a', icon: '◉' },
  { id: 'b3', brand: 'Financial Times', tagline: 'Nikkei', color: '#FCD0B4', accent: '#33302E', icon: '▣' },
  { id: 'b4', brand: 'The Economist', tagline: 'Intelligent life', color: '#E3120B', accent: '#1a1a1a', icon: '⊠' },
  { id: 'b5', brand: 'Masterclass', tagline: 'Learn from the best', color: '#000000', accent: '#C8A97E', icon: '★' },
  { id: 'b6', brand: 'Coursera', tagline: 'Learn without limits', color: '#0056D2', accent: '#1a1a1a', icon: '⊞' },
  { id: 'b7', brand: 'Revolut', tagline: 'One app, all things money', color: '#0075EB', accent: '#1a1a1a', icon: '⬡' },
  { id: 'b8', brand: 'Trading 212', tagline: 'Invest commission-free', color: '#00C805', accent: '#1a1a1a', icon: '⇄' },
  { id: 'b9', brand: 'Saxo Bank', tagline: 'Professional trading platform', color: '#0033A0', accent: '#1a1a1a', icon: '◆' },
  { id: 'b10', brand: 'eToro', tagline: 'The social trading platform', color: '#69C53E', accent: '#1a1a1a', icon: '◎' },
  { id: 'b11', brand: 'Binance', tagline: 'The world\'s leading exchange', color: '#F0B90B', accent: '#1a1a1a', icon: '⬢' },
  { id: 'b12', brand: 'CFA Institute', tagline: 'Setting the standard', color: '#003DA5', accent: '#1a1a1a', icon: '⊕' },
];

export const INTERSTITIAL_ADS = [
  { id: 'i1', brand: 'Bloomberg Terminal', headline: 'Connect. Discover. Decide.', body: 'Data-driven intelligence for the modern investor.', color: '#FF6600', duration: 30 },
  { id: 'i2', brand: 'Masterclass', headline: 'Ray Dalio teaches Principles', body: 'Learn investment strategies from the world\'s top hedge fund manager.', color: '#C8A97E', duration: 30 },
  { id: 'i3', brand: 'Financial Times', headline: 'Global perspective. Trusted insight.', body: 'The essential briefing for business leaders worldwide.', color: '#FCD0B4', duration: 30 },
  { id: 'i4', brand: 'CFA Institute', headline: 'Become a Charterholder', body: 'The gold standard in investment management credentials.', color: '#003DA5', duration: 30 },
  { id: 'i5', brand: 'Revolut', headline: 'Your money, borderless.', body: 'Send, spend, and invest globally with zero hidden fees.', color: '#0075EB', duration: 30 },
];

export const REWARDED_ADS = [
  { id: 'r1', brand: 'Trading 212', offer: 'Watch to earn 100 AP', color: '#00C805', duration: 60 },
  { id: 'r2', brand: 'eToro', offer: 'Watch to earn 100 AP', color: '#69C53E', duration: 60 },
  { id: 'r3', brand: 'Coursera', offer: 'Watch to earn 100 AP', color: '#0056D2', duration: 60 },
  { id: 'r4', brand: 'Saxo Bank', offer: 'Watch to earn 100 AP', color: '#0033A0', duration: 60 },
  { id: 'r5', brand: 'Binance', offer: 'Watch to earn 100 AP', color: '#F0B90B', duration: 60 },
];

// ── Types ─────────────────────────────────────────────────────────
interface AdState {
  // Session tracking
  cumulativeSessionMs: number;       // Cumulative active time this session (persisted across app reopens)
  lastInterstitialAt: number;        // Timestamp of last interstitial shown
  lastSessionTickAt: number;         // Timestamp of last session tick (for delta calc)

  // Daily counters
  rewardedWatchedToday: number;
  rewardedDayKey: string;            // YYYY-MM-DD for daily reset

  // Banner state
  currentBannerIndex: number;

  // UI state
  showInterstitial: boolean;
  showRewarded: boolean;
  showFineRelief: boolean;           // 60s ad to erase 50% of fines
  interstitialSkippable: boolean;    // Becomes true after 10s
  interstitialSecondsLeft: number;
  rewardedSecondsLeft: number;
  fineReliefSecondsLeft: number;
  rewardPending: boolean;            // True when rewarded video completed, awaiting claim
  fineReliefPending: boolean;        // True when fine relief ad completed

  // Native ad mode — when true, AdMob SDK handles rendering (simulated overlays hidden)
  useRealAds: boolean;

  // Stats (for analytics)
  totalBannerImpressions: number;
  totalInterstitialsShown: number;
  totalRewardedCompleted: number;

  // Actions
  tickSession: (deltaMs: number) => void;
  rotateBanner: () => void;
  triggerInterstitial: () => void;
  dismissInterstitial: () => void;
  tickInterstitial: () => void;
  requestRewarded: () => boolean;
  tickRewarded: () => void;
  completeRewarded: () => void;
  dismissRewarded: () => void;
  claimReward: () => number;
  canWatchRewarded: () => boolean;
  getRewardedRemaining: () => number;
  requestFineRelief: () => boolean;
  tickFineRelief: () => void;
  claimFineRelief: () => void;
  dismissFineRelief: () => void;
}

function getDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useAdStore = create<AdState>()(
  persist(
    (set, get) => ({
      cumulativeSessionMs: 0,
      lastInterstitialAt: 0,
      lastSessionTickAt: Date.now(),
      rewardedWatchedToday: 0,
      rewardedDayKey: getDayKey(),
      currentBannerIndex: 0,
      showInterstitial: false,
      showRewarded: false,
      showFineRelief: false,
      interstitialSkippable: false,
      interstitialSecondsLeft: 30,
      rewardedSecondsLeft: REWARDED_DURATION_S,
      fineReliefSecondsLeft: 60,
      rewardPending: false,
      fineReliefPending: false,
      useRealAds: isNativeAds,
      totalBannerImpressions: 0,
      totalInterstitialsShown: 0,
      totalRewardedCompleted: 0,

      tickSession: (deltaMs: number) => {
        const s = get();

        // Reset daily counters if day changed
        const today = getDayKey();
        if (s.rewardedDayKey !== today) {
          set({ rewardedWatchedToday: 0, rewardedDayKey: today });
        }

        const newCumulative = s.cumulativeSessionMs + deltaMs;

        // Simple check: every 20min of cumulative use
        const intervalsPassed = Math.floor(newCumulative / INTERSTITIAL_INTERVAL_MS);
        const lastIntervalsPassed = Math.floor(s.cumulativeSessionMs / INTERSTITIAL_INTERVAL_MS);

        if (intervalsPassed > lastIntervalsPassed && !s.showInterstitial && !s.showRewarded) {
          // Trigger interstitial
          set({
            cumulativeSessionMs: newCumulative,
            showInterstitial: true,
            interstitialSkippable: false,
            interstitialSecondsLeft: 30,
            lastInterstitialAt: Date.now(),
            totalInterstitialsShown: s.totalInterstitialsShown + 1,
          });
        } else {
          set({ cumulativeSessionMs: newCumulative });
        }
      },

      rotateBanner: () => {
        set((s) => ({
          currentBannerIndex: (s.currentBannerIndex + 1) % BANNER_ADS.length,
          totalBannerImpressions: s.totalBannerImpressions + 1,
        }));
      },

      triggerInterstitial: () => {
        set((s) => ({
          showInterstitial: true,
          interstitialSkippable: false,
          interstitialSecondsLeft: 30,
          lastInterstitialAt: Date.now(),
          totalInterstitialsShown: s.totalInterstitialsShown + 1,
        }));
      },

      dismissInterstitial: () => {
        set({ showInterstitial: false, interstitialSkippable: false, interstitialSecondsLeft: 30 });
      },

      tickInterstitial: () => {
        set((s) => {
          const newSeconds = s.interstitialSecondsLeft - 1;
          if (newSeconds <= 0) {
            return { showInterstitial: false, interstitialSkippable: false, interstitialSecondsLeft: 30 };
          }
          return {
            interstitialSecondsLeft: newSeconds,
            interstitialSkippable: newSeconds <= 20, // Skippable after 10s (30 - 20 = 10s passed)
          };
        });
      },

      requestRewarded: (): boolean => {
        const s = get();
        if (!s.canWatchRewarded()) return false;
        set({
          showRewarded: true,
          rewardedSecondsLeft: REWARDED_DURATION_S,
          rewardPending: false,
        });
        return true;
      },

      tickRewarded: () => {
        set((s) => {
          const newSeconds = s.rewardedSecondsLeft - 1;
          if (newSeconds <= 0) {
            return {
              rewardedSecondsLeft: 0,
              rewardPending: true,
              rewardedWatchedToday: s.rewardedWatchedToday + 1,
              totalRewardedCompleted: s.totalRewardedCompleted + 1,
            };
          }
          return { rewardedSecondsLeft: newSeconds };
        });
      },

      completeRewarded: () => {
        set({ rewardPending: true });
      },

      dismissRewarded: () => {
        set({ showRewarded: false, rewardPending: false, rewardedSecondsLeft: REWARDED_DURATION_S });
      },

      claimReward: (): number => {
        set({ showRewarded: false, rewardPending: false, rewardedSecondsLeft: REWARDED_DURATION_S });
        return REWARDED_AP_AMOUNT;
      },

      canWatchRewarded: (): boolean => {
        const s = get();
        const today = getDayKey();
        const watched = s.rewardedDayKey === today ? s.rewardedWatchedToday : 0;
        return watched < MAX_REWARDED_PER_DAY && !s.showRewarded && !s.showInterstitial;
      },

      getRewardedRemaining: (): number => {
        const s = get();
        const today = getDayKey();
        const watched = s.rewardedDayKey === today ? s.rewardedWatchedToday : 0;
        return Math.max(0, MAX_REWARDED_PER_DAY - watched);
      },

      // ── Fine Relief Ad (60s to erase 50% of fines) ──
      requestFineRelief: (): boolean => {
        const s = get();
        if (s.showFineRelief || s.showRewarded || s.showInterstitial) return false;
        set({ showFineRelief: true, fineReliefSecondsLeft: 60, fineReliefPending: false });
        return true;
      },

      tickFineRelief: () => {
        set((s) => {
          const newSeconds = s.fineReliefSecondsLeft - 1;
          if (newSeconds <= 0) {
            return { fineReliefSecondsLeft: 0, fineReliefPending: true };
          }
          return { fineReliefSecondsLeft: newSeconds };
        });
      },

      claimFineRelief: () => {
        set({ showFineRelief: false, fineReliefPending: false, fineReliefSecondsLeft: 60 });
      },

      dismissFineRelief: () => {
        set({ showFineRelief: false, fineReliefPending: false, fineReliefSecondsLeft: 60 });
      },
    }),
    {
      name: 'empire-ads',
      version: 1,
      partialize: (state) => ({
        cumulativeSessionMs: state.cumulativeSessionMs,
        lastInterstitialAt: state.lastInterstitialAt,
        rewardedWatchedToday: state.rewardedWatchedToday,
        rewardedDayKey: state.rewardedDayKey,
        totalBannerImpressions: state.totalBannerImpressions,
        totalInterstitialsShown: state.totalInterstitialsShown,
        totalRewardedCompleted: state.totalRewardedCompleted,
      }),
    }
  )
);

export { INTERSTITIAL_INTERVAL_MS, MAX_REWARDED_PER_DAY, REWARDED_AP_AMOUNT, REWARDED_DURATION_S, BANNER_ROTATE_MS };
