import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AP_BUNDLES } from '../data/agentCards';
import {
  CARD_CATALOG,
  PACK_TYPES,
  RARITY_CONFIG,
  getCardById,
  getCardsByRarity,
  type CardRarity,
  type CatalogCard,
} from '../data/cardCatalog';

// ── Types ────────────────────────────────────────────────────────

export interface OwnedCard {
  cardId: string;
  count: number;
  level: number;
}

export interface MarketplaceListing {
  id: string;
  cardId: string;
  price: number;
  listedAt: number;
}

interface CardEconomyState {
  // State
  aegisPoints: number;
  totalAegisPointsEarned: number;
  ownedCards: Record<string, OwnedCard>;
  pityCounter: number;
  marketplaceListings: MarketplaceListing[];

  // Actions
  awardAegisPoints: (amount: number, source?: string) => void;
  spendAegisPoints: (amount: number) => boolean;
  buyAegisPointsBundle: (bundleId: string) => boolean;
  openPack: (packTypeId: string) => string[];
  upgradeCard: (cardId: string) => boolean;
  listOnMarketplace: (cardId: string, price: number) => void;
  buyFromMarketplace: (listingId: string) => boolean;
  quickSell: (cardId: string) => number;
}

// ── RNG helpers ──────────────────────────────────────────────────

const RARITY_ORDER: CardRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

/**
 * Pick a rarity using weighted RNG.
 * Supports soft pity (after 60 packs, +2% Legendary per pack)
 * and hard pity (pack 90 = guaranteed Legendary).
 */
function rollRarity(pityCounter: number): CardRarity {
  // Hard pity at 90
  if (pityCounter >= 90) return 'Legendary';

  // Build adjusted weights
  const weights = { ...RARITY_CONFIG };
  let legendaryBonus = 0;
  if (pityCounter >= 60) {
    legendaryBonus = (pityCounter - 60) * 2; // +2% per pack past 60
  }

  const totalBase = RARITY_ORDER.reduce((s, r) => s + weights[r].weight, 0);
  const adjustedTotal = totalBase + legendaryBonus;

  const roll = Math.random() * adjustedTotal;
  let cumulative = 0;

  // Walk from Common up; Legendary gets the bonus
  for (const rarity of RARITY_ORDER) {
    let w = weights[rarity].weight;
    if (rarity === 'Legendary') w += legendaryBonus;
    cumulative += w;
    if (roll < cumulative) return rarity;
  }

  return 'Common'; // fallback
}

