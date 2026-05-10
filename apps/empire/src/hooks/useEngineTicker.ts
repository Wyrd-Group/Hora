import { useEffect } from 'react';
import { useEmpireStore } from '../store/empireStore';

/**
 * useEngineTicker
 * 
 * Invokes the global processTick function inside empireStore.
 * Simulates the passage of time (e.g. 1 month per 30 seconds).
 */
export function useEngineTicker(intervalMs: number = 30000) {
  const processTick = useEmpireStore(state => state.processTick);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    // Execute first tick on load if desired, or skip to just run on interval
    // processTick(); 

    const interval = setInterval(() => {
      processTick();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [processTick, intervalMs]);
}
