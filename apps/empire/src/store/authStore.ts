import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { TIER_CONFIG, type SubscriptionTier } from '../data/subscriptionTiers';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;       // initial auth check only
  submitting: boolean;    // sign-in/sign-up in progress
  error: string | null;
  guestMode: boolean;     // skip auth, play offline
  recoveryMode: boolean;  // password recovery flow active
  subscriptionTier: SubscriptionTier;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  enterGuestMode: () => void;
  clearError: () => void;
  setSubscriptionTier: (tier: SubscriptionTier) => void;
  deleteAccount: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  loading: true,
  submitting: false,
  error: null,
  guestMode: false,
  recoveryMode: false,
  subscriptionTier: 0 as SubscriptionTier,

  initialize: async () => {
    try {
      // Get existing session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      set({
        session,
        user: session?.user ?? null,
        loading: false,
      });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });
        if (event === 'PASSWORD_RECOVERY') {
          set({ recoveryMode: true });
        }
      });
    } catch (err: any) {
      console.error('[Auth] Init error:', err);
      set({ loading: false, error: err.message });
    }
  },

  signUp: async (email, password, displayName) => {
    set({ submitting: true, error: null });
    try {
      // Carry forward the cold-open ritual outcome so the new user is
      // marked as "ritual seen" the moment their account exists. Without
      // this they would replay the long ritual on first login.
      let ritualSeen: true | undefined;
      let coldOpenCallSign: string | undefined;
      try {
        if (localStorage.getItem('aegis-ritual-seen-anon') === 'true') {
          ritualSeen = true;
        }
        const cs = localStorage.getItem('aegis-call-sign');
        if (cs) coldOpenCallSign = cs;
      } catch {
        /* private mode / quota — ignore */
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            ritual_completed: ritualSeen,
            call_sign: coldOpenCallSign,
          },
        },
      });
      if (error) throw error;

      if (data.session) {
        set({ session: data.session, user: data.user, submitting: false });
      } else {
        set({ submitting: false });
      }
      return true;
    } catch (err: any) {
      set({ submitting: false, error: err.message });
      return false;
    }
  },

  signIn: async (email, password) => {
    set({ submitting: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      set({ session: data.session, user: data.user, submitting: false });
      return true;
    } catch (err: any) {
      set({ submitting: false, error: err.message });
      return false;
    }
  },

  signInWithProvider: async (provider) => {
    set({ submitting: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      // Browser redirects to provider; session is established when the user returns
      // and the onAuthStateChange listener picks it up.
      return true;
    } catch (err: any) {
      set({ submitting: false, error: err.message });
      return false;
    }
  },

  signOut: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    // Clear game state from localStorage so next login loads fresh from cloud
    localStorage.removeItem('quantico-empire-storage-v8');
    set({ user: null, session: null, loading: false });
  },

  updatePassword: async (newPassword) => {
    set({ submitting: true, error: null });
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      set({ submitting: false, recoveryMode: false });
      return true;
    } catch (err: any) {
      set({ submitting: false, error: err.message });
      return false;
    }
  },

  enterGuestMode: () => {
    set({ guestMode: true, loading: false });
  },

  resetPassword: async (email) => {
    set({ submitting: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      set({ submitting: false });
      return true;
    } catch (err: any) {
      set({ submitting: false, error: err.message });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  setSubscriptionTier: (tier) => set({ subscriptionTier: tier }),

  deleteAccount: async () => {
    const session = get().session;
    if (!session) return false;

    set({ submitting: true, error: null });
    try {
      const resp = await fetch('/api/v1/delete-account', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${resp.status}`);
      }

      // Clear all local data
      const storageKeys = Object.keys(localStorage).filter(k =>
        k.startsWith('empire-') || k.startsWith('quantico-') || k.startsWith('aegis-')
      );
      storageKeys.forEach(k => localStorage.removeItem(k));

      set({ user: null, session: null, submitting: false, guestMode: false });
      return true;
    } catch (err: any) {
      set({ submitting: false, error: err.message });
      return false;
    }
  },
}));

// Selector helpers — use with useAuthStore(selectIsAdFree) etc.
export const selectIsAdFree = (s: AuthState) => TIER_CONFIG[s.subscriptionTier].adFree;
export const selectHasOffline = (s: AuthState) => TIER_CONFIG[s.subscriptionTier].offline;
export const selectHasFullAthena = (s: AuthState) => TIER_CONFIG[s.subscriptionTier].athenaFull;
export const selectHasAcademyAthena = (s: AuthState) => TIER_CONFIG[s.subscriptionTier].academyAthena;
export const selectHasPremiumPass = (s: AuthState) => TIER_CONFIG[s.subscriptionTier].premiumPass;
