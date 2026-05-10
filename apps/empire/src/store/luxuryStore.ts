import { createPersistedStore } from './createPersistedStore';
import type { LuxuryItem } from '../types/social';

// ── Owned item with extra metadata ──

export interface OwnedLuxuryItem extends LuxuryItem {
  purchasedAt: number;
  condition: number; // 0.0 - 1.0
}

// ── Store ──

interface LuxuryState {
  ownedItems: OwnedLuxuryItem[];
  totalSpent: number;
  totalMaintenancePaid: number;

  // Actions
  purchaseItem: (
    item: LuxuryItem,
    deductBalance: (amount: number) => boolean,
  ) => boolean;
  sellItem: (
    itemId: string,
    addBalance: (amount: number) => void,
  ) => boolean;
  payMaintenance: (deductBalance: (amount: number) => boolean) => number;
  degradeCondition: () => void;

  // Derived
  getMonthlyMaintenance: () => number;
  getTotalValue: () => number;
  getInfluenceBonus: () => number;
  getFollowerBonus: () => number;
}

export const useLuxuryStore = createPersistedStore<LuxuryState>(
  'luxury',
  (set, get) => ({
    ownedItems: [],
    totalSpent: 0,
    totalMaintenancePaid: 0,

    purchaseItem(item, deductBalance) {
      const state = get();
      // Check if already owned
      if (state.ownedItems.some(o => o.id === item.id)) return false;
      // Try to deduct
      if (!deductBalance(item.price)) return false;

      const owned: OwnedLuxuryItem = {
        ...item,
        purchasedAt: Date.now(),
        condition: 1.0,
      };

      set(s => ({
        ownedItems: [...s.ownedItems, owned],
        totalSpent: s.totalSpent + item.price,
      }));
      return true;
    },

    sellItem(itemId, addBalance) {
      const state = get();
      const item = state.ownedItems.find(o => o.id === itemId);
      if (!item) return false;

      const salePrice = Math.round(item.resaleValue * item.condition);
      addBalance(salePrice);

      set(s => ({
        ownedItems: s.ownedItems.filter(o => o.id !== itemId),
      }));
      return true;
    },

    payMaintenance(deductBalance) {
      const state = get();
      if (state.ownedItems.length === 0) return 0;

      // Daily maintenance = monthly / 30
      const dailyCost = state.ownedItems.reduce(
        (sum, item) => sum + Math.round(item.monthlyMaintenance / 30),
        0,
      );

      if (dailyCost <= 0) return 0;

      if (deductBalance(dailyCost)) {
        set(s => ({
          totalMaintenancePaid: s.totalMaintenancePaid + dailyCost,
        }));
        return dailyCost;
      }

      // Can't afford -- repossess most expensive item
      const sorted = [...state.ownedItems].sort((a, b) => b.price - a.price);
      if (sorted.length > 0) {
        const repossessed = sorted[0];
        set(s => ({
          ownedItems: s.ownedItems.filter(o => o.id !== repossessed.id),
        }));
      }
      return -1; // signal repossession
    },

    degradeCondition() {
      set(s => ({
        ownedItems: s.ownedItems.map(item => ({
          ...item,
          condition: Math.max(0.5, item.condition - 0.001), // slow degradation
        })),
      }));
    },

    getMonthlyMaintenance() {
      return get().ownedItems.reduce((sum, item) => sum + item.monthlyMaintenance, 0);
    },

    getTotalValue() {
      return get().ownedItems.reduce(
        (sum, item) => sum + Math.round(item.resaleValue * item.condition),
        0,
      );
    },

    getInfluenceBonus() {
      return get().ownedItems.reduce((sum, item) => sum + item.influenceBonus, 0);
    },

    getFollowerBonus() {
      return get().ownedItems.reduce((sum, item) => sum + item.followerBonus, 0);
    },
  }),
);
