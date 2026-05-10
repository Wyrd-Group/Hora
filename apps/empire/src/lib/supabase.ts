import { createClient } from '@supabase/supabase-js';

// Vite resolves `import.meta.env` at build time; tsx (Node) does not,
// so we read it defensively so cold-start probes that import this
// module don't crash on missing env. Production builds keep the same
// values via Vite's static replacement.
const viteEnv: Record<string, string | undefined> =
  (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const supabaseUrl =
  viteEnv.VITE_SUPABASE_URL ??
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined);
const supabaseAnonKey =
  viteEnv.VITE_SUPABASE_ANON_KEY ??
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] FATAL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — all queries will fail');
}

// Session persistence is explicit so future readers know "connect once,
// stay remembered" is intentional. Supabase JS v2 defaults to persistent
// + auto-refreshing localStorage sessions; we just spell it out.
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'aegis-auth',
  },
});
