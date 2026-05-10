/**
 * Marketplace.tsx — Substrate marketplace UI (Phase 1).
 *
 * Per AEGIS_BUILD_SPEC.md §11 + Phase 1 build brief task F.
 *
 * Two tabs:
 *   1. "Your listings" — publish + manage listings the player owns.
 *   2. "Discover" — browse other players' + NPC listings, subscribe.
 *
 * NPC visibility: when `npcDebugView` is on (per `substrateStore`), a
 * small `[NPC]` pill appears on NPC-published listings. Otherwise the
 * marketplace renders both kinds identically — this is intentional
 * realism per §8.6.
 *
 * British English. Shared atmospheric register.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  cancel as marketCancel,
  discover,
  publishListing,
  subscribe,
  type MarketplaceListing,
  type MarketplaceSubscription,
} from '../../substrate/marketplace';
import { useSubstrateStore } from '../../store/substrateStore';
import ListingCreator, { type ListingDraft } from './ListingCreator';

type Tab = 'mine' | 'discover';

export interface MarketplaceProps {
  ventureAttempt: { attempt_id: string; venture_id: string; player_id: string; company_id: string };
}

function NpcPill() {
  return (
    <span
      className="text-[8px] uppercase tracking-[0.16em] px-1.5 py-0.5 rounded"
      style={{
        background: 'rgba(244,114,182,0.10)',
        color: '#fbcfe8',
        border: '1px solid rgba(244,114,182,0.20)',
      }}
    >
      NPC
    </span>
  );
}

export default function Marketplace({ ventureAttempt }: MarketplaceProps) {
  const [tab, setTab] = useState<Tab>('mine');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [creating, setCreating] = useState(false);
  const npcDebugView = useSubstrateStore((s) => s.npcDebugView);
  const setNpcDebugView = useSubstrateStore((s) => s.setNpcDebugView);

  async function refresh() {
    const all = await discover({});
    setListings(all);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const myListings = useMemo(
    () => listings.filter((l) => l.seller_id === ventureAttempt.player_id),
    [listings, ventureAttempt.player_id],
  );
  const otherListings = useMemo(
    () => listings.filter((l) => l.seller_id !== ventureAttempt.player_id),
    [listings, ventureAttempt.player_id],
  );

  async function handlePublish(draft: ListingDraft) {
    await publishListing({
      attempt: ventureAttempt,
      spec: draft,
      seller: { kind: 'player', id: ventureAttempt.player_id },
    });
    setCreating(false);
    await refresh();
  }

  async function handleSubscribe(listing: MarketplaceListing, tierId: string) {
    try {
      await subscribe({
        listing,
        tier: tierId,
        buyer: { kind: 'player', id: ventureAttempt.player_id, wallet: 'company' },
      });
      await refresh();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[Marketplace] subscribe failed:', (err as Error)?.message);
    }
  }

  async function handleArchive(listing: MarketplaceListing) {
    await marketCancel(
      {
        sub_id: '',
        listing_id: listing.listing_id,
        buyer_id: '',
        buyer_kind: 'player',
        buyer_wallet_kind: 'company',
        tier: '',
        started_at: '',
        canceled_at: null,
        last_settled_at: null,
        tier_price: 0,
        seller_id: listing.seller_id,
      } as MarketplaceSubscription,
      'archive',
    );
    await refresh();
  }

  return (
    <div className="flex flex-col gap-4 font-mono text-[#d5ddf6]/85">
      <header className="flex items-baseline justify-between">
        <h2 className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] uppercase text-[#9beaff]">
          Marketplace
        </h2>
        <label className="text-[9px] uppercase tracking-[0.18em] text-[#d5ddf6]/40 flex items-center gap-2">
          <input
            type="checkbox"
            checked={npcDebugView}
            onChange={(e) => setNpcDebugView(e.target.checked)}
          />
          Show NPC tag
        </label>
      </header>

      <div className="flex gap-3 text-[10px] uppercase tracking-[0.18em]">
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={`pb-1 ${tab === 'mine' ? 'text-[#9beaff] border-b border-[#9beaff]' : 'text-[#d5ddf6]/50'}`}
        >
          Your listings ({myListings.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('discover')}
          className={`pb-1 ${tab === 'discover' ? 'text-[#9beaff] border-b border-[#9beaff]' : 'text-[#d5ddf6]/50'}`}
        >
          Discover ({otherListings.length})
        </button>
      </div>

      {tab === 'mine' ? (
        <div className="flex flex-col gap-3">
          {creating ? (
            <ListingCreator
              ventureId={ventureAttempt.venture_id}
              onSubmit={handlePublish}
              onCancel={() => setCreating(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="self-start px-3 py-2 rounded border text-[10px] tracking-[0.22em] uppercase"
              style={{
                background: 'rgba(0,229,255,0.10)',
                borderColor: 'rgba(0,229,255,0.32)',
                color: '#9beaff',
              }}
            >
              + Publish new listing
            </button>
          )}
          <ul className="flex flex-col gap-2">
            {myListings.map((l) => (
              <li
                key={l.listing_id}
                className="border rounded px-3 py-2 flex justify-between items-start gap-3"
                style={{
                  background: 'rgba(8,12,20,0.6)',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex flex-col gap-1">
                  <p className="text-[12px]">{l.title}</p>
                  <p className="text-[10px] text-[#d5ddf6]/55">{l.description}</p>
                  <p className="text-[9px] uppercase tracking-[0.16em] text-[#d5ddf6]/40">
                    {l.kind} · {l.target_buyer ?? '—'} ·{' '}
                    {l.pricing_tiers.map((t) => `€${t.price}`).join(' / ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleArchive(l)}
                  className="text-[9px] uppercase tracking-[0.18em] text-[#d5ddf6]/55"
                >
                  Archive
                </button>
              </li>
            ))}
            {myListings.length === 0 ? (
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#d5ddf6]/40 text-center py-2">
                No listings yet. Publish one to enter the market.
              </p>
            ) : null}
          </ul>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {otherListings.map((l) => (
            <li
              key={l.listing_id}
              className="border rounded px-3 py-2 flex justify-between items-start gap-3"
              style={{
                background: 'rgba(8,12,20,0.6)',
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-[12px]">{l.title}</p>
                  {npcDebugView && l.seller_kind === 'npc' ? <NpcPill /> : null}
                </div>
                <p className="text-[10px] text-[#d5ddf6]/55">{l.description}</p>
                <p className="text-[9px] uppercase tracking-[0.16em] text-[#d5ddf6]/40">
                  {l.kind} · {l.target_buyer ?? '—'} ·{' '}
                  {l.pricing_tiers.map((t) => `${t.name} €${t.price}`).join(' · ')}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                {l.pricing_tiers.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => handleSubscribe(l, t.id)}
                    className="px-2 py-1 rounded border text-[9px] tracking-[0.18em] uppercase"
                    style={{
                      background: 'rgba(0,229,255,0.06)',
                      borderColor: 'rgba(0,229,255,0.20)',
                      color: '#9beaff',
                    }}
                  >
                    Subscribe · {t.name}
                  </button>
                ))}
              </div>
            </li>
          ))}
          {otherListings.length === 0 ? (
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#d5ddf6]/40 text-center py-2">
              No listings to discover. Wait for ventures to ship — or wait for the NPCs.
            </p>
          ) : null}
        </ul>
      )}
    </div>
  );
}
