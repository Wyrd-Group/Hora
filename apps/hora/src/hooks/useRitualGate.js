/**
 * useRitualGate — first-time-only gate for the AEGIS onboarding ritual.
 *
 * The ritual must show ONCE per device-or-account. Sources of truth:
 *
 *   Authenticated users
 *     - Read   user.user_metadata.ritual_completed
 *     - Write  supabase.auth.updateUser({ data: { ritual_completed, call_sign } })
 *     - Always mirror to localStorage as a redundancy in case the Supabase
 *       update fails or the user goes offline mid-flight.
 *
 *   Anonymous (pre-auth) and guest visitors
 *     - Read   localStorage 'aegis-ritual-seen-anon' === 'true'
 *     - Write  localStorage 'aegis-ritual-seen-anon' = 'true' and 'aegis-call-sign'
 *     - The captured call sign is reused to pre-fill the AuthScreen
 *       signup form, so a visitor who completes the cold-open ritual and
 *       then signs up never re-enters the long ritual.
 *
 * Returns:
 *   { needsRitual, completeRitual, anonymousCallSign }
 *
 *   needsRitual           — true when neither metadata nor LS flag is set
 *   completeRitual({callSign, isAnonymous}) — persists the right side
 *   anonymousCallSign     — last captured anonymous call sign (or null)
 *
 * Existing accounts that predate this feature have user_metadata.ritual_completed
 * === undefined and will see the ritual on next login. That is the intended
 * brand baptism.
 */

import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

// Anonymous / guest flag — set when the cold-open ritual is completed
// without an authed user. Survives across sessions on the same device.
const LS_KEY_DONE = 'aegis-ritual-seen-anon';
// Captured call sign — both the anonymous ritual and the authed ritual
// mirror to this key so the AuthScreen / app can pre-fill names.
const LS_KEY_NAME = 'aegis-call-sign';

// Legacy key from PR #21 — kept for read-side fallback so users who
// already completed the ritual under the old key don't replay it.
const LS_KEY_LEGACY = 'aegis-ritual-completed';

function readLocalDone() {
  try {
    if (localStorage.getItem(LS_KEY_DONE) === 'true') return true;
    // Honour legacy completion flag for users who finished the ritual
    // before the anon-key rename.
    if (localStorage.getItem(LS_KEY_LEGACY) === 'true') return true;
    return false;
  } catch {
    return false;
  }
}

function readAnonCallSign() {
  try {
    return localStorage.getItem(LS_KEY_NAME) || null;
  } catch {
    return null;
  }
}

function writeAnonDone(callSign) {
  try {
    localStorage.setItem(LS_KEY_DONE, 'true');
    if (callSign) localStorage.setItem(LS_KEY_NAME, callSign);
  } catch {
    /* private mode / quota — ignore */
  }
}

function writeCallSignMirror(callSign) {
  try {
    if (callSign) localStorage.setItem(LS_KEY_NAME, callSign);
  } catch {
    /* private mode / quota — ignore */
  }
}

export function useRitualGate() {
  const user = useAuthStore((s) => s.user);
  const guestMode = useAuthStore((s) => s.guestMode);

  // needsRitual: true unless we have a positive completion signal —
  // either the canonical user_metadata flag (authed users) or the
  // device-local "seen" flag (anonymous, guest, or fallback for authed
  // users whose metadata write failed).
  const needsRitual = useMemo(() => {
    if (user) {
      const metaDone = !!user.user_metadata?.ritual_completed;
      if (metaDone) return false;
      return !readLocalDone();
    }
    // Both pre-auth visitors and guest-mode users gate on the same
    // device-local flag. The cold-open ritual writes it before any
    // signup happens.
    return !readLocalDone();
  }, [user, guestMode]);

  const anonymousCallSign = useMemo(
    () => readAnonCallSign(),
    // The hook re-reads on each render because localStorage is the
    // source of truth and the value may change mid-session (e.g. just
    // after the ritual completes). The dep on user/guestMode is enough
    // since the surrounding component re-renders when either flips.
    [user, guestMode],
  );

  const completeRitual = useMemo(() => {
    return async ({ callSign, isAnonymous } = {}) => {
      const trimmed = (callSign || '').trim();
      const anon = isAnonymous ?? (!user && !guestMode);

      // Always mirror the call sign to localStorage so subsequent surfaces
      // (signup form, short intro greeting) can read it without waiting
      // for a network round-trip.
      writeCallSignMirror(trimmed);

      if (anon || guestMode) {
        // Anonymous / guest: device-local flag is the source of truth.
        // No metadata write because there is no user to attach it to.
        writeAnonDone(trimmed);
        return;
      }

      if (user) {
        // Authed: write to user_metadata (cross-device) AND mirror the
        // device flag so a flaky write doesn't replay the ritual.
        writeAnonDone(trimmed);
        try {
          await supabase.auth.updateUser({
            data: {
              ritual_completed: true,
              call_sign: trimmed || undefined,
            },
          });
        } catch (e) {
          // localStorage redundancy already in place; log and move on.
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[AEGIS] ritual_completed write failed:', e);
          }
        }
      }
    };
  }, [user, guestMode]);

  return { needsRitual, completeRitual, anonymousCallSign };
}

export default useRitualGate;
