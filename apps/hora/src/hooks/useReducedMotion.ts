/**
 * useReducedMotion — observes `prefers-reduced-motion` media query.
 *
 * Returns true when the user has asked the OS to reduce motion. Wrap any
 * non-essential animation in `if (reduce) { render static fallback }`.
 */

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
    // Safari <14 uses addListener
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler);
      else mql.removeListener(handler);
    };
  }, []);

  return reduce;
}
