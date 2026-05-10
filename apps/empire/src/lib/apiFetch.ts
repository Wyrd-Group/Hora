/**
 * Authenticated fetch wrapper for /api/v1/* endpoints.
 * Automatically attaches the Supabase JWT as a Bearer token.
 */

import { useAuthStore } from '../store/authStore';

/**
 * Fetch with automatic Authorization header from the current Supabase session.
 * Falls back to a regular fetch if no session is available (guest mode).
 */
export async function apiFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const session = useAuthStore.getState().session;
  const headers = new Headers(init.headers);

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...init, headers });
}
