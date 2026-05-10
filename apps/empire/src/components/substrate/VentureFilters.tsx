/**
 * VentureFilters.tsx — extracted filter bar for the Venture List.
 *
 * Per AEGIS_BUILD_SPEC.md §5.2 + Phase 1 build brief task C.
 *
 * Phase 1 separates the filter UI from `VentureList.tsx` so callers can
 * pass alternate filter sets (e.g. for the Discover tab in the
 * marketplace, which reuses the same atmospheric register). Domain
 * checkboxes, target_buyer toggle, sort selector.
 *
 * British English. No academy_*.
 */

import type { ChangeEvent } from 'react';

export type VentureSortKey = 'difficulty' | 'eta' | 'popularity';
export type BuyerFilterValue = 'all' | 'B2B' | 'B2C' | 'BOTH';

export interface VentureFiltersValue {
  domain: string;
  buyer: BuyerFilterValue;
  sort: VentureSortKey;
}

export interface VentureFiltersProps {
  domains: string[];
  value: VentureFiltersValue;
  onChange: (next: VentureFiltersValue) => void;
}

export default function VentureFilters({ domains, value, onChange }: VentureFiltersProps) {
  function set<K extends keyof VentureFiltersValue>(k: K, v: VentureFiltersValue[K]) {
    onChange({ ...value, [k]: v });
  }

  return (
    <div className="flex flex-wrap gap-2 text-[10px] font-mono">
      <label className="flex items-center gap-2">
        <span className="uppercase tracking-[0.14em] text-[#d5ddf6]/40">Domain</span>
        <select
          value={value.domain}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => set('domain', e.target.value)}
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
          value={value.buyer}
          onChange={(e) => set('buyer', e.target.value as BuyerFilterValue)}
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
          value={value.sort}
          onChange={(e) => set('sort', e.target.value as VentureSortKey)}
          className="bg-[#060a12] border border-white/[0.08] rounded px-2 py-1 text-[#d5ddf6]/80"
        >
          <option value="popularity">Popularity</option>
          <option value="difficulty">Difficulty</option>
          <option value="eta">ETA to MVP</option>
        </select>
      </label>
    </div>
  );
}
