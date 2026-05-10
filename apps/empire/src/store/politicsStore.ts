/**
 * politicsStore.ts — Zustand store for the political influence system.
 * 4 tiers: Citizen (0) -> Donor (1) -> Bundler (2) -> Lobbyist (3) -> Kingmaker (4)
 */

import { createPersistedStore } from './createPersistedStore';
import { eventBridge } from '../lib/eventBridge';
import { useEmpireStore } from './empireStore';
import type { PoliticalTier } from '../types/social';
import {
  POLITICAL_TIER_NAMES,
  POLITICAL_TIER_THRESHOLDS,
  type LobbyingProjectData,
} from '../data/politicsData';

// ── Types ──

interface ActiveLobbyingProject extends LobbyingProjectData {
  startTick: number;
  progress: number; // 0 to duration
}

interface RegulatoryHistoryEntry {
  eventId: string;
  choiceIndex: number;
  timestamp: number;
}

interface PoliticsState {
  politicalTier: PoliticalTier;
  politicalXp: number;
  activeLobbying: ActiveLobbyingProject[];
  completedLobbying: string[];
  superPacContributions: number;
  regulatoryHistory: RegulatoryHistoryEntry[];

  // Actions
  addPoliticalXp: (amount: number) => void;
  startLobbyingProject: (project: LobbyingProjectData, currentTick: number) => boolean;
  progressLobbying: (currentTick: number) => string[]; // returns completed project IDs
  accelerateLobbying: (projectId: string, currentTick: number) => { success: boolean; cost: number; message: string };
  contributeToPac: (amount: number) => void;
  handleRegulatoryEvent: (eventId: string, choiceIndex: number) => void;
  getTierName: () => string;
  reset: () => void;
}

function tierForXp(xp: number): PoliticalTier {
  if (xp >= POLITICAL_TIER_THRESHOLDS[4]) return 4;
  if (xp >= POLITICAL_TIER_THRESHOLDS[3]) return 3;
  if (xp >= POLITICAL_TIER_THRESHOLDS[2]) return 2;
  if (xp >= POLITICAL_TIER_THRESHOLDS[1]) return 1;
  return 0;
}

const INITIAL_STATE = {
  politicalTier: 0 as PoliticalTier,
  politicalXp: 0,
  activeLobbying: [] as ActiveLobbyingProject[],
  completedLobbying: [] as string[],
  superPacContributions: 0,
  regulatoryHistory: [] as RegulatoryHistoryEntry[],
};

export const usePoliticsStore = createPersistedStore<PoliticsState>(
  'politics',
  (set, get) => ({
    ...INITIAL_STATE,

    addPoliticalXp: (amount: number) => {
      const { politicalXp } = get();
      const newXp = politicalXp + amount;
      const newTier = tierForXp(newXp);
      const oldTier = get().politicalTier;

      set({ politicalXp: newXp, politicalTier: newTier });

      if (newTier > oldTier) {
        eventBridge.emit('politics:tierUp', {
          oldTier,
          newTier,
          tierName: POLITICAL_TIER_NAMES[newTier],
        });
      }
    },

    startLobbyingProject: (project: LobbyingProjectData, currentTick: number) => {
      const { activeLobbying, completedLobbying } = get();

      // Check if already active or completed
      if (activeLobbying.some((p) => p.id === project.id)) return false;
      if (completedLobbying.includes(project.id)) return false;

      const activeProject: ActiveLobbyingProject = {
        ...project,
        startTick: currentTick,
        progress: 0,
      };

      set({ activeLobbying: [...activeLobbying, activeProject] });
      return true;
    },

    progressLobbying: (currentTick: number) => {
      const { activeLobbying, completedLobbying } = get();
      const completed: string[] = [];
      const stillActive: ActiveLobbyingProject[] = [];

      for (const project of activeLobbying) {
        const elapsed = currentTick - project.startTick;
        const progress = Math.min(elapsed, project.duration);

        if (progress >= project.duration) {
          completed.push(project.id);

          // Success roll
          if (Math.random() <= project.successRate) {
            // Apply political XP for successful lobbying
            get().addPoliticalXp(project.effect.value * 10);
            eventBridge.emit('politics:lobbyComplete', {
              projectId: project.id,
              name: project.name,
              success: true,
              effect: project.effectDescription,
            });
          } else {
            eventBridge.emit('politics:lobbyComplete', {
              projectId: project.id,
              name: project.name,
              success: false,
            });
          }
        } else {
          stillActive.push({ ...project, progress });
        }
      }

      if (completed.length > 0) {
        set({
          activeLobbying: stillActive,
          completedLobbying: [...completedLobbying, ...completed],
        });
      } else if (stillActive.length !== activeLobbying.length) {
        set({ activeLobbying: stillActive });
      }

      return completed;
    },

    // Rush a lobbying project to instant completion. Cost = project cost × 0.5 × remaining fraction.
    // Deducts from empire companyBalance (imported dynamically to avoid circular deps).
    accelerateLobbying: (projectId: string, currentTick: number) => {
      const { activeLobbying, completedLobbying } = get();
      const project = activeLobbying.find(p => p.id === projectId);
      if (!project) return { success: false, cost: 0, message: 'No active lobbying project found.' };

      const elapsed = currentTick - project.startTick;
      const remainingFraction = Math.max(0, (project.duration - elapsed) / project.duration);
      const rushCost = Math.round(project.cost * 0.5 * remainingFraction);

      // Check empire balance
      const empireState = useEmpireStore.getState();
      if (empireState.companyBalance < rushCost) {
        return { success: false, cost: rushCost, message: `Insufficient funds. Need €${rushCost.toLocaleString()}.` };
      }

      // Deduct and complete
      useEmpireStore.setState({ companyBalance: empireState.companyBalance - rushCost });

      // Success roll
      const succeeded = Math.random() <= project.successRate;
      if (succeeded) {
        get().addPoliticalXp(project.effect.value * 10);
        eventBridge.emit('politics:lobbyComplete', {
          projectId: project.id,
          name: project.name,
          success: true,
          effect: project.effectDescription,
        });
      } else {
        eventBridge.emit('politics:lobbyComplete', {
          projectId: project.id,
          name: project.name,
          success: false,
        });
      }

      set({
        activeLobbying: activeLobbying.filter(p => p.id !== projectId),
        completedLobbying: [...completedLobbying, projectId],
      });

      return { success: true, cost: rushCost, message: `Rushed ${project.name} for €${rushCost.toLocaleString()}. ${succeeded ? 'Success!' : 'Failed.'}` };
    },

    contributeToPac: (amount: number) => {
      const { superPacContributions } = get();
      set({ superPacContributions: superPacContributions + amount });

      // PAC contributions give political XP (1 XP per $100)
      get().addPoliticalXp(Math.floor(amount / 100));
    },

    handleRegulatoryEvent: (eventId: string, choiceIndex: number) => {
      const { regulatoryHistory } = get();
      const entry: RegulatoryHistoryEntry = {
        eventId,
        choiceIndex,
        timestamp: Date.now(),
      };

      set({
        regulatoryHistory: [...regulatoryHistory, entry].slice(-50),
      });

      // Regulatory participation gives political XP
      get().addPoliticalXp(15);
    },

    getTierName: () => {
      return POLITICAL_TIER_NAMES[get().politicalTier];
    },

    reset: () => {
      set(INITIAL_STATE);
    },
  }),
);
