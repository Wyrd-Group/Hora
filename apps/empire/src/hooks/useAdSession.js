import { useEffect, useRef } from 'react';
import { useAdStore } from '../store/adStore';
import { useAuthStore, selectIsAdFree } from '../store/authStore';
import { useFocusStore } from '../store/focusStore';

/**
 * useAdSession — Tracks cumulative session time and triggers interstitials.
 * Must be mounted once at the app root level.
 *
 * Ticks every second to accumulate active session time.
 * When cumulative time crosses a 20-minute boundary, triggers an interstitial.
 *
 * Pauses tracking when:
 * - An interstitial is currently showing
 * - A rewarded video is currently showing
 * - The tab is not visible (Page Visibility API)
 * - User is in academy/course area
 * - Focus mode is active
 */
export function useAdSession(activeApp) {
  const adFree = useAuthStore(selectIsAdFree);
  const tickSession = useAdStore((s) => s.tickSession);
  const showInterstitial = useAdStore((s) => s.showInterstitial);
  const showRewarded = useAdStore((s) => s.showRewarded);
  const intervalRef = useRef(null);
  const visibleRef = useRef(!document.hidden);
  const activeAppRef = useRef(activeApp);
  activeAppRef.current = activeApp;

  // Track tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      visibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Tick every second
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      // Don't accumulate time during ads, when tab is hidden, ad-free tiers,
      // in academy/courses, or when focus mode is active
      const inAcademy = activeAppRef.current === 'learn';
      const focusActive = useFocusStore.getState().isRunning;
      if (adFree || showInterstitial || showRewarded || !visibleRef.current || inAcademy || focusActive) return;
      tickSession(1000);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [tickSession, showInterstitial, showRewarded, adFree]);
}
