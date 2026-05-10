/**
 * ListingCreator.tsx — publish a Listing from a venture into the marketplace.
 *
 * Per AEGIS_BUILD_SPEC.md §11.1 + Phase 1 build brief task F.
 *
 * Form fields:
 *   - title
 *   - description
 *   - kind (one_time | subscription | usage_based)
 *   - pricing_tiers[] (id, name, price, accepts_wallets[])
 *   - interface_handle (optional Phase 2 field, hidden for now)
 *
 * British English. AEGIS atmospheric register (font-mono uppercase
 * tracking-widest labels, deep navy + cyan).
 */

import { useState } from 'react';
import type { ListingKind, PricingTier, WalletKind } from '../../substrate/types';

export interface ListingDraft {
  title: string;
  description: string;
  kind: ListingKind;
  pricing_tiers: PricingTier[];
  domain?: string;
  target_buyer?: 'B2B' | 'B2C' | 'BOTH';
}

export interface ListingCreatorProps {
  ventureId: string;
  onSubmit: (draft: ListingDraft) => Promise<void> | void;
  onCancel?: () => void;
}

function defaultTier(): PricingTier {
  return {
    id: `tier-${Math.random().toString(36).slice(2, 6)}`,
    name: 'Standard',
    price: 170,
    accepts_wallets: ['company'],
    description: '',
  };
}

export default function ListingCreator({ ventureId, onSubmit, onCancel }: ListingCreatorProps) {
  const [title, setTitle] = useState('Prism Signals — Standard seat');
  const [description, setDescription] = useState(
    'Cross-asset signal feed for boutique systematic desks. €170/seat/month.',
  );
  const [kind, setKind] = useState<ListingKind>('subscription');
  const [targetBuyer, setTargetBuyer] = useState<'B2B' | 'B2C' | 'BOTH'>('B2B');
  const [tiers, setTiers] = useState<PricingTier[]>([defaultTier()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateTier(idx: number, patch: Partial<PricingTier>) {
    setTiers((cur) => cur.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }

  function toggleWallet(idx: number, wallet: WalletKind) {
    setTiers((cur) =>
      cur.map((t, i) => {
        if (i !== idx) return t;
        const has = t.accepts_wallets.includes(wallet);
        return {
          ...t,
          accepts_wallets: has
            ? t.accepts_wallets.filter((w) => w !== wallet)
            : [...t.accepts_wallets, wallet],
        };
      }),
    );
  }

  function addTier() {
    setTiers((cur) => [...cur, { ...defaultTier(), name: `Tier ${cur.length + 1}` }]);
  }

  function removeTier(idx: number) {
    setTiers((cur) => (cur.length > 1 ? cur.filter((_, i) => i !== idx) : cur));
  }

  async function handleSubmit() {
    if (!title.trim() || tiers.length === 0) {
      setError('Title and at least one pricing tier are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        kind,
        pricing_tiers: tiers,
        target_buyer: targetBuyer,
      });
    } catch (err) {
      setError((err as Error)?.message ?? 'Publish failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="flex flex-col gap-4 font-mono text-[#d5ddf6]/85"
    >
      <header className="flex items-baseline justify-between">
        <h3 className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] uppercase text-[#9beaff]">
          Publish Listing
        </h3>
        <span className="text-[9px] uppercase tracking-[0.18em] text-[#d5ddf6]/40">
          Venture · {ventureId.slice(-12)}
        </span>
      </header>

      <label className="flex flex-col gap-1 text-[10px]">
        <span className="uppercase tracking-[0.18em] text-[#d5ddf6]/45">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-[#060a12] border border-white/[0.08] rounded px-2 py-1 text-[12px] text-[#d5ddf6]"
        />
      </label>

      <label className="flex flex-col gap-1 text-[10px]">
        <span className="uppercase tracking-[0.18em] text-[#d5ddf6]/45">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="bg-[#060a12] border border-white/[0.08] rounded px-2 py-1 text-[12px] text-[#d5ddf6]/85"
        />
      </label>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <label className="flex flex-col gap-1">
          <span className="uppercase tracking-[0.18em] text-[#d5ddf6]/45">Kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ListingKind)}
            className="bg-[#060a12] border border-white/[0.08] rounded px-2 py-1 text-[#d5ddf6]/85"
          >
            <option value="subscription">Subscription</option>
            <option value="one_time">One-time</option>
            <option value="usage_based">Usage-based</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="uppercase tracking-[0.18em] text-[#d5ddf6]/45">Target buyer</span>
          <select
            value={targetBuyer}
            onChange={(e) => setTargetBuyer(e.target.value as 'B2B' | 'B2C' | 'BOTH')}
            className="bg-[#060a12] border border-white/[0.08] rounded px-2 py-1 text-[#d5ddf6]/85"
          >
            <option value="B2B">B2B (companies)</option>
            <option value="B2C">B2C (people)</option>
            <option value="BOTH">Both</option>
          </select>
        </label>
      </div>

      {/* Pricing tiers */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#d5ddf6]/45">
            Pricing tiers
          </span>
          <button
            type="button"
            onClick={addTier}
            className="text-[9px] uppercase tracking-[0.18em] text-[#9beaff]"
          >
            + Add tier
          </button>
        </div>
        {tiers.map((tier, i) => (
          <div
            key={tier.id}
            className="flex flex-col gap-2 border rounded p-3 text-[11px]"
            style={{ borderColor: 'rgba(155,234,255,0.10)' }}
          >
            <div className="grid grid-cols-2 gap-2">
              <input
                aria-label={`Tier ${i + 1} name`}
                value={tier.name}
                onChange={(e) => updateTier(i, { name: e.target.value })}
                placeholder="Name"
                className="bg-[#060a12] border border-white/[0.08] rounded px-2 py-1"
              />
              <input
                aria-label={`Tier ${i + 1} price`}
                type="number"
                value={tier.price}
                onChange={(e) => updateTier(i, { price: Number(e.target.value) })}
                placeholder="Price (€)"
                className="bg-[#060a12] border border-white/[0.08] rounded px-2 py-1"
              />
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="uppercase tracking-[0.16em] text-[#d5ddf6]/40">Accepts</span>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={tier.accepts_wallets.includes('personal')}
                  onChange={() => toggleWallet(i, 'personal')}
                />
                <span>Personal (B2C)</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={tier.accepts_wallets.includes('company')}
                  onChange={() => toggleWallet(i, 'company')}
                />
                <span>Company (B2B)</span>
              </label>
              {tiers.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeTier(i)}
                  className="ml-auto text-[9px] uppercase tracking-[0.18em] text-rose-300/70"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {error ? <p className="text-[10px] text-rose-300">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-1">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 rounded border text-[10px] tracking-[0.2em] uppercase"
            style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#d5ddf6' }}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="px-3 py-2 rounded border text-[10px] tracking-[0.2em] uppercase disabled:opacity-40"
          style={{
            background: 'rgba(0,229,255,0.10)',
            borderColor: 'rgba(0,229,255,0.32)',
            color: '#9beaff',
          }}
        >
          {submitting ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </form>
  );
}
