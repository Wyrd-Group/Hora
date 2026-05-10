/**
 * substrate/index.tsx — Substrate Mode root view (Phase 1).
 *
 * Per AEGIS_BUILD_SPEC.md §5.1 + Phase 1 build brief task O. Phase 1
 * unlocks the surface end-to-end: ToS gate → first-grant credit →
 * tabs (Ventures, My Ventures, Marketplace, Athena).
 *
 * Behaviour:
 *   1. On mount, emit `mode_entered_substrate` for telemetry per §12.1.
 *   2. If no row in `substrate_tos_acceptances`, render the
 *      `<SubstrateTosInterstitial />`.
 *   3. Otherwise, apply the first-time €50K grant (idempotent), and
 *      render the Phase 1 tabbed surface.
 *
 * Firewall reminder (§4.1): no Academy/ECFL imports anywhere.
 * British English in any new copy.
 */

import { useEffect, useMemo, useState } from 'react';
import RitualBackdrop from '../components/shared/RitualBackdrop';
import SubstrateTosInterstitial from '../components/substrate/SubstrateTosInterstitial';
import VentureList from './VentureList';
import Marketplace from '../components/substrate/Marketplace';
import AthenaSubstratePanel from '../components/substrate/AthenaSubstratePanel';
import { useAuthStore } from '../store/authStore';
import { useSubstrateStore } from '../store/substrateStore';
import { supabase } from '../lib/supabase';
import { emit, SUBSTRATE_EVENTS } from './telemetry/events';
import { getVentureById } from './data/ventureProvider';
import type { MockVentureRecord } from './data/mockVentures';
import type { SubstratePhase1Tab } from './types';

interface SubstrateProps {
  onBack?: () => void;
}

function useTosAcceptance(userId: string | null | undefined): boolean | null {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setAccepted(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('substrate_tos_acceptances')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          // eslint-disable-next-line no-console
          console.warn('[Substrate] ToS lookup failed:', error.message);
          setAccepted(false);
          return;
        }
        setAccepted(!!data);
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('[Substrate] ToS lookup threw:', (err as Error)?.message);
        setAccepted(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return accepted;
}

const TABS: ReadonlyArray<{ key: SubstratePhase1Tab; label: string }> = [
  { key: 'ventures', label: 'Ventures' },
  { key: 'my_ventures', label: 'My ventures' },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'athena', label: 'Athena' },
];

