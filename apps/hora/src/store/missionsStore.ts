/**
 * missionsStore.ts -- Zustand store for solo mission tracking.
 * Tracks completion and progress for Lab + Replay missions.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getMissionsByContext, getMissionById } from '../data/missions';
import type { MissionContext, Mission } from '../types/social';
import { eventBridge, EVENTS } from '../lib/eventBridge';
import { useCardEconomyStore } from './cardEconomyStore';
import { useBattlePassStore } from './battlePassStore';

// ── Types ──────────────────────────────────────────────────────────

interface MissionsState {
  completedMissions: string[];
  missionProgress: Record<string, number>;

  // ── Actions ──
  updateProgress: (missionId: string, increment: number) => void;
  setProgress: (missionId: string, value: number) => void;
  completeMission: (missionId: string) => void;
  isCompleted: (missionId: string) => boolean;
  getActiveMissions: (context: MissionContext) => Mission[];
  getProgress: (missionId: string) => number;
}

// ── Store ──────────────────────────────────────────────────────────

export const useMissionsStore = create<MissionsState>()(
  persist(
    (set, get) => ({
      completedMissions: [],
      missionProgress: {},

      updateProgress: (missionId: string, increment: number) => {
        const state = get();
        if (state.completedMissions.includes(missionId)) return;

        const mission = getMissionById(missionId);
        if (!mission) return;

        const current = state.missionProgress[missionId] ?? 0;
        const next = current + increment;

        set({
          missionProgress: {
            ...state.missionProgress,
            [missionId]: next,
          },
        });

        // Auto-complete if target reached
        if (next >= mission.target) {
          get().completeMission(missionId);
        }
      },

      setProgress: (missionId: string, value: number) => {
        const state = get();
        if (state.completedMissions.includes(missionId)) return;

        const mission = getMissionById(missionId);
        if (!mission) return;

        set({
          missionProgress: {
            ...state.missionProgress,
            [missionId]: value,
          },
        });

        if (value >= mission.target) {
          get().completeMission(missionId);
        }
      },

      completeMission: (missionId: string) => {
        const state = get();
        if (state.completedMissions.includes(missionId)) return;

        const mission = getMissionById(missionId);
        if (!mission) return;

        set({
          completedMissions: [...state.completedMissions, missionId],
          missionProgress: {
            ...state.missionProgress,
            [missionId]: mission.target,
          },
        });

        // Award rewards via other stores
        try {
          if (mission.reward.ap) {
            useCardEconomyStore.getState().awardAegisPoints(mission.reward.ap, `Mission: ${mission.title}`);
          }
          if (mission.reward.bpXp) {
            useBattlePassStore.getState().awardBPXP(mission.reward.bpXp);
          }
        } catch {
          // Silent fail if stores not available
        }

        eventBridge.emit(EVENTS.MISSION_COMPLETED, {
          missionId,
          title: mission.title,
          reward: mission.reward,
        });
      },

      isCompleted: (missionId: string) => {
        return get().completedMissions.includes(missionId);
      },

      getActiveMissions: (context: MissionContext) => {
        const state = get();
        return getMissionsByContext(context).filter(
          (m) => !state.completedMissions.includes(m.id),
        );
      },

      getProgress: (missionId: string) => {
        return get().missionProgress[missionId] ?? 0;
      },
    }),
    {
      name: 'empire-missions',
      version: 1,
    },
  ),
);
