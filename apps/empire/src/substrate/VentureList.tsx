/**
 * substrate/VentureList.tsx — Venture List for Substrate Mode (Phase 1).
 *
 * Per AEGIS_BUILD_SPEC.md §5.2 + the Phase 1 build brief task C:
 *
 *   - **List items, NOT card-board UI** (§5.2). AEGIS already has a
 *     collectible card system for agent cards; ventures are a different
 *     primitive — opportunities the player can adopt — and must NOT be
 *     rendered with card-game styling.
 *
 *   - **Qualitative-first surfacing.** Difficulty 1..5 reads as
 *     "Light"..."Daunting"; n_already_developing reads as "Empty" /
 *     "Quiet" / "Active" / "Crowded". Numeric values live behind a
 *     details expansion (`<DetailPanel />`).
 *
 *   - **Filters**: domain dropdown + target_buyer toggle.
 *   - **Sort**: difficulty | ETA | popularity.
 *   - **Click an item** → opens detail panel with full description,
 *     market summary, top objections, implementation pieces, win
 *     conditions, and an [ADOPT] CTA.
 *
 * British English. No Academy / ECFL imports.
 */

import { useMemo, useState } from 'react';
import type { VentureSpec } from './types';
import { MOCK_VENTURES, type MockVentureRecord } from './data/mockVentures';
import AdoptFlow from './AdoptFlow';

// ── Qualitative mapping helpers (§5.2) ─────────────────────────────

const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'Light',
  2: 'Moderate',
  3: 'Demanding',
  4: 'Heavy',
  5: 'Daunting',
};

function formatPopularity(n: number): string {
  if (n <= 0) return 'Empty';
  if (n <= 3) return 'Quiet';
  if (n <= 12) return 'Active';
  return 'Crowded';
}

function formatStartingCapital(n: number): string {
  if (n >= 100_000) return `€${Math.round(n / 1000)}k`;
  return `€${n.toLocaleString('en-GB')}`;
}

function formatEta(days: number): string {
  if (days <= 21) return `~${days}d`;
  const weeks = Math.round(days / 7);
  return `~${weeks}w`;
}

function targetBuyerLabel(t: VentureSpec['target_buyer']): string {
  if (t === 'B2B') return 'For businesses';
  if (t === 'B2C') return 'For people';
  return 'Both';
}

// ── Sort + filter types ────────────────────────────────────────────

type SortKey = 'difficulty' | 'eta' | 'popularity';
type BuyerFilter = 'all' | 'B2B' | 'B2C' | 'BOTH';

// ── Component ──────────────────────────────────────────────────────

export interface VentureListProps {
  /** Player + company context — required by [ADOPT] flow. */
  player_id: string;
  company_id: string;
  /** Optional override for the source venture set. */
  ventures?: ReadonlyArray<MockVentureRecord>;
  /** Called after a successful adopt so the parent can route to Athena. */
  onAdopted?: (params: { attempt_id: string; venture_id: string }) => void;
}

