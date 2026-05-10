// ============================================================================
// useBreakpoint — matchMedia-backed hook for conditional mobile/tablet/desktop
// rendering. Keeps Tailwind breakpoints as the single source of truth so CSS
// and JS agree on when a layout flips.
// ============================================================================
//
// Usage:
//   const { isMobile, isTablet, isDesktop, bp } = useBreakpoint();
//   {isMobile ? <MobileNav /> : <DesktopNav />}
//
// Breakpoints match Tailwind defaults (apps/hora/tailwind.config.js):
//   sm: >=640px    (large phone / small tablet portrait)
//   md: >=768px    (tablet portrait — hides mobile-only UI by default)
//   lg: >=1024px   (tablet landscape / small laptop)
//   xl: >=1280px   (desktop)
//   2xl: >=1536px  (large desktop)
//
// SSR-safe: returns a conservative "desktop" default during server render and
// re-hydrates on mount. Use `bp === null` to detect pre-hydration if needed.
// ============================================================================

import { useEffect, useState } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Pixel thresholds — tailwind defaults. If you customise theme.screens in
// tailwind.config.js, mirror the change here.
export const BREAKPOINT_PX: Record<Exclude<Breakpoint, 'xs'>, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

function resolveBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINT_PX['2xl']) return '2xl';
  if (width >= BREAKPOINT_PX.xl) return 'xl';
  if (width >= BREAKPOINT_PX.lg) return 'lg';
  if (width >= BREAKPOINT_PX.md) return 'md';
  if (width >= BREAKPOINT_PX.sm) return 'sm';
  return 'xs';
}

export interface BreakpointState {
  /** Current breakpoint name. Null during SSR / first paint. */
  bp: Breakpoint | null;
  /** < md (0–767px). Phones. */
  isMobile: boolean;
  /** md — lg (768–1023px). Tablet portrait, landscape phones. */
  isTablet: boolean;
  /** >= lg (1024px+). Laptops, desktops, iPad landscape. */
  isDesktop: boolean;
  /** Raw pixel width of the viewport. 0 during SSR. */
  width: number;
}

/**
 * Subscribe to viewport breakpoint changes. Re-renders only when the
 * breakpoint category flips (not on every px), so it's safe to call from
 * render-heavy components.
 */
export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(() => {
    // SSR or headless test environment: assume desktop so we don't ship
    // a mobile-only layout to crawlers that measure the non-mobile URL.
    if (typeof window === 'undefined') {
      return { bp: null, isMobile: false, isTablet: false, isDesktop: true, width: 0 };
    }
    const w = window.innerWidth;
    const bp = resolveBreakpoint(w);
    return {
      bp,
      isMobile: w < BREAKPOINT_PX.md,
      isTablet: w >= BREAKPOINT_PX.md && w < BREAKPOINT_PX.lg,
      isDesktop: w >= BREAKPOINT_PX.lg,
      width: w,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function update(): void {
      const w = window.innerWidth;
      const bp = resolveBreakpoint(w);
      setState((prev) => {
        // Bail if the breakpoint category hasn't flipped. We intentionally
        // don't track `width` here — otherwise every 1px resize event
        // re-renders every consumer of this hook.
        if (prev.bp === bp) return prev;
        return {
          bp,
          isMobile: w < BREAKPOINT_PX.md,
          isTablet: w >= BREAKPOINT_PX.md && w < BREAKPOINT_PX.lg,
          isDesktop: w >= BREAKPOINT_PX.lg,
          width: w,
        };
      });
    }

    // Prefer matchMedia for battery reasons on mobile, but also listen to
    // `resize` to catch window resizes on desktop / tablet rotation.
    const mqls = Object.values(BREAKPOINT_PX).map((px) =>
      window.matchMedia(`(min-width: ${px}px)`),
    );
    mqls.forEach((mql) => mql.addEventListener?.('change', update));
    window.addEventListener('resize', update, { passive: true });
    // Also trigger on orientation change for tablets / phones.
    window.addEventListener('orientationchange', update, { passive: true });

    // Initial sync in case the state was created before the real width was
    // available (e.g. component mounted in a hidden dialog that just opened).
    update();

    return () => {
      mqls.forEach((mql) => mql.removeEventListener?.('change', update));
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return state;
}

/** Convenience shorthand when you only care about the mobile flag. */
export function useIsMobile(): boolean {
  return useBreakpoint().isMobile;
}

/** Convenience shorthand when you only care about the tablet flag. */
export function useIsTablet(): boolean {
  return useBreakpoint().isTablet;
}
