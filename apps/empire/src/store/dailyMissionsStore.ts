/**
 * dailyMissionsStore.ts — Daily rotating mission tracker with streak system.
 * Resets each day. Tracks progress counters, completion, and consecutive-day streaks.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getDailyMissions,
  getTodayKey,
  STREAK_BONUSES,
  ALL_CLEAR_BONUS,
  type DailyMission,
} from '../data/dailyMissions';
import { useCardEconomyStore } from './cardEconomyStore';
import { useBattlePassStore } from './battlePassStore';

// ── Types ──────────────────────────────────────────────────────────

interface DailyMissionsState {
  // Current day tracking
  currentDay: string;              // "YYYY-MM-DD"
  dailyProgress: Record<string, number>;  // checkKey → accumulated value
  completedToday: string[];        // mission IDs completed today
  allClearClaimed: boolean;

  // Streak
  streak: number;
  lastCompletedDay: string;        // last day ALL 3 were cleared
  streakBonusesClaimed: number[];  // streak day thresholds already claimed

  // Actions
  ensureDay: () => void;
  incrementProgress: (checkKey: string, amount?: number) => void;
  claimMission: (missionId: string) => void;
  claimAllClear: () => void;
  claimStreakBonus: (days: number) => void;

  // Getters
  getTodayMissions: () => DailyMission[];
  isMissionComplete: (mission: DailyMission) => boolean;
  getProgressForMission: (mission: DailyMission) => number;
}

// ── Store ──────────────────────────────────────────────────────────

export const useDailyMissionsStore = create<DailyMissionsState>()(
  persist(
    (set, get) => ({
      currentDay: getTodayKey(),
      dailyProgress: {},
      completedToday: [],
      allClearClaimed: false,
      streak: 0,
      lastCompletedDay: '',
      streakBonusesClaimed: [],

      ensureDay: () => {
        const today = getTodayKey();
        const state = get();
        if (state.currentDay === today) return;

        // Day changed — check if yesterday was an all-clear to maintain streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().slice(0, 10);

        let newStreak = state.streak;
        if (state.lastCompletedDay === yesterdayKey) {
          // Streak continues
        } else if (state.lastCompletedDay !== today) {
          // Streak broken
          newStreak = 0;
        }

        set({
          currentDay: today,
          dailyProgress: { login: 1 }, // auto-credit login on day change
          completedToday: [],
          allClearClaimed: false,
          streak: newStreak,
        });
      },

      incrementProgress: (checkKey: string, amount: number = 1) => {
        get().ensureDay();
        const state = get();
        const current = state.dailyProgress[checkKey] ?? 0;
        set({
          dailyProgress: {
            ...state.dailyProgress,
            [checkKey]: current + amount,
          },
        });
      },

      claimMission: (missionId: string) => {
        const state = get();
        if (state.completedToday.includes(missionId)) return;

        const missions = getDailyMissions(state.currentDay);
        const mission = missions.find(m => m.id === missionId);
        if (!mission) return;

        // Check if actually complete
        const progress = state.dailyProgress[mission.checkKey] ?? 0;
        if (progress < mission.target) return;

        set({ completedToday: [...state.completedToday, missionId] });

        // Award rewards
        try {
          if (mission.reward.ap) {
            useCardEconomyStore.getState().awardAegisPoints(mission.reward.ap, `Daily: ${mission.title}`);
          }
          if (mission.reward.bpXp) {
            useBattlePassStore.getState().awardBPXP(mission.reward.bpXp);
          }
        } catch { /* stores may not be ready */ }
      },

      claimAllClear: () => {
        const state = get();
        if (state.allClearClaimed) return;

        const missions = getDailyMissions(state.currentDay);
        const allDone = missions.every(m => state.completedToday.includes(m.id));
        if (!allDone) return;

        // Update streak
        const newStreak = state.streak + 1;
        set({
          allClearClaimed: true,
          streak: newStreak,
          lastCompletedDay: state.currentDay,
        });

        // Award all-clear bonus
        try {
          useCardEconomyStore.getState().awardAegisPoints(ALL_CLEAR_BONUS.ap, 'Daily All-Clear');
          useBattlePassStore.getState().awardBPXP(ALL_CLEAR_BONUS.bpXp);
        } catch { /* */ }
      },

      claimStreakBonus: (days: number) => {
        const state = get();
        if (state.streakBonusesClaimed.includes(days)) return;
        if (state.streak < days) return;

        const bonus = STREAK_BONUSES.find(b => b.days === days);
        if (!bonus) return;

        set({ streakBonusesClaimed: [...state.streakBonusesClaimed, days] });

        try {
          useCardEconomyStore.getState().awardAegisPoints(bonus.apBonus, `Streak: ${bonus.label}`);
          useBattlePassStore.getState().awardBPXP(bonus.bpXpBonus);
        } catch { /* */ }
      },

      getTodayMissions: () => {
        const state = get();
        return getDailyMissions(state.currentDay);
      },

      isMissionComplete: (mission: DailyMission) => {
        const state = get();
        return state.completedToday.includes(mission.id);
      },

      getProgressForMission: (mission: DailyMission) => {
        const state = get();
        return Math.min(state.dailyProgress[mission.checkKey] ?? 0, mission.target);
      },
    }),
    {
      name: 'empire-daily-missions',
      version: 1,
    },
  ),
);