export default function VentureList({
  player_id,
  company_id,
  ventures = MOCK_VENTURES,
  onAdopted,
}: VentureListProps) {
  const [domain, setDomain] = useState<string>('all');
  const [buyer, setBuyer] = useState<BuyerFilter>('all');
  const [sort, setSort] = useState<SortKey>('popularity');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adopting, setAdopting] = useState<MockVentureRecord | null>(null);

  const domains = useMemo(() => {
    const set = new Set<string>();
    for (const v of ventures) set.add(v.spec.source.domain);
    return Array.from(set).sort();
  }, [ventures]);

  const filtered = useMemo(() => {
    let out = [...ventures];
    if (domain !== 'all') {
      out = out.filter((v) => v.spec.source.domain === domain);
    }
    if (buyer !== 'all') {
      out = out.filter((v) => v.spec.target_buyer === buyer);
    }
    switch (sort) {
      case 'difficulty':
        out.sort((a, b) => a.spec.difficulty - b.spec.difficulty);
        break;
      case 'eta':
        out.sort((a, b) => a.spec.target_eta_mvp_days - b.spec.target_eta_mvp_days);
        break;
      case 'popularity':
        out.sort((a, b) => b.n_already_developing - a.n_already_developing);
        break;
    }
    return out;
  }, [ventures, domain, buyer, sort]);

  const selected = useMemo(
    () => (selectedId ? ventures.find((v) => v.spec.venture_id === selectedId) ?? null : null),
    [ventures, selectedId],
  );

  return (
    <div className="flex flex-col gap-4 text-[#d5ddf6]/80 font-mono">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h2
          className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] uppercase text-[#9beaff]"
          style={{ textShadow: '0 0 16px rgba(155,234,255,0.18)' }}
        >
          New Ventures
        </h2>
        <span className="text-[9px] uppercase tracking-[0.18em] text-[#d5ddf6]/40">
          Substrate · weekly drop
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        <label className="flex items-center gap-2">
          <span className="uppercase tracking-[0.14em] text-[#d5ddf6]/40">Domain</span>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="bg-[#060a12] border border-white/[0.08] rounded px-2 py-1 text-[#d5ddf6]/80"
          >
            <option value="all">All</option>
            {domains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="uppercase tracking-[0.14em] text-[#d5ddf6]/40">Buyer</span>
          <select
            value={buyer}
            onChange={(e) => setBuyer(e.target.value as BuyerFilter)}
            className="bg-[#060a12] border border-white/[0.08] rounded px-2 py-1 text-[#d5ddf6]/80"
          >
            <option value="all">All</option>
            <option value="B2B">B2B</option>
            <option value="B2C">B2C</option>
            <option value="BOTH">Both</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="uppercase tracking-[0.14em] text-[#d5ddf6]/40">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="bg-[#060a12] border border-white/[0.08] rounded px-2 py-1 text-[#d5ddf6]/80"
          >
            <option value="popularity">Popularity</option>
            <option value="difficulty">Difficulty</option>
            <option value="eta">ETA to MVP</option>
          </select>
        </label>
      </div>

      {/* List items (NOT cards) */}
      <ul className="flex flex-col gap-2">
        {filtered.map((rec) => {
          const v = rec.spec;
          const isSelected = selectedId === v.venture_id;
          return (
            <li
              key={v.venture_id}
              role="button"
              aria-expanded={isSelected}
              onClick={() => setSelectedId(isSelected ? null : v.venture_id)}
              className="border rounded-md px-3 py-3 cursor-pointer transition-colors"
              style={{
                background: isSelected ? 'rgba(155,234,255,0.05)' : 'rgba(8,12,20,0.6)',
                borderColor: isSelected ? 'rgba(155,234,255,0.25)' : 'rgba(255,255,255,0.06)',
              }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] text-[#d5ddf6]/90 leading-snug">{v.pitch}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAdopting(rec);
                  }}
                  className="shrink-0 px-3 py-1 rounded border text-[9px] font-mono tracking-[0.2em] uppercase"
                  style={{
                    background: 'rgba(0,229,255,0.08)',
                    borderColor: 'rgba(0,229,255,0.30)',
                    color: '#9beaff',
                  }}
                >
                  Adopt
                </button>
              </div>

              {/* Qualitative meta row */}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#d5ddf6]/55 uppercase tracking-[0.12em]">
                <span>{targetBuyerLabel(v.target_buyer)}</span>
                <span>{DIFFICULTY_LABEL[v.difficulty] ?? '—'}</span>
                <span>{formatStartingCapital(v.starting_capital)}</span>
                <span>{formatEta(v.target_eta_mvp_days)}</span>
                <span>{formatPopularity(rec.n_already_developing)}</span>
              </div>

              {/* Detail panel */}
              {isSelected ? (
                <div className="mt-3 border-t border-white/[0.06] pt-3 flex flex-col gap-3 text-[11px] text-[#d5ddf6]/75 leading-relaxed">
                  <p>{v.description}</p>
                  <p className="text-[#d5ddf6]/60">
                    <span className="text-[9px] uppercase tracking-[0.14em] text-[#d5ddf6]/40">
                      Market — &nbsp;
                    </span>
                    {v.market_summary}
                  </p>
                  {v.top_objections.length ? (
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.14em] text-[#d5ddf6]/40 mb-1">
                        Likely objections
                      </p>
                      <ul className="list-disc list-inside text-[#d5ddf6]/65 space-y-1">
                        {v.top_objections.map((obj, i) => (
                          <li key={i}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-1">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-[#d5ddf6]/40">
                      Required pieces
                    </p>
                    <ul className="list-disc list-inside text-[#d5ddf6]/65 space-y-1">
                      {v.implementation_pieces_required.map((p, i) => (
                        <li key={i}>
                          <span className="uppercase text-[#9beaff]/80 tracking-[0.10em]">{p.kind}</span>
                          : {p.purpose}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {v.implementation_pieces_optional.length ? (
                    <div className="flex flex-col gap-1">
                      <p className="text-[9px] uppercase tracking-[0.14em] text-[#d5ddf6]/40">
                        Optional pieces
                      </p>
                      <ul className="list-disc list-inside text-[#d5ddf6]/55 space-y-1">
                        {v.implementation_pieces_optional.map((p, i) => (
                          <li key={i}>
                            <span className="uppercase text-[#d5ddf6]/55 tracking-[0.10em]">{p.kind}</span>
                            : {p.purpose}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-1">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-[#d5ddf6]/40">
                      Win conditions
                    </p>
                    <ul className="list-disc list-inside text-[#d5ddf6]/65 space-y-1">
                      {v.win_conditions.first_revenue_within_days ? (
                        <li>First revenue within {v.win_conditions.first_revenue_within_days} days.</li>
                      ) : null}
                      {v.win_conditions.survive_days ? (
                        <li>Stay operational for {v.win_conditions.survive_days} days.</li>
                      ) : null}
                      {v.win_conditions.profitability_ratio_target ? (
                        <li>
                          Reach a profitability ratio of {v.win_conditions.profitability_ratio_target.toFixed(2)}.
                        </li>
                      ) : null}
                    </ul>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAdopting(rec);
                      }}
                      className="px-4 py-2 rounded border text-[10px] font-mono tracking-[0.22em] uppercase"
                      style={{
                        background: 'rgba(0,229,255,0.10)',
                        borderColor: 'rgba(0,229,255,0.32)',
                        color: '#9beaff',
                      }}
                    >
                      Adopt this venture
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 ? (
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#d5ddf6]/40 text-center py-4">
          No ventures match these filters.
        </p>
      ) : null}

      {/* Adopt flow modal */}
      {adopting ? (
        <AdoptFlow
          record={adopting}
          player_id={player_id}
          company_id={company_id}
          onClose={() => setAdopting(null)}
          onAdopted={(result) => {
            setAdopting(null);
            // Optionally collapse the detail panel.
            setSelectedId(null);
            void selected;
            onAdopted?.(result);
          }}
        />
      ) : null}
    </div>
  );
}
