/**
 * Hora — treasury state.
 *
 * The heart of Hora's idle-game loop:
 *   - Income accrues at a per-second rate based on collector level
 *   - Cap prevents infinite hoarding (player must come back)
 *   - Tap to collect → accrued moves to total, lastCollectedAt resets
 *   - Upgrade the collector to raise both rate and cap
 *
 * State persists to localStorage. Supabase sync is a later concern;
 * for v1 the device is the source of truth and that's enough for an
 * idle game.
 *
 * British English. No academy_*.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface TreasuryState {
  /** Lifetime gold (not currently claimable — this is the wallet). */
  total: number;
  /** Collector level. Drives rate + cap + upgrade cost. */
  level: number;
  /** Timestamp (ms) of the last collect — used to compute accrued income. */
  lastCollectedAt: number;
  /** Lifetime collects — counter for missions / achievements (future). */
  totalCollects: number;

  // Derived getters
  ratePerSec: () => number;
  cap: () => number;
  upgradeCost: () => number;
  accruedSince: (now: number) => number;

  // Actions
  collect: () => number; // returns gold collected this tap
  upgrade: () => boolean; // returns true if successful
  reset: () => void;
}

// Tuning — every value here is exposed so they're easy to playtest.
const BASE_RATE_PER_SEC = 1;       // L1: 1 gold/sec
const BASE_CAP = 100;              // L1: 100 gold max
const BASE_UPGRADE_COST = 100;
const RATE_MULT_PER_LEVEL = 1.5;
const CAP_MULT_PER_LEVEL = 1.5;
const UPGRADE_COST_MULT_PER_LEVEL = 2;

export const useTreasuryStore = create<TreasuryState>()(
  persist(
    (set, get) => ({
      total: 0,
      level: 1,
      lastCollectedAt: Date.now(),
      totalCollects: 0,

      ratePerSec: () => BASE_RATE_PER_SEC * Math.pow(RATE_MULT_PER_LEVEL, get().level - 1),
      cap: () => Math.round(BASE_CAP * Math.pow(CAP_MULT_PER_LEVEL, get().level - 1)),
      upgradeCost: () => Math.round(BASE_UPGRADE_COST * Math.pow(UPGRADE_COST_MULT_PER_LEVEL, get().level - 1)),

      accruedSince: (now) => {
        const s = (now - get().lastCollectedAt) / 1000;
        const raw = Math.max(0, s) * get().ratePerSec();
        return Math.min(raw, get().cap());
      },

      collect: () => {
        const now = Date.now();
        const amount = Math.floor(get().accruedSince(now));
        if (amount <= 0) return 0;
        set({
          total: get().total + amount,
          lastCollectedAt: now,
          totalCollects: get().totalCollects + 1,
        });
        return amount;
      },

      upgrade: () => {
        const cost = get().upgradeCost();
        if (get().total < cost) return false;
        set({
          total: get().total - cost,
          level: get().level + 1,
        });
        return true;
      },

      reset: () => set({
        total: 0,
        level: 1,
        lastCollectedAt: Date.now(),
        totalCollects: 0,
      }),
    }),
    {
      name: 'hora-treasury-v1',
      storage: createJSONStorage(() => localStorage),
      // Only persist primitives; the getters/actions are reconstructed
      partialize: (s) => ({
        total: s.total,
        level: s.level,
        lastCollectedAt: s.lastCollectedAt,
        totalCollects: s.totalCollects,
      }),
    },
  ),
);
