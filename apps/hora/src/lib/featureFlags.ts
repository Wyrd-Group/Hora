/**
 * featureFlags — runtime gates for in-development surfaces.
 *
 * Substrate Mode is R&D as of Phase 2. Off by default in production; flip
 * on globally via `VITE_SUBSTRATE_PUBLIC=true` at build time, OR per-user
 * via `user_metadata.substrate_tester = true` in Supabase.
 *
 * The route in App.jsx and the SubstrateModeCard on OnboardingHub both
 * gate on `canAccessSubstrate(user)`.
 */

import { useAuthStore } from '../store/authStore';
import type { User } from '@supabase/supabase-js';

export function isSubstratePublic(): boolean {
  // import.meta.env values are strings; explicit equality avoids false-truthy.
  return import.meta.env.VITE_SUBSTRATE_PUBLIC === 'true';
}

export function isSubstrateTester(user: User | null | undefined): boolean {
  return Boolean(user?.user_metadata?.substrate_tester === true);
}

export function canAccessSubstrate(user: User | null | undefined): boolean {
  return isSubstratePublic() || isSubstrateTester(user);
}

/** React hook variant — re-renders on auth state change. */
export function useCanAccessSubstrate(): boolean {
  const user = useAuthStore((s) => s.user);
  return canAccessSubstrate(user);
}
