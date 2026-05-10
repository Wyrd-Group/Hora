/**
 * SubstrateTosInterstitial — first-entry gate for Substrate Mode.
 *
 * Per AEGIS_BUILD_SPEC.md §4.3, every player must explicitly accept the
 * Substrate ToS once before entering the mode. This component is that
 * one-time gate.
 *
 * Phase 0 stub copy (per the build prompt):
 *   - Three short paragraphs.
 *   - **No equity language. No percentages. No "you may be invited to
 *     the cap table" promise.** Lawyer review of those bits is still
 *     pending; until the Lisbon-based fintech counsel signs off (per
 *     §4.4), Phase 0 keeps the copy conservative.
 *   - British English.
 *
 * On [Accept]:
 *   1. Insert a row in `substrate_tos_acceptances` (user_id, accepted_at,
 *      tos_version='v1'). RLS scopes the insert to the calling user.
 *   2. Emit `substrate_tos_accepted` telemetry (spec §12.1) which routes
 *      through the brain.
 *   3. Call `props.onAccepted()` so the parent can swap to the next
 *      surface.
 *
 * On [Return]:
 *   1. Emit `substrate_tos_declined`.
 *   2. Call `props.onDeclined()`.
 *
 * Visual: same atmosphere as the rest of the onboarding surfaces —
 * RitualBackdrop in subtle density, glassmorphism card.
 */

import React, { useEffect, useState } from 'react';
import RitualBackdrop from '../shared/RitualBackdrop';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { emit, SUBSTRATE_EVENTS } from '../../substrate/telemetry/events';

const TOS_VERSION = 'v1';

export default function SubstrateTosInterstitial({ onAccepted, onDeclined }) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Telemetry: viewed
  useEffect(() => {
    if (!userId) return;
    void emit(SUBSTRATE_EVENTS.SUBSTRATE_TOS_VIEWED, {
      player_id: userId,
      tos_version: TOS_VERSION,
      ts: Date.now(),
    });
  }, [userId]);

  const handleAccept = async () => {
    if (!userId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: insertError } = await supabase
        .from('substrate_tos_acceptances')
        .upsert(
          {
            user_id: userId,
            accepted_at: new Date().toISOString(),
            tos_version: TOS_VERSION,
          },
          { onConflict: 'user_id' },
        );
      if (insertError) throw insertError;

      void emit(SUBSTRATE_EVENTS.SUBSTRATE_TOS_ACCEPTED, {
        player_id: userId,
        tos_version: TOS_VERSION,
        ts: Date.now(),
      });

      if (typeof onAccepted === 'function') onAccepted();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Substrate] ToS acceptance failed:', err?.message || err);
      setError('Could not record acceptance. Please retry.');
      setSubmitting(false);
    }
  };

  const handleDecline = () => {
    if (userId) {
      void emit(SUBSTRATE_EVENTS.SUBSTRATE_TOS_DECLINED, {
        player_id: userId,
        tos_version: TOS_VERSION,
        ts: Date.now(),
      });
    }
    if (typeof onDeclined === 'function') onDeclined();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center font-mono overflow-y-auto"
      style={{ background: '#060a12' }}
    >
      <RitualBackdrop density="subtle" />

      <div className="relative z-10 w-full max-w-xl px-4 py-8">
        <div
          className="rounded-xl border p-6 sm:p-8"
          style={{
            background: 'rgba(8,12,20,0.85)',
            borderColor: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <h1
              className="font-mono text-2xl font-bold tracking-[0.28em] text-white sm:text-3xl"
              style={{ textShadow: '0 0 20px rgba(0,229,255,0.25)' }}
            >
              SUBSTRATE
            </h1>
            <p
              className="font-mono text-[9px] uppercase"
              style={{
                letterSpacing: '0.28em',
                color: 'rgba(0,229,255,0.45)',
              }}
            >
              Mode Agreement
            </p>
          </div>

          {/* Body — three short paragraphs, British English, no equity language */}
          <div className="space-y-4 text-[12px] leading-relaxed text-[#d5ddf6]/80">
            <p>
              What follows is a different kind of game. You build ventures
              with Athena. You sell to other operators and to a market that
              simulates real demand. Anything you create here belongs to
              Quadratic, per the terms of service.
            </p>
            <p>
              In exchange, your work counts. Reputation. Standing. A
              signal that travels beyond this game.
            </p>
            <p className="text-[#d5ddf6]/55 italic">
              By accepting, you confirm you have read the above and agree
              to the Quadratic terms applicable to Substrate Mode. You
              may return without entering.
            </p>
          </div>

          {/* Error */}
          {error ? (
            <p
              className="mt-4 text-[10px] text-rose-300/80"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {/* Actions */}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3">
            <button
              type="button"
              onClick={handleDecline}
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg border text-[10px] font-mono tracking-[0.2em] uppercase transition-colors"
              style={{
                background: 'rgba(8,12,20,0.6)',
                borderColor: 'rgba(255,255,255,0.10)',
                color: 'rgba(213,221,246,0.65)',
              }}
            >
              Return
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={submitting || !userId}
              className="px-5 py-2.5 rounded-lg border text-[10px] font-mono tracking-[0.2em] uppercase transition-colors"
              style={{
                background: 'rgba(0,229,255,0.10)',
                borderColor: 'rgba(0,229,255,0.30)',
                color: '#9beaff',
                opacity: submitting || !userId ? 0.5 : 1,
              }}
            >
              {submitting ? 'Recording…' : 'Accept'}
            </button>
          </div>

          {!userId ? (
            <p className="mt-3 text-[9px] text-[#d5ddf6]/40 text-center font-mono uppercase tracking-[0.18em]">
              Sign in to enter
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
