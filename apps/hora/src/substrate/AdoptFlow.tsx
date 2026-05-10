/**
 * substrate/AdoptFlow.tsx — modal for the [ADOPT] action.
 *
 * Per AEGIS_BUILD_SPEC.md §5.3 and the Phase 1 build brief task D:
 *
 *   - Opens when the player clicks [ADOPT] on a `<VentureList />` row.
 *   - Shows the venture summary, asks for capital allocation in
 *     Substrate currency (slider min: starting_capital, max: walletBalance).
 *   - On confirm:
 *       1. Debit walletBalance via the substrate store.
 *       2. Create a `VentureAttempt` row (substrateStore.adoptVenture).
 *       3. Emit `venture_adopted` telemetry per §12.1.
 *       4. Close, hand control back so the parent can route to the
 *          Athena Substrate panel scoped to the new attempt.
 *
 *   - "Insufficient runway" disabled state when balance < starting_capital.
 *
 * British English. No academy_* / ecfl_* references.
 */

import { useMemo, useState } from 'react';
import type { MockVentureRecord } from './data/mockVentures';
import type { VentureAttempt } from './types';
import { useSubstrateStore } from '../store/substrateStore';
import { emit, SUBSTRATE_EVENTS } from './telemetry/events';

export interface AdoptFlowProps {
  record: MockVentureRecord;
  player_id: string;
  company_id: string;
  onClose: () => void;
  onAdopted: (result: { attempt_id: string; venture_id: string }) => void;
}

function formatEuro(n: number): string {
  if (n >= 100_000) return `€${(n / 1000).toFixed(0)}k`;
  return `€${n.toLocaleString('en-GB')}`;
}

export default function AdoptFlow({
  record,
  player_id,
  company_id,
  onClose,
  onAdopted,
}: AdoptFlowProps) {
  const v = record.spec;
  const balance = useSubstrateStore((s) => s.substrateBalance);
  const adoptVenture = useSubstrateStore((s) => s.adoptVenture);

  const minCapital = v.starting_capital;
  const maxCapital = Math.max(minCapital, Math.floor(balance));

  const insufficient = balance < minCapital;

  const [capital, setCapital] = useState<number>(() => Math.min(maxCapital, minCapital));
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sliderStep = useMemo(() => {
    const range = Math.max(1, maxCapital - minCapital);
    return Math.max(1_000, Math.floor(range / 50));
  }, [minCapital, maxCapital]);

  async function onConfirm() {
    if (insufficient) return;
    setConfirming(true);
    setError(null);
    try {
      const attempt: VentureAttempt = adoptVenture({
        venture_id: v.venture_id,
        player_id,
        company_id,
        starting_capital: capital,
      });

      // Telemetry per §12.1.
      void emit(SUBSTRATE_EVENTS.VENTURE_ADOPTED, {
        venture_id: v.venture_id,
        player_id,
        company_id,
        starting_capital: capital,
      });

      onAdopted({ attempt_id: attempt.attempt_id, venture_id: v.venture_id });
    } catch (err) {
      setError((err as Error)?.message ?? 'Adopt failed.');
      setConfirming(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Adopt ${v.pitch}`}
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 font-mono"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full rounded-md border p-5 flex flex-col gap-4"
        style={{
          background: 'rgba(8,12,20,0.92)',
          borderColor: 'rgba(155,234,255,0.18)',
          boxShadow: '0 0 32px rgba(155,234,255,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-baseline justify-between gap-3">
          <span className="text-[9px] uppercase tracking-[0.28em] text-[#9beaff]">
            Adopt venture
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[#d5ddf6]/40 hover:text-[#d5ddf6]/80 text-[14px] leading-none"
          >
            ×
          </button>
        </header>

        <div className="flex flex-col gap-2">
          <p className="text-[12px] text-[#d5ddf6]/85 leading-snug">{v.pitch}</p>
          <p className="text-[10px] text-[#d5ddf6]/55 leading-relaxed">{v.description}</p>
        </div>

        <div className="border-t border-white/[0.06]" />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="uppercase tracking-[0.16em] text-[#d5ddf6]/45">Wallet</span>
            <span className="text-[#d5ddf6]/85">{formatEuro(balance)}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="uppercase tracking-[0.16em] text-[#d5ddf6]/45">Suggested floor</span>
            <span className="text-[#d5ddf6]/85">{formatEuro(minCapital)}</span>
          </div>
        </div>

        {insufficient ? (
          <div
            className="rounded border px-3 py-2 text-[10px] leading-relaxed"
            style={{
              borderColor: 'rgba(244,114,182,0.30)',
              background: 'rgba(244,114,182,0.06)',
              color: '#fbcfe8',
            }}
          >
            Insufficient runway. The suggested capital floor for this
            venture is {formatEuro(minCapital)}, but your wallet holds{' '}
            {formatEuro(balance)}. Adopt a smaller venture, or build up
            your runway first.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="flex items-center justify-between text-[10px]">
              <span className="uppercase tracking-[0.16em] text-[#d5ddf6]/45">Allocate</span>
              <span className="text-[#9beaff]">{formatEuro(capital)}</span>
            </label>
            <input
              aria-label="Capital allocation"
              type="range"
              min={minCapital}
              max={maxCapital}
              step={sliderStep}
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[9px] text-[#d5ddf6]/40 leading-relaxed">
              Capital is debited from your Substrate wallet on confirm.
              Higher allocations buy more runway against operating costs;
              lower allocations leave more for pivots later.
            </p>
          </div>
        )}

        {error ? (
          <p className="text-[10px] text-rose-300">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border text-[10px] tracking-[0.2em] uppercase"
            style={{
              borderColor: 'rgba(255,255,255,0.10)',
              color: '#d5ddf6',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={insufficient || confirming}
            className="px-4 py-2 rounded border text-[10px] tracking-[0.22em] uppercase disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(0,229,255,0.10)',
              borderColor: 'rgba(0,229,255,0.32)',
              color: '#9beaff',
            }}
          >
            {confirming ? 'Adopting…' : 'Confirm adopt'}
          </button>
        </div>
      </div>
    </div>
  );
}
