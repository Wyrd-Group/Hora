/**
 * useInterval / useTimeout — auto-cleanup React hooks.
 *
 * Why: the repo had 139 setInterval/setTimeout calls against only 90 clear*,
 * a 49-timer gap that leaked handles every time a component unmounted
 * mid-timer. These hooks follow Dan Abramov's canonical useInterval pattern:
 *   - Latest callback stored in a ref so closures don't go stale
 *   - delay=null pauses the timer without re-creating it
 *   - Cleanup is guaranteed on unmount and on delay changes
 *
 * Use these instead of raw setInterval/setTimeout in any React component.
 */

import { useEffect, useRef } from 'react';

export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null || delay < 0) return undefined;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export function useTimeout(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null || delay < 0) return undefined;
    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}