export default function Substrate({ onBack }: SubstrateProps) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;
  const tosAccepted = useTosAcceptance(userId);

  const applyFirstGrantIfMissing = useSubstrateStore((s) => s.applyFirstGrantIfMissing);
  const balance = useSubstrateStore((s) => s.substrateBalance);
  const myVentures = useSubstrateStore((s) => s.myVentures);
  const currentVenture = useSubstrateStore((s) => s.currentVenture);
  const setCurrentVenture = useSubstrateStore((s) => s.setCurrentVenture);
  const setStoreTosAccepted = useSubstrateStore((s) => s.setTosAccepted);

  const [tab, setTab] = useState<SubstratePhase1Tab>('ventures');
  const [currentVentureSpec, setCurrentVentureSpec] = useState<MockVentureRecord | null>(null);

  // Telemetry on mount.
  useEffect(() => {
    if (!userId) return;
    void emit(SUBSTRATE_EVENTS.MODE_ENTERED_SUBSTRATE, {
      player_id: userId,
      source: 'onboarding-hub',
      ts: Date.now(),
    });
  }, [userId]);

  // Apply €50K grant on first ToS-accepted entry.
  useEffect(() => {
    if (!userId || tosAccepted !== true) return;
    setStoreTosAccepted(true);
    applyFirstGrantIfMissing(userId);
  }, [userId, tosAccepted, applyFirstGrantIfMissing, setStoreTosAccepted]);

  // Hydrate the spec for the current attempt (used by Athena panel).
  useEffect(() => {
    if (!currentVenture) {
      setCurrentVentureSpec(null);
      return;
    }
    let cancelled = false;
    void getVentureById(currentVenture.venture_id).then((rec) => {
      if (!cancelled) setCurrentVentureSpec(rec ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [currentVenture]);

  const myVenturesSorted = useMemo(
    () => [...myVentures].sort((a, b) => (a.started_at < b.started_at ? 1 : -1)),
    [myVentures],
  );

  if (tosAccepted === null) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center font-mono"
        style={{ background: '#060a12' }}
      >
        <RitualBackdrop density="subtle" />
        <span className="relative z-10 text-tactical-text/40 font-mono text-[10px] tracking-[0.2em] uppercase">
          Initialising Substrate
        </span>
      </div>
    );
  }

  if (tosAccepted === false) {
    return (
      <SubstrateTosInterstitial
        onAccepted={() => {
          // Re-render path — we mirror to the store first so the next
          // tick of the ToS hook resolves true.
          setStoreTosAccepted(true);
          window.location.reload();
        }}
        onDeclined={() => {
          if (onBack) onBack();
          else window.location.reload();
        }}
      />
    );
  }

  // Phase 1 surface.
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col font-mono overflow-y-auto"
      style={{ background: '#060a12' }}
    >
      <RitualBackdrop density="subtle" />

      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-baseline gap-4">
          <h1
            className="font-mono text-[14px] font-bold tracking-[0.28em] uppercase text-white"
            style={{ textShadow: '0 0 18px rgba(0,229,255,0.20)' }}
          >
            Substrate
          </h1>
          <span className="text-[9px] uppercase tracking-[0.18em] text-[#9beaff]/55">
            Wallet · €{balance.toLocaleString('en-GB')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <nav className="flex gap-3 text-[10px] uppercase tracking-[0.18em]">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`pb-1 ${tab === t.key ? 'text-[#9beaff] border-b border-[#9beaff]' : 'text-[#d5ddf6]/50'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="text-[9px] uppercase tracking-[0.18em] text-[#d5ddf6]/40"
            >
              Back to hub
            </button>
          ) : null}
        </div>
      </header>

      <main className="relative z-10 flex-1 px-6 py-6 max-w-5xl w-full mx-auto">
        {tab === 'ventures' ? (
          <VentureList
            player_id={userId ?? 'anon'}
            company_id={`company-${userId ?? 'anon'}`}
            onAdopted={() => setTab('athena')}
          />
        ) : null}

        {tab === 'my_ventures' ? (
          <section className="flex flex-col gap-3 text-[#d5ddf6]/85">
            <h2 className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] uppercase text-[#9beaff]">
              My Ventures
            </h2>
            {myVenturesSorted.length === 0 ? (
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#d5ddf6]/40 text-center py-6">
                No ventures yet. Adopt one from the Ventures tab.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {myVenturesSorted.map((v) => (
                  <li
                    key={v.attempt_id}
                    className={`border rounded p-3 cursor-pointer ${
                      currentVenture?.attempt_id === v.attempt_id ? 'border-[#9beaff]/40' : 'border-white/[0.06]'
                    }`}
                    onClick={() => setCurrentVenture(v.attempt_id)}
                  >
                    <p className="text-[12px]">{v.venture_id}</p>
                    <p className="text-[9px] uppercase tracking-[0.18em] text-[#d5ddf6]/40">
                      Status: {v.status} · Started: {new Date(v.started_at).toLocaleDateString('en-GB')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {tab === 'marketplace' ? (
          currentVenture ? (
            <Marketplace
              ventureAttempt={{
                attempt_id: currentVenture.attempt_id,
                venture_id: currentVenture.venture_id,
                player_id: currentVenture.player_id,
                company_id: currentVenture.company_id,
              }}
            />
          ) : (
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#d5ddf6]/40 text-center py-6">
              Pick a venture from "My Ventures" to publish or browse listings.
            </p>
          )
        ) : null}

        {tab === 'athena' ? (
          currentVenture && currentVentureSpec ? (
            <AthenaSubstratePanel
              attempt={currentVenture}
              spec={currentVentureSpec.spec}
            />
          ) : (
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#d5ddf6]/40 text-center py-6">
              Adopt a venture, then return here to co-create with Athena.
            </p>
          )
        ) : null}
      </main>
    </div>
  );
}
