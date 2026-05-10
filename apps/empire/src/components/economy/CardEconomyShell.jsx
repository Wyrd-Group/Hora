import React, { useState, useMemo } from 'react';
import { useCardEconomyStore } from '../../store/cardEconomyStore';
import AdCardInline from '../ads/AdCardInline';
import {
  CARD_CATALOG,
  PACK_TYPES,
  RARITY_CONFIG,
  getCardById,
} from '../../data/cardCatalog';

// ── Constants ────────────────────────────────────────────────────

const TABS = ['Store', 'Collection', 'Marketplace'];

const PACK_LIST = Object.values(PACK_TYPES);

const CATEGORY_ICONS = {
  Building: '\u2302',    // house
  Manager: '\u2605',     // star
  Analyst: '\u25C8',     // diamond
  Specialist: '\u2726',  // four-point star
  Wildcard: '\u2748',    // sparkle
};

// ── Sub-components ───────────────────────────────────────────────

/** Single revealed card during pack opening. */
function RevealedCard({ cardId, index }) {
  const card = getCardById(cardId);
  if (!card) return null;
  const cfg = RARITY_CONFIG[card.rarity];

  return (
    <div
      className="w-36 flex-shrink-0 bg-gradient-to-br from-[#0c1020] to-[#111827] rounded-lg p-3 flex flex-col items-center justify-center animate-card-reveal"
      style={{
        border: `2px solid ${cfg.color}66`,
        boxShadow: `0 0 24px ${cfg.glow}`,
        animationDelay: `${index * 0.15}s`,
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mb-2 font-mono"
        style={{
          backgroundColor: `${cfg.color}18`,
          color: cfg.color,
          border: `2px solid ${cfg.color}44`,
        }}
      >
        {CATEGORY_ICONS[card.category] || card.name[0]}
      </div>
      <div
        className="text-[8px] uppercase tracking-[0.18em] mb-0.5 font-mono"
        style={{ color: cfg.color }}
      >
        {card.rarity}
      </div>
      <div className="text-[11px] font-bold text-center mb-0.5 text-tactical-text font-mono leading-tight">
        {card.name}
      </div>
      <div className="text-[8px] text-tactical-text/50 mb-1.5 text-center font-mono">
        {card.category}
      </div>
      <div className="text-[8px] text-[#00e5ff] bg-[#00e5ff]/10 px-2 py-0.5 rounded-full text-center font-mono">
        +{(card.buff.value * 100).toFixed(0)}% {card.buff.type.replace(/_/g, ' ')}
      </div>
    </div>
  );
}

/** Pack card in the store. */
function PackCard({ pack, onOpen }) {
  const aegisPoints = useCardEconomyStore(s => s.aegisPoints);
  const canAfford = pack.cost === 0 || aegisPoints >= pack.cost;

  return (
    <div className="bg-[#0c1020] border border-tactical-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono tracking-widest uppercase text-[#00e5ff]">
          {pack.name}
        </span>
        <span className="text-[10px] font-mono text-tactical-text/60">
          {pack.cardCount} cards
        </span>
      </div>
      <p className="text-[10px] font-mono text-tactical-text/70 leading-relaxed">
        {pack.description}
      </p>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-[12px] font-mono font-bold text-amber-400">
          {pack.cost === 0 ? 'FREE' : `${pack.cost.toLocaleString()} Q`}
        </span>
        <button
          onClick={() => onOpen(pack.id)}
          disabled={!canAfford}
          className={`px-4 py-1.5 rounded text-[10px] font-mono tracking-widest uppercase transition-all ${
            canAfford
              ? 'bg-[#00e5ff]/15 border border-[#00e5ff]/40 text-[#00e5ff] hover:bg-[#00e5ff]/25 hover:shadow-[0_0_12px_rgba(0,229,255,0.2)]'
              : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          OPEN
        </button>
      </div>
    </div>
  );
}

/** Single card in the collection grid. */
function CollectionCard({ cardId, owned }) {
  const card = getCardById(cardId);
  const upgradeCard = useCardEconomyStore(s => s.upgradeCard);
  const quickSell = useCardEconomyStore(s => s.quickSell);
  const [flash, setFlash] = useState('');

  if (!card) return null;
  const cfg = RARITY_CONFIG[card.rarity];

  const handleUpgrade = () => {
    const ok = upgradeCard(cardId);
    setFlash(ok ? 'Upgraded!' : 'Need 3+ copies');
    setTimeout(() => setFlash(''), 1500);
  };

  const handleSell = () => {
    const val = quickSell(cardId);
    if (val > 0) setFlash(`+${val} Q`);
    setTimeout(() => setFlash(''), 1500);
  };

  return (
    <div
      className="bg-[#0c1020] rounded-lg p-3 flex flex-col gap-2 relative"
      style={{ border: `1px solid ${cfg.color}44` }}
    >
      {flash && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg z-10">
          <span className="text-[12px] font-mono text-[#00e5ff] animate-fade-in">{flash}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-mono uppercase tracking-[0.15em]" style={{ color: cfg.color }}>
          {card.rarity}
        </span>
        <span className="text-[8px] font-mono text-tactical-text/50">
          Lv.{owned.level}
        </span>
      </div>

      {/* Icon + Name */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded flex items-center justify-center text-sm font-mono"
          style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
        >
          {CATEGORY_ICONS[card.category] || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono font-bold text-tactical-text truncate">
            {card.name}
          </div>
          <div className="text-[8px] font-mono text-tactical-text/40">
            {card.category}
          </div>
        </div>
      </div>

      {/* Buff */}
      <div className="text-[8px] font-mono text-[#00e5ff]/80">
        +{(card.buff.value * 100).toFixed(0)}% {card.buff.type.replace(/_/g, ' ')}
      </div>

      {/* Count + Actions */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-tactical-border/30">
        <span className="text-[10px] font-mono text-tactical-text/70">
          x{owned.count}
        </span>
        <div className="flex gap-1.5">
          {owned.count >= 3 && (
            <button
              onClick={handleUpgrade}
              className="px-2 py-0.5 rounded text-[8px] font-mono tracking-wider uppercase bg-[#A78BFA]/15 border border-[#A78BFA]/30 text-[#A78BFA] hover:bg-[#A78BFA]/25 transition-all"
            >
              UPGRADE
            </button>
          )}
          {owned.count >= 1 && (
            <button
              onClick={handleSell}
              className="px-2 py-0.5 rounded text-[8px] font-mono tracking-wider uppercase bg-amber-400/10 border border-amber-400/30 text-amber-400 hover:bg-amber-400/20 transition-all"
            >
              SELL {RARITY_CONFIG[card.rarity].quickSellValue}Q
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Marketplace listing row. */
function ListingRow({ listing }) {
  const card = getCardById(listing.cardId);
  const buy = useCardEconomyStore(s => s.buyFromMarketplace);
  const aegisPoints = useCardEconomyStore(s => s.aegisPoints);
  const [status, setStatus] = useState('');

  if (!card) return null;
  const cfg = RARITY_CONFIG[card.rarity];
  const totalCost = Math.ceil(listing.price * 1.05);
  const canAfford = aegisPoints >= totalCost;

  const handleBuy = () => {
    const ok = buy(listing.id);
    setStatus(ok ? 'Purchased!' : 'Failed');
    setTimeout(() => setStatus(''), 1500);
  };

  return (
    <div className="flex items-center gap-3 bg-[#0c1020] border border-tactical-border/40 rounded px-3 py-2">
      <div
        className="w-7 h-7 rounded flex items-center justify-center text-xs font-mono flex-shrink-0"
        style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
      >
        {CATEGORY_ICONS[card.category] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono font-bold text-tactical-text truncate">{card.name}</div>
        <div className="text-[8px] font-mono" style={{ color: cfg.color }}>{card.rarity}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[10px] font-mono text-amber-400 font-bold">{listing.price.toLocaleString()} Q</div>
        <div className="text-[7px] font-mono text-tactical-text/40">+5% fee</div>
      </div>
      {status ? (
        <span className="text-[9px] font-mono text-[#00e5ff] w-16 text-right">{status}</span>
      ) : (
        <button
          onClick={handleBuy}
          disabled={!canAfford}
          className={`px-3 py-1 rounded text-[9px] font-mono tracking-wider uppercase transition-all flex-shrink-0 ${
            canAfford
              ? 'bg-[#00e5ff]/15 border border-[#00e5ff]/40 text-[#00e5ff] hover:bg-[#00e5ff]/25'
              : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          BUY
        </button>
      )}
    </div>
  );
}

// ── Store Tab ────────────────────────────────────────────────────

function StoreTab() {
  const openPack = useCardEconomyStore(s => s.openPack);
  const [revealedCards, setRevealedCards] = useState(null);

  const handleOpen = (packId) => {
    const ids = openPack(packId);
    if (ids.length > 0) {
      setRevealedCards(ids);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {revealedCards ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-[10px] font-mono tracking-widest uppercase text-[#00e5ff]/70">
            CARDS ACQUIRED
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            {revealedCards.map((id, i) => (
              <RevealedCard key={`${id}-${i}`} cardId={id} index={i} />
            ))}
          </div>
          <button
            onClick={() => setRevealedCards(null)}
            className="px-6 py-2 rounded text-[10px] font-mono tracking-widest uppercase bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] hover:bg-[#00e5ff]/20 transition-all"
          >
            CONTINUE
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PACK_LIST.map(pack => (
            <PackCard key={pack.id} pack={pack} onOpen={handleOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Collection Tab ───────────────────────────────────────────────

function CollectionTab() {
  const ownedCards = useCardEconomyStore(s => s.ownedCards);
  const [filter, setFilter] = useState('All');

  const categories = ['All', 'Building', 'Manager', 'Analyst', 'Specialist', 'Wildcard'];

  const sortedCards = useMemo(() => {
    const entries = Object.values(ownedCards).filter(o => o.count > 0);
    return entries
      .map(o => ({ ...o, card: getCardById(o.cardId) }))
      .filter(o => o.card && (filter === 'All' || o.card.category === filter))
      .sort((a, b) => {
        // Sort by rarity desc, then name
        const rarityOrder = { Legendary: 0, Epic: 1, Rare: 2, Uncommon: 3, Common: 4 };
        const ra = rarityOrder[a.card.rarity] ?? 5;
        const rb = rarityOrder[b.card.rarity] ?? 5;
        if (ra !== rb) return ra - rb;
        return a.card.name.localeCompare(b.card.name);
      });
  }, [ownedCards, filter]);

  const totalUnique = Object.values(ownedCards).filter(o => o.count > 0).length;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Stats bar */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono tracking-widest uppercase text-tactical-text/50">
          {totalUnique} / {CARD_CATALOG.length} CARDS
        </span>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-2.5 py-1 rounded text-[8px] font-mono tracking-wider uppercase transition-all ${
              filter === cat
                ? 'bg-[#00e5ff]/15 border border-[#00e5ff]/40 text-[#00e5ff]'
                : 'bg-white/5 border border-white/10 text-tactical-text/50 hover:text-tactical-text/70'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {sortedCards.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] font-mono text-tactical-text/30">No cards in this category</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 overflow-y-auto flex-1 pr-1">
          {sortedCards.map(o => (
            <CollectionCard key={o.cardId} cardId={o.cardId} owned={o} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Marketplace Tab ──────────────────────────────────────────────

function MarketplaceTab() {
  const listings = useCardEconomyStore(s => s.marketplaceListings);
  const ownedCards = useCardEconomyStore(s => s.ownedCards);
  const listOnMarketplace = useCardEconomyStore(s => s.listOnMarketplace);

  const [listingCardId, setListingCardId] = useState('');
  const [listingPrice, setListingPrice] = useState('');

  const sellableCards = useMemo(() => {
    return Object.values(ownedCards)
      .filter(o => o.count > 0)
      .map(o => ({ ...o, card: getCardById(o.cardId) }))
      .filter(o => o.card);
  }, [ownedCards]);

  const handleList = () => {
    const price = parseInt(listingPrice, 10);
    if (!listingCardId || !price || price <= 0) return;
    listOnMarketplace(listingCardId, price);
    setListingCardId('');
    setListingPrice('');
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* List a card */}
      <div className="bg-[#0c1020] border border-tactical-border rounded-lg p-3">
        <div className="text-[10px] font-mono tracking-widest uppercase text-[#00e5ff]/70 mb-2">
          LIST A CARD
        </div>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[8px] font-mono text-tactical-text/40 uppercase tracking-wider">Card</label>
            <select
              value={listingCardId}
              onChange={e => setListingCardId(e.target.value)}
              className="w-full mt-0.5 bg-[#060a12] border border-tactical-border rounded px-2 py-1.5 text-[10px] font-mono text-tactical-text appearance-none"
            >
              <option value="">Select card...</option>
              {sellableCards.map(o => (
                <option key={o.cardId} value={o.cardId}>
                  {o.card.name} ({o.card.rarity}) x{o.count}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="text-[8px] font-mono text-tactical-text/40 uppercase tracking-wider">Price (Q)</label>
            <input
              type="number"
              min="1"
              value={listingPrice}
              onChange={e => setListingPrice(e.target.value)}
              placeholder="500"
              className="w-full mt-0.5 bg-[#060a12] border border-tactical-border rounded px-2 py-1.5 text-[10px] font-mono text-tactical-text"
            />
          </div>
          <button
            onClick={handleList}
            disabled={!listingCardId || !listingPrice}
            className={`px-4 py-1.5 rounded text-[9px] font-mono tracking-widest uppercase transition-all ${
              listingCardId && listingPrice
                ? 'bg-amber-400/15 border border-amber-400/40 text-amber-400 hover:bg-amber-400/25'
                : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            LIST
          </button>
        </div>
      </div>

      {/* Active listings */}
      <div className="text-[10px] font-mono tracking-widest uppercase text-tactical-text/50">
        ACTIVE LISTINGS ({listings.length})
      </div>

      {listings.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] font-mono text-tactical-text/30">No active listings</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 pr-1">
          {listings.map(listing => (
            <ListingRow key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Shell ───────────────────────────────────────────────────

const CardEconomyShell = () => {
  const [activeTab, setActiveTab] = useState('Store');
  const [open, setOpen] = useState(true);
  const aegisPoints = useCardEconomyStore(s => s.aegisPoints);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-20 bg-[#060a12]/95 backdrop-blur-sm flex flex-col font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-tactical-border/40">
        <div className="flex items-center gap-4">
          <span className="text-[10px] tracking-[0.25em] uppercase text-[#00e5ff]">
            CARD ECONOMY
          </span>
          <div className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/25 rounded px-2.5 py-1">
            <span className="text-[10px] text-amber-400 font-bold">Q</span>
            <span className="text-[11px] text-amber-400 font-bold">
              {aegisPoints.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab buttons */}
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded text-[9px] tracking-widest uppercase transition-all ${
                  activeTab === tab
                    ? 'bg-[#00e5ff]/15 border border-[#00e5ff]/40 text-[#00e5ff]'
                    : 'bg-white/5 border border-white/10 text-tactical-text/50 hover:text-tactical-text/70'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Close */}
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded bg-white/5 border border-white/10 text-tactical-text/50 hover:text-white hover:bg-white/10 transition-all text-sm"
          >
            &#x2715;
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-5">
        {activeTab === 'Store' && <StoreTab />}
        {activeTab === 'Collection' && <CollectionTab />}
        {activeTab === 'Marketplace' && <MarketplaceTab />}
        <AdCardInline variant="wide" />
      </div>
    </div>
  );
};

export default CardEconomyShell;
