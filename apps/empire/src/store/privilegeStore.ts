// ============================================================================
// Privilege Store
// ============================================================================
// Tracks the signed-in user's role-derived UI privileges:
//   - isAdmin      → can approve regulatory facts, manage roles, see audit logs
//   - isBetaTester → can open the DevPanel to manipulate own game state for
//                    testing; admins always get this implicitly
//
// Loads from the `profiles` table on sign-in. The flags are cached in memory
// only (not persisted to localStorage) so a stale token can never unlock the
// UI after a revoke — on every refresh we query Supabase again.
//
// Server-side enforcement lives in Postgres:
//   - BEFORE UPDATE trigger `profiles_privilege_guard` blocks non-admins from
//     editing role/is_admin/is_beta_tester on any row
//   - Admin-only RPCs: grant_beta_tester, revoke_beta_tester, grant_admin,
//     revoke_admin
//
// The client can tamper with `isAdmin` in memory to reveal admin UI, but RLS
// will refuse every write — so cosmetic cheating is cheap, privilege
// escalation is impossible.
// ============================================================================

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface PrivilegeState {
  isAdmin: boolean;
  isBetaTester: boolean;
  loaded: boolean;          // true after first refresh completes (success or fail)
  lastCheckedAt: number | null;

  refresh: () => Promise<void>;
  reset: () => void;
}

async function readPrivileges(): Promise<{ isAdmin: boolean; isBetaTester: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isAdmin: false, isBetaTester: false };

  // Prefer the RPC helpers — they bypass RLS column visibility and are cheap.
  // Falls back to a direct profiles read if the RPCs aren't present yet.
  const [adminRes, betaRes] = await Promise.all([
    supabase.rpc('current_user_is_admin'),
    supabase.rpc('current_user_is_beta_tester'),
  ]);

  if (!adminRes.error && !betaRes.error) {
    const isAdmin = Boolean(adminRes.data);
    // Admins always get beta-tester UI, even if the DB flag is false.
    const isBetaTester = Boolean(betaRes.data) || isAdmin;
    return { isAdmin, isBetaTester };
  }

  // Fallback path (old schema, or RPCs revoked)
  const { data } = await supabase
    .from('profiles')
    .select('role, is_admin, is_beta_tester')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = Boolean(data?.is_admin) || data?.role === 'admin';
  const isBetaTester = Boolean((data as { is_beta_tester?: boolean })?.is_beta_tester) || isAdmin;
  return { isAdmin, isBetaTester };
}

export const usePrivilegeStore = create<PrivilegeState>((set) => ({
  isAdmin: false,
  isBetaTester: false,
  loaded: false,
  lastCheckedAt: null,

  refresh: async () => {
    try {
      const privs = await readPrivileges();
      set({ ...privs, loaded: true, lastCheckedAt: Date.now() });
    } catch (err) {
      // Network / auth errors → treat as no privileges, but mark loaded so the
      // UI doesn't hang on a spinner.
      console.warn('[privilegeStore] refresh failed:', err);
      set({ isAdmin: false, isBetaTester: false, loaded: true, lastCheckedAt: Date.now() });
    }
  },

  reset: () => set({
    isAdmin: false,
    isBetaTester: false,
    loaded: false,
    lastCheckedAt: null,
  }),
}));

// ── Primitive selectors (safe for component render paths) ─────────────────
export const selectIsAdmin = (s: PrivilegeState) => s.isAdmin;
export const selectIsBetaTester = (s: PrivilegeState) => s.isBetaTester;
export const selectPrivilegesLoaded = (s: PrivilegeState) => s.loaded;

// Convenience: "can use dev tools" — admin OR beta tester
export const selectCanUseDevTools = (s: PrivilegeState) => s.isAdmin || s.isBetaTester;