/** Pick a random card of a given rarity. */
function pickRandomCard(rarity: CardRarity): CatalogCard {
  const pool = getCardsByRarity(rarity);
  if (pool.length === 0) {
    // Fallback to any card if pool somehow empty
    return CARD_CATALOG[Math.floor(Math.random() * CARD_CATALOG.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Generate a unique listing ID. */
function uid(): string {
  return `lst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Store ────────────────────────────────────────────────────────

export const useCardEconomyStore = create<CardEconomyState>()(
  persist(
    (set, get) => ({
      // ── Initial state ────────────────────────────────────────
      aegisPoints: 600,           // Starter bonus AP
      totalAegisPointsEarned: 600,
      ownedCards: {},
      pityCounter: 0,
      marketplaceListings: [],

      // ── awardAegisPoints ──────────────────────────────────────
      awardAegisPoints: (amount, _source?) => {
        // Bonus RNG: 15% chance 2x, 5% chance 4x
        const roll = Math.random();
        let multiplier = 1;
        if (roll < 0.05) {
          multiplier = 4;
        } else if (roll < 0.20) {
          // 0.05..0.20 = 15% band
          multiplier = 2;
        }
        const total = amount * multiplier;
        set(s => ({
          aegisPoints: s.aegisPoints + total,
          totalAegisPointsEarned: s.totalAegisPointsEarned + total,
        }));
      },

      // ── spendAegisPoints ──────────────────────────────────────
      spendAegisPoints: (amount) => {
        const { aegisPoints } = get();
        if (aegisPoints < amount) return false;
        set({ aegisPoints: aegisPoints - amount });
        return true;
      },

      buyAegisPointsBundle: (bundleId) => {
        // Simulated purchase — in a real game this would go through a payment processor
        const bundle = AP_BUNDLES.find(b => b.id === bundleId);
        if (!bundle) return false;
        set(s => ({
          aegisPoints: s.aegisPoints + bundle.ap,
          totalAegisPointsEarned: s.totalAegisPointsEarned + bundle.ap,
        }));
        return true;
      },

      // ── openPack ─────────────────────────────────────────────
      openPack: (packTypeId) => {
        const pack = PACK_TYPES[packTypeId];
        if (!pack) return [];

        const state = get();
        // Check cost
        if (pack.cost > 0 && state.aegisPoints < pack.cost) return [];

        let pity = state.pityCounter;
        const pulledIds: string[] = [];
        const newOwned = { ...state.ownedCards };

        const addCard = (card: CatalogCard) => {
          pulledIds.push(card.id);
          const existing = newOwned[card.id];
          if (existing) {
            newOwned[card.id] = { ...existing, count: existing.count + 1 };
          } else {
            newOwned[card.id] = { cardId: card.id, count: 1, level: 1 };
          }
          // Reset pity on Legendary
          if (card.rarity === 'Legendary') {
            pity = 0;
          }
        };

        // Fill guaranteed slots first
        let remainingSlots = pack.cardCount;

        if (pack.guaranteedSlots) {
          for (const slot of pack.guaranteedSlots) {
            for (let i = 0; i < slot.count; i++) {
              const card = pickRandomCard(slot.rarity);
              addCard(card);
              remainingSlots--;
            }
          }
        } else if (pack.guaranteedRarity) {
          const card = pickRandomCard(pack.guaranteedRarity);
          addCard(card);
          remainingSlots--;
        }

        // Fill remaining slots with weighted RNG
        for (let i = 0; i < remainingSlots; i++) {
          pity++;
          const rarity = rollRarity(pity);
          const card = pickRandomCard(rarity);
          addCard(card);
        }

        set({
          aegisPoints: state.aegisPoints - pack.cost,
          ownedCards: newOwned,
          pityCounter: pity,
        });

        return pulledIds;
      },

      // ── upgradeCard ──────────────────────────────────────────
      upgradeCard: (cardId) => {
        const { ownedCards } = get();
        const owned = ownedCards[cardId];
        if (!owned || owned.count < 3) return false;

        set({
          ownedCards: {
            ...ownedCards,
            [cardId]: {
              ...owned,
              count: owned.count - 3,
              level: owned.level + 1,
            },
          },
        });
        return true;
      },

      // ── listOnMarketplace ────────────────────────────────────
      listOnMarketplace: (cardId, price) => {
        const { ownedCards, marketplaceListings } = get();
        const owned = ownedCards[cardId];
        if (!owned || owned.count < 1) return;

        const listing: MarketplaceListing = {
          id: uid(),
          cardId,
          price,
          listedAt: Date.now(),
        };

        set({
          ownedCards: {
            ...ownedCards,
            [cardId]: { ...owned, count: owned.count - 1 },
          },
          marketplaceListings: [...marketplaceListings, listing],
        });
      },

      // ── buyFromMarketplace ───────────────────────────────────
      buyFromMarketplace: (listingId) => {
        const { aegisPoints, ownedCards, marketplaceListings } = get();
        const listing = marketplaceListings.find(l => l.id === listingId);
        if (!listing) return false;

        const totalCost = Math.ceil(listing.price * 1.05); // 5% fee
        if (aegisPoints < totalCost) return false;

        const existing = ownedCards[listing.cardId];
        const updatedOwned = {
          ...ownedCards,
          [listing.cardId]: existing
            ? { ...existing, count: existing.count + 1 }
            : { cardId: listing.cardId, count: 1, level: 1 },
        };

        set({
          aegisPoints: aegisPoints - totalCost,
          ownedCards: updatedOwned,
          marketplaceListings: marketplaceListings.filter(l => l.id !== listingId),
        });
        return true;
      },

      // ── quickSell ────────────────────────────────────────────
      quickSell: (cardId) => {
        const { ownedCards, aegisPoints } = get();
        const owned = ownedCards[cardId];
        if (!owned || owned.count < 1) return 0;

        const catalog = getCardById(cardId);
        if (!catalog) return 0;

        const value = RARITY_CONFIG[catalog.rarity].quickSellValue;

        set({
          aegisPoints: aegisPoints + value,
          ownedCards: {
            ...ownedCards,
            [cardId]: { ...owned, count: owned.count - 1 },
          },
        });
        return value;
      },
    }),
    {
      name: 'empire-card-economy',
      version: 1,
    }
  )
);
