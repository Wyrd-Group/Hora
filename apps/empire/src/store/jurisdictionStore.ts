// ============================================================================
// Jurisdiction Store
// ============================================================================
// Tracks the learner's active country for jurisdictional content filtering.
// Persists to localStorage so the choice survives page reloads, and syncs to
// the Supabase profiles table when the user is authenticated.
//
// Design principle: single source of truth. The entire app reads country from
// here. Tax wrappers, retirement accounts, regulator references in lessons —
// all resolve via resolveMemberships(country) from types/regulatory.ts.
// ============================================================================

import { createPersistedStore } from './createPersistedStore';
import { supabase } from '../lib/supabase';
import {
  COUNTRY_META,
  resolveMemberships,
  type CountryCode,
  type JurisdictionLayer,
} from '../types/regulatory';

type Coverage = 'full' | 'partial' | 'none' | 'unselected';

// Module-level flag: true once a detectFromIP call has been attempted in the
// current browser session. Prevents a re-mounted CountrySelectorFirstLaunch
// from hitting ipapi.co twice in the same page load. Reset on reload.
let ipDetectionTried = false;

interface JurisdictionState {
  country: CountryCode | null;       // ISO 3166-1 alpha-2
  hasPrompted: boolean;               // true once user has seen the picker at least once
  detectedCountry: CountryCode | null; // from IP geolocation (informational)
  lastSyncedAt: number | null;

  // Derived (read via selectors)
  memberships: () => JurisdictionLayer[];
  coverage: () => Coverage;
  countryName: () => string | null;
  countryFlag: () => string | null;

  // Actions
  setCountry: (country: CountryCode | null) => Promise<void>;
  markPrompted: () => void;
  detectFromIP: () => Promise<CountryCode | null>;
  hydrateFromProfile: (userId: string) => Promise<void>;
}

export const useJurisdictionStore = createPersistedStore<JurisdictionState>(
  'jurisdiction',
  (set, get) => ({
    country: null,
    hasPrompted: false,
    detectedCountry: null,
    lastSyncedAt: null,

    // ── Derived selectors ────────────────────────────────────────────────
    memberships: () => resolveMemberships(get().country),

    coverage: () => {
      const c = get().country;
      if (!c) return 'unselected';
      return (COUNTRY_META[c]?.localized_coverage ?? 'none') as Coverage;
    },

    countryName: () => {
      const c = get().country;
      return c ? (COUNTRY_META[c]?.name ?? c) : null;
    },

    countryFlag: () => {
      const c = get().country;
      return c ? (COUNTRY_META[c]?.flag ?? '🏳️') : null;
    },

    // ── Actions ──────────────────────────────────────────────────────────
    setCountry: async (country) => {
      set({ country, hasPrompted: true, lastSyncedAt: Date.now() });

      // Best-effort sync to profile table. Silent fail — offline mode is fine.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ country_code: country })
            .eq('id', user.id);
        }
      } catch {
        /* guest mode / offline — localStorage is enough */
      }
    },

    markPrompted: () => set({ hasPrompted: true }),

    detectFromIP: async () => {
      // Caching strategy:
      //   - detectedCountry is persisted to localStorage via partialize, so
      //     the value survives reloads without refetching.
      //   - ipDetectionTried is in-memory only; prevents spamming the API
      //     if the first launch modal re-mounts within a single session.
      //   - Free tier is capped at 1000 req/day — stay well under it.
      if (get().detectedCountry) return get().detectedCountry;
      if (ipDetectionTried) return null;
      ipDetectionTried = true;

      try {
        const res = await fetch('https://ipapi.co/json/', {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4000),
        });
        // 429 = rate limited; fall through to null without noisy logging
        if (!res.ok) {
          if (res.status !== 429) {
            console.warn(`[jurisdictionStore] IP detect returned ${res.status}`);
          }
          return null;
        }
        const data = await res.json();
        const code = (data?.country_code || '').toUpperCase();

        // Normalize GB → UK for our internal coding
        const normalized = code === 'GB' ? 'UK' : code;
        const valid = normalized && COUNTRY_META[normalized as CountryCode];
        if (valid) {
          set({ detectedCountry: normalized as CountryCode });
          return normalized as CountryCode;
        }
        return null;
      } catch (err) {
        // Timeout / network error — silent is fine, but surface in dev console
        console.warn('[jurisdictionStore] IP detect failed:', err);
        return null;
      }
    },

    hydrateFromProfile: async (userId) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('country_code')
          .eq('id', userId)
          .maybeSingle();
        if (error) {
          console.warn('[jurisdictionStore] hydrateFromProfile error:', error.message);
          return;
        }
        if (!data?.country_code) return;
        const code = String(data.country_code).toUpperCase();
        if (COUNTRY_META[code as CountryCode]) {
          // Server wins on login — overwrite local cached selection
          set({ country: code as CountryCode, lastSyncedAt: Date.now() });
        }
      } catch (err) {
        // Network / offline — previously silent, now logged so dev sees it
        console.warn('[jurisdictionStore] hydrateFromProfile failed:', err);
      }
    },
  }),
  {
    version: 1,
    // Persist only the mutable fields — never persist derived selectors.
    // Cast back to JurisdictionState to satisfy the (state) => T signature;
    // Zustand merges the partial back over defaults on rehydrate at runtime.
    partialize: (state) => ({
      country: state.country,
      hasPrompted: state.hasPrompted,
      detectedCountry: state.detectedCountry,
      lastSyncedAt: state.lastSyncedAt,
    }) as unknown as JurisdictionState,
  },
);

// ── Primitive-only selectors (safe for use without useMemo) ───────────────
// Zustand best practice: select primitives, never select objects/arrays
// directly in render paths.
export const selectCountry = (s: JurisdictionState) => s.country;
export const selectHasPrompted = (s: JurisdictionState) => s.hasPrompted;
export const selectCountryName = (s: JurisdictionState) => s.country ? (COUNTRY_META[s.country]?.name ?? s.country) : null;
export const selectCountryFlag = (s: JurisdictionState) => s.country ? (COUNTRY_META[s.country]?.flag ?? '🏳️') : null;
