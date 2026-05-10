/**
 * Hora — minimal auth store.
 *
 * Much simpler than AEGIS's authStore — no subscription tiers, no
 * ECFL band, no Substrate-tester flag. Just sign in, stay signed
 * in, out.
 */
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string, callSign: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set, _get) => ({
  user: null,
  session: null,
  loading: true,
  submitting: false,
  error: null,

  initialize: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      set({ session, user: session?.user ?? null, loading: false });
      supabase.auth.onAuthStateChange((_event, sess) => {
        set({ session: sess, user: sess?.user ?? null });
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      // eslint-disable-next-line no-console
      console.error('[Auth] init error:', e.message);
      set({ loading: false, error: e.message ?? 'unknown' });
    }
  },

  signUp: async (email, password, callSign) => {
    set({ submitting: true, error: null });
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { call_sign: callSign } },
      });
      if (error) throw error;
      set({ submitting: false });
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      set({ submitting: false, error: e.message ?? 'Sign-up failed' });
      return false;
    }
  },

  signIn: async (email, password) => {
    set({ submitting: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ submitting: false });
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      set({ submitting: false, error: e.message ?? 'Sign-in failed' });
      return false;
    }
  },

  signInWithProvider: async (provider) => {
    set({ submitting: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      set({ submitting: false, error: e.message ?? `${provider} sign-in failed` });
      return false;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  clearError: () => set({ error: null }),
}));
