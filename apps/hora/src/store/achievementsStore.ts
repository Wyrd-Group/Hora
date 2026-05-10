/**
 * achievementsStore.ts — Persistent career achievement tracker.
 * Maintains cumulative stat counters and unlocked achievement IDs.
 * Stats are incremented by other stores/hooks via updateStat().
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ACHIEVEMENTS, type Achievement } from '../data/achievements';
import { useCardEconomyStore } from './cardEconomyStore';
import { useBattlePassStore } from './battlePassStore';

// ── Types ──────────────────────────────────────────────────────────

interface AchievementsState {
  // Cumulative stat counters (never reset)
  stats: Record<string, number>;
  // Unlocked achievement IDs
  unlocked: string[];
  // Notification queue (IDs of newly unlocked, not yet seen)
  notificationQueue: string[];

  // Actions
  updateStat: (key: string, value: number) => void;
  setStat: (key: string, value: number) => void;
  incrementStat: (key: string, amount?: number) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;

  // Getters
  getProgress: (achievement: Achievement) => number;
  isUnlocked: (id: string) => boolean;
}

// ── Store ──────────────────────────────────────────────────────────

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      stats: {},
      unlocked: [],
      notificationQueue: [],

      updateStat: (key: string, value: number) => {
        const state = get();
        const current = state.stats[key] ?? 0;
        // Only update if new value is higher (peak tracking)
        if (value <= current) return;
        get().setStat(key, value);
      },

      setStat: (key: string, value: number) => {
        const state = get();
        const newStats = { ...state.stats, [key]: value };
        const newUnlocked = [...state.unlocked];
        const newNotifs = [...state.notificationQueue];

        // Check all achievements for this key
        for (const ach of ACHIEVEMENTS) {
          if (ach.checkKey !== key) continue;
          if (newUnlocked.includes(ach.id)) continue;
          if (value >= ach.target) {
            newUnlocked.push(ach.id);
            newNotifs.push(ach.id);
            // Award rewards
            try {
              if (ach.reward.ap) {
                useCardEconomyStore.getState().awardAegisPoints(ach.reward.ap, `Achievement: ${ach.title}`);
              }
              if (ach.reward.bpXp) {
                useBattlePassStore.getState().awardBPXP(ach.reward.bpXp);
              }
            } catch { /* stores may not be ready */ }
          }
        }

        set({ stats: newStats, unlocked: newUnlocked, notificationQueue: newNotifs });
      },

      incrementStat: (key: string, amount: number = 1) => {
        const current = get().stats[key] ?? 0;
        get().setStat(key, current + amount);
      },

      dismissNotification: (id: string) => {
        set({ notificationQueue: get().notificationQueue.filter(n => n !== id) });
      },

      clearNotifications: () => {
        set({ notificationQueue: [] });
      },

      getProgress: (achievement: Achievement) => {
        return Math.min(get().stats[achievement.checkKey] ?? 0, achievement.target);
      },

      isUnlocked: (id: string) => {
        return get().unlocked.includes(id);
      },
    }),
    {
      name: 'empire-achievements',
      version: 1,
    },
  ),
);
